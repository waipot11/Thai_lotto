import React, { useEffect, useMemo, useState } from 'react';
import {
  AIPredictionResult,
  LotteryType,
  NextDrawInfo,
  TelegramConfig,
  TelegramDiscoveredChat,
  TelegramEnvStatus,
  TelegramLog
} from '../types/lottery';
import { LOTTERY_LIST, LOTTERY_META_MAP } from '../data/specialLotteries';
import {
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Settings,
  RefreshCw,
  Info,
  Users,
  Save,
  ShieldCheck,
  Search,
  Pin,
  Bell
} from 'lucide-react';

const TG_LOCAL_STORAGE_KEY = 'ai_lottery_telegram_config_v1';

interface TelegramGroupViewProps {
  prediction: AIPredictionResult;
  nextDraw: NextDrawInfo;
  allPredictions?: Record<LotteryType, AIPredictionResult>;
  onEnabledChange?: (enabled: boolean) => void;
}

export const TelegramGroupView: React.FC<TelegramGroupViewProps> = ({
  prediction,
  nextDraw,
  allPredictions,
  onEnabledChange
}) => {
  const [config, setConfig] = useState<TelegramConfig>({
    isTelegramEnabled: true,
    daysBeforeDraw: 1,
    notifyTime: '08:30',
    botToken: '',
    chatId: '',
    messageThreadId: '',
    pinMessage: false,
    disableNotification: false,
    includeThreeStraight: true,
    includeTwoDigits: true,
    includeRunners: true,
    lotteryTypes: ['gov', 'baac', 'gsb']
  });

  const [useSimulatedMode, setUseSimulatedMode] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [botVerifyResult, setBotVerifyResult] = useState<{
    success: boolean;
    message: string;
    username?: string;
    firstName?: string;
  } | null>(null);
  const [discoveredChats, setDiscoveredChats] = useState<TelegramDiscoveredChat[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveBanner, setSaveBanner] = useState<{
    type: 'saved' | 'restored' | 'error';
    message: string;
    timestamp?: string;
  } | null>(null);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedEnvKey, setCopiedEnvKey] = useState<string | null>(null);
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [envStatus, setEnvStatus] = useState<TelegramEnvStatus | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const saveToBrowserStorage = (cfg: TelegramConfig, simulated: boolean) => {
    try {
      localStorage.setItem(
        TG_LOCAL_STORAGE_KEY,
        JSON.stringify({
          config: cfg,
          useSimulatedMode: simulated,
          savedAt: new Date().toLocaleString('th-TH')
        })
      );
    } catch (err) {
      console.warn('Unable to write Telegram config to localStorage:', err);
    }
  };

  const readFromBrowserStorage = (): {
    config?: Partial<TelegramConfig>;
    useSimulatedMode?: boolean;
    savedAt?: string;
  } | null => {
    try {
      const raw = localStorage.getItem(TG_LOCAL_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  // Generate Telegram-friendly VIP lottery alert message (supports รัฐบาล, ธ.ก.ส., ออมสิน)
  const activeLotteryTypes: LotteryType[] =
    config.lotteryTypes && config.lotteryTypes.length > 0 ? config.lotteryTypes : ['gov'];

  const generatedMessage = useMemo(() => {
    const formatLotterySection = (pred: AIPredictionResult, showHeaderPrefix: boolean) => {
      const megaShot = pred.sniperThreeStraight?.megaSingleShot || pred.threeDigitsStraight?.[0] || '427';
      const coreStraight = (
        pred.sniperThreeStraight?.coreStraightPicks?.map((p) => p.number) ||
        pred.threeDigitsStraight?.slice(0, 3) ||
        [megaShot]
      ).join(' · ');
      const backupStraight = (
        pred.sniperThreeStraight?.backupStraightPicks?.map((p) => p.number) ||
        pred.threeDigitsStraight?.slice(3, 6) ||
        []
      ).join(' · ');
      const lotteryLabel = pred.lotteryName || LOTTERY_META_MAP[pred.lotteryType || 'gov'].name;

      const secLines: string[] = [];
      if (showHeaderPrefix) {
        secLines.push(`📌 [${lotteryLabel}]`);
      }
      secLines.push(`🗓️ งวด ${pred.drawDate} (${pred.dayOfWeek})`);

      if (config.includeThreeStraight) {
        secLines.push(`👑 เม็ดเดียว 3 ตัวตรง ฟันธง: ${megaShot}`);
        secLines.push(`🎯 3 ตัวตรงเน้นหนัก: ${coreStraight}`);
        if (backupStraight && !showHeaderPrefix) {
          secLines.push(`🛡️ กันพลาด 3 ตัว: ${backupStraight}`);
        }
      }

      if (config.includeRunners) {
        secLines.push(
          `⚡ วิ่ง-รูดตัวเดียว: ${pred.topSection?.runningDigit || '2'} (รอง ${pred.topSection?.runningSub || '4'})`
        );
      }

      if (config.includeTwoDigits) {
        secLines.push(`💎 2 ตัวบน: ${(pred.twoDigitsTop || []).slice(0, 4).join(' - ')}`);
        secLines.push(`🔹 2 ตัวล่าง: ${(pred.twoDigitsBottom || []).slice(0, 4).join(' - ')}`);
      }

      if (!showHeaderPrefix) {
        secLines.push(`⚠️ ระวังเลขเบิ้ล: ${(pred.cautionDoubles || []).join(' - ')}`);
      }

      return secLines.join('\n');
    };

    const totalSources = prediction.totalSourcesAnalyzed || prediction.multiSourceSummary?.length || 22;

    if (allPredictions && activeLotteryTypes.length > 1) {
      const sections = activeLotteryTypes.map((t) =>
        formatLotterySection(allPredictions[t] || prediction, true)
      );
      return [
        `📣 แจ้งเตือนเลขเด็ดสมาชิกกลุ่ม Telegram (ครบ ${activeLotteryTypes.length} หวย)`,
        `📊 สังเคราะห์ ${totalSources} แหล่ง · สถิติย้อนหลัง`,
        '',
        sections.join('\n\n────────────────\n\n'),
        '',
        `✨ ขอให้สมาชิกในกลุ่มเฮงๆ ปังๆ ทุกท่านครับ!`
      ].join('\n');
    }

    const targetPred =
      allPredictions && activeLotteryTypes.length === 1
        ? allPredictions[activeLotteryTypes[0]] || prediction
        : prediction;
    const targetName =
      targetPred.lotteryName || LOTTERY_META_MAP[targetPred.lotteryType || 'gov'].name;

    return [
      `📣 แจ้งเตือนเลขเด็ดสมาชิกกลุ่ม Telegram [${targetName}]`,
      `📊 สังเคราะห์ ${totalSources} แหล่ง · สถิติย้อนหลัง`,
      '',
      formatLotterySection(targetPred, false),
      '',
      `✨ ขอให้สมาชิกในกลุ่มเฮงๆ ปังๆ ทุกท่านครับ!`
    ].join('\n');
  }, [
    prediction,
    allPredictions,
    activeLotteryTypes,
    config.includeThreeStraight,
    config.includeTwoDigits,
    config.includeRunners
  ]);

  useEffect(() => {
    setCustomMessage(generatedMessage);
  }, [generatedMessage]);

  const fetchConfigAndLogs = async () => {
    setIsLoadingLogs(true);
    const localBackup = readFromBrowserStorage();
    try {
      const res = await fetch('/api/telegram/config');
      const data = await res.json();
      if (data.success) {
        const nextEnvStatus = (data.envStatus as TelegramEnvStatus | undefined) || null;
        setEnvStatus(nextEnvStatus);
        const envHasCreds = Boolean(nextEnvStatus?.hasBotToken && nextEnvStatus?.hasChatId);

        const serverCfg = data.config as Partial<TelegramConfig> | undefined;
        const serverHasCreds = Boolean(serverCfg?.botToken && serverCfg?.chatId);
        const localHasCreds = Boolean(localBackup?.config?.botToken || localBackup?.config?.chatId);

        if (!serverHasCreds && localHasCreds && localBackup?.config) {
          const restored: TelegramConfig = {
            ...config,
            ...(serverCfg || {}),
            ...localBackup.config
          };
          setConfig(restored);
          onEnabledChange?.(Boolean(restored.isTelegramEnabled));
          const restoredSim =
            localBackup.useSimulatedMode ?? !(Boolean(restored.botToken && restored.chatId) || envHasCreds);
          setUseSimulatedMode(restoredSim);

          await fetch('/api/telegram/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(restored)
          });
          setSaveBanner({
            type: 'restored',
            message: 'กู้คืน Bot Token และ Chat ID จากเบราว์เซอร์เข้าสู่เซิร์ฟเวอร์อัตโนมัติแล้ว',
            timestamp: localBackup.savedAt
          });
        } else if (serverCfg) {
          const merged: TelegramConfig = { ...config, ...serverCfg };
          setConfig(merged);
          onEnabledChange?.(Boolean(merged.isTelegramEnabled));

          const nextSim =
            localBackup?.useSimulatedMode !== undefined
              ? localBackup.useSimulatedMode
              : !(serverHasCreds || envHasCreds);
          setUseSimulatedMode(nextSim);

          if (serverHasCreds) {
            saveToBrowserStorage(merged, nextSim);
          }
        }

        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      }
    } catch (e) {
      console.error('Failed to fetch Telegram config:', e);
      if (localBackup?.config) {
        setConfig((prev) => ({ ...prev, ...localBackup.config }));
        if (localBackup.useSimulatedMode !== undefined) {
          setUseSimulatedMode(localBackup.useSimulatedMode);
        }
      }
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchConfigAndLogs();
  }, []);

  const updateFieldLocally = (patch: Partial<TelegramConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      const hasToken = Boolean(next.botToken.trim() || envStatus?.hasBotToken);
      const hasChat = Boolean(next.chatId.trim() || envStatus?.hasChatId);
      if (hasToken && hasChat && useSimulatedMode) {
        setUseSimulatedMode(false);
      }
      return next;
    });
    setHasUnsavedChanges(true);
    setSaveBanner(null);
    setBotVerifyResult(null);
  };

  const persistConfig = async (
    targetConfig: TelegramConfig,
    simulatedOverride?: boolean,
    showSuccessBanner = true
  ) => {
    setIsSaving(true);
    const simMode = simulatedOverride !== undefined ? simulatedOverride : useSimulatedMode;
    saveToBrowserStorage(targetConfig, simMode);

    try {
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetConfig)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกข้อมูลเข้าเซิร์ฟเวอร์ไม่สำเร็จ');
      }
      setHasUnsavedChanges(false);
      if (showSuccessBanner) {
        setSaveBanner({
          type: 'saved',
          message: 'บันทึกการตั้งค่า Telegram เรียบร้อยแล้ว (เก็บทั้งบนเซิร์ฟเวอร์และเบราว์เซอร์)',
          timestamp: new Date().toLocaleTimeString('th-TH')
        });
      }
    } catch (e: any) {
      setSaveBanner({
        type: 'error',
        message: `บันทึกในเบราว์เซอร์แล้ว แต่เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ: ${e?.message || 'Network error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConfig = async (patch?: Partial<TelegramConfig>) => {
    const updated = patch ? { ...config, ...patch } : config;
    setConfig(updated);
    if (patch?.isTelegramEnabled !== undefined) {
      onEnabledChange?.(patch.isTelegramEnabled);
    }
    await persistConfig(updated);
  };

  const handleToggleSimulatedMode = (nextSim: boolean) => {
    setUseSimulatedMode(nextSim);
    saveToBrowserStorage(config, nextSim);
  };

  const handleVerifyBotAndChats = async () => {
    setIsVerifying(true);
    setBotVerifyResult(null);
    try {
      const res = await fetch('/api/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: config.botToken
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.bot) {
        const chats = Array.isArray(data.discoveredChats) ? data.discoveredChats : [];
        setDiscoveredChats(chats);
        setBotVerifyResult({
          success: true,
          username: data.bot.username,
          firstName: data.bot.firstName,
          message:
            chats.length > 0
              ? `เชื่อมต่อ Bot "${data.bot.firstName}" (@${data.bot.username}) สำเร็จ! พบ ${chats.length} กลุ่ม/แชทด้านล่าง`
              : `เชื่อมต่อ Bot "${data.bot.firstName}" (@${data.bot.username}) สำเร็จ! (หากยังไม่เห็นชื่อกลุ่ม ให้พิมพ์ข้อความอะไรก็ได้ 1 ครั้งในกลุ่มที่มี Bot อยู่ แล้วกดค้นหาอีกครั้ง)`
        });
      } else {
        setBotVerifyResult({
          success: false,
          message: data.error || 'ไม่สามารถยืนยัน Bot Token ได้'
        });
      }
    } catch (err: any) {
      setBotVerifyResult({
        success: false,
        message: `ข้อผิดพลาดเครือข่าย: ${err.message}`
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendToGroup = async () => {
    setIsSending(true);
    setSendResult(null);

    if (hasUnsavedChanges) {
      await persistConfig(config, useSimulatedMode, false);
    }

    const hasEffectiveToken = Boolean(config.botToken.trim() || envStatus?.hasBotToken);
    const hasEffectiveChat = Boolean(config.chatId.trim() || envStatus?.hasChatId);

    if (!useSimulatedMode && (!hasEffectiveToken || !hasEffectiveChat)) {
      setSendResult({
        success: false,
        message: 'กรุณากรอก Bot Token และ Group Chat ID ให้ครบ (หรือตั้งค่าใน AI Studio Secrets) ก่อนส่งเข้ากลุ่มจริง'
      });
      setIsSending(false);
      return;
    }

    try {
      const res = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: config.botToken,
          chatId: config.chatId,
          messageThreadId: config.messageThreadId,
          message: customMessage,
          drawDate: prediction.drawDate,
          pinMessage: config.pinMessage,
          disableNotification: config.disableNotification,
          isSimulated: useSimulatedMode
        })
      });

      const data = await res.json();
      if (data.success) {
        setSendResult({
          success: true,
          message: useSimulatedMode
            ? 'ส่งทดสอบในโหมดจำลองสำเร็จ และบันทึกประวัติเรียบร้อย'
            : 'ส่งเลขเด็ดเข้ากลุ่ม Telegram เรียบร้อยแล้ว! สมาชิกในกลุ่มเห็นข้อความทันที'
        });
        fetchConfigAndLogs();
      } else {
        setSendResult({
          success: false,
          message: data.error || 'เกิดข้อผิดพลาดในการส่งข้อความเข้ากลุ่ม Telegram'
        });
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        message: `ข้อผิดพลาดเครือข่าย: ${err.message}`
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  const handleCopyEnvKey = (keyName: string) => {
    navigator.clipboard.writeText(keyName);
    setCopiedEnvKey(keyName);
    setTimeout(() => setCopiedEnvKey(null), 2000);
  };

  const computedNotifyDateStr = useMemo(() => {
    const d = new Date(nextDraw.drawDateIso);
    d.setDate(d.getDate() - config.daysBeforeDraw);
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  }, [nextDraw, config.daysBeforeDraw]);

  const computedDaysLeft = useMemo(() => {
    return nextDraw.daysUntilDraw - config.daysBeforeDraw;
  }, [nextDraw.daysUntilDraw, config.daysBeforeDraw]);

  return (
    <div className="space-y-8">
      {/* Top Telegram Group Alert Master Card */}
      <div className="rounded-3xl bg-gradient-to-br from-sky-950/60 via-slate-900 to-slate-950 border border-sky-500/30 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div>
            <div className="text-xs text-sky-400 font-semibold flex items-center gap-2 mb-2">
              <Send className="w-3.5 h-3.5" />
              <span>ระบบส่งข้อมูลให้สมาชิกกลุ่ม Telegram อัตโนมัติ (ก่อนหวยออก {config.daysBeforeDraw} วัน)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              ส่งเลขเด็ดเข้ากลุ่ม Telegram ให้สมาชิกทันที & อัตโนมัติ
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              ส่งชุดฟันธง 3 ตัวตรง ({prediction.sniperThreeStraight?.megaSingleShot || prediction.threeDigitsStraight[0]}), เลขวิ่ง-รูด และ 2 ตัวบน-ล่าง ตรงเข้ากลุ่ม Telegram ผ่าน Telegram Bot API
            </p>
          </div>

          {/* Master Toggle Switch */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 px-5 py-3.5 rounded-2xl shrink-0">
            <div className="text-right">
              <div className="text-sm font-bold text-white">ส่งกลุ่ม Telegram ออโต้</div>
              <div className="text-xs text-slate-400">
                {config.isTelegramEnabled ? 'เปิดใช้งาน (รอส่งตามเวลา)' : 'ปิดใช้งาน'}
              </div>
            </div>
            <button
              onClick={() => handleSaveConfig({ isTelegramEnabled: !config.isTelegramEnabled })}
              aria-label="เปิดหรือปิดการส่งข้อมูลเข้ากลุ่ม Telegram อัตโนมัติ"
              className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center ${
                config.isTelegramEnabled ? 'bg-sky-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </div>

        {/* 4-Column Schedule Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>งวดหวยออกเป้าหมาย</span>
            </div>
            <div className="text-lg font-bold text-amber-300">{nextDraw.drawDateStr}</div>
            <div className="text-xs text-slate-500 mt-1">({nextDraw.dayOfWeek})</div>
          </div>

          <div className="bg-slate-950/60 border border-sky-500/30 rounded-2xl p-4">
            <div className="text-xs text-sky-400 flex items-center gap-1.5 mb-1">
              <Bell className="w-3.5 h-3.5" />
              <span>กำหนดส่งเข้ากลุ่ม (ก่อน {config.daysBeforeDraw} วัน)</span>
            </div>
            <div className="text-lg font-bold text-sky-300">{computedNotifyDateStr}</div>
            <div className="text-xs text-slate-400 mt-1">เวลา {config.notifyTime} น.</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>นับถอยหลังวันส่งกลุ่ม</span>
            </div>
            <div className="text-lg font-bold text-emerald-300">
              {computedDaysLeft <= 0 ? 'ถึงวันส่งข้อมูลแล้ว!' : `อีก ${computedDaysLeft} วัน`}
            </div>
            <div className="text-xs text-slate-500 mt-1">(อีก {nextDraw.daysUntilDraw} วันถึงวันหวยออก)</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              <span>วันล่วงหน้า & เวลาส่ง</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={config.daysBeforeDraw}
                onChange={(e) => handleSaveConfig({ daysBeforeDraw: Number(e.target.value) })}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-sky-400"
              >
                <option value={1}>ก่อน 1 วัน</option>
                <option value={2}>ก่อน 2 วัน</option>
                <option value={3}>ก่อน 3 วัน</option>
                <option value={5}>ก่อน 5 วัน</option>
              </select>
              <input
                type="time"
                value={config.notifyTime}
                onChange={(e) => handleSaveConfig({ notifyTime: e.target.value })}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Config + Message Composer (Left) & Telegram Group Preview + Logs (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Telegram Bot Connection Card */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <span>ตั้งค่า Telegram Bot สำหรับกลุ่มสมาชิก</span>
              </h3>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => handleToggleSimulatedMode(true)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                    useSimulatedMode ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  โหมดจำลอง (Sandbox)
                </button>
                <button
                  onClick={() => handleToggleSimulatedMode(false)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                    !useSimulatedMode ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ส่งเข้ากลุ่มจริง (Live)
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Telegram Bot Token{' '}
                  <span className="text-slate-400 font-normal">(สร้างจาก @BotFather ใน Telegram)</span>{' '}
                  {envStatus?.hasBotToken ? (
                    <span className="text-emerald-400">(พบใน AI Studio Secrets แล้ว — เว้นว่างได้)</span>
                  ) : (
                    useSimulatedMode && <span className="text-slate-500">(ไม่บังคับในโหมดจำลอง)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={config.botToken}
                    onChange={(e) => updateFieldLocally({ botToken: e.target.value })}
                    placeholder={
                      envStatus?.hasBotToken
                        ? `ใช้งานจาก Secret (${envStatus.botTokenPreview}) หรือกรอกทับที่นี่`
                        : 'เช่น 7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Group Chat ID{' '}
                    <span className="text-slate-400 font-normal">(หรือ @channelusername)</span>{' '}
                    {envStatus?.hasChatId && (
                      <span className="text-emerald-400">(พบใน Secrets แล้ว)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={config.chatId}
                    onChange={(e) => updateFieldLocally({ chatId: e.target.value })}
                    placeholder={
                      envStatus?.hasChatId
                        ? `ใช้งานจาก Secret (${envStatus.chatIdPreview})`
                        : 'เช่น -1001234567890 หรือ @my_lottery_group'
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Topic ID <span className="text-slate-500 font-normal">(ถ้ากลุ่มเปิด Topics)</span>
                  </label>
                  <input
                    type="text"
                    value={config.messageThreadId || ''}
                    onChange={(e) => updateFieldLocally({ messageThreadId: e.target.value })}
                    placeholder="เว้นว่างได้"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Group Delivery Options */}
              <div className="flex flex-wrap gap-3 text-xs pt-1">
                <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg cursor-pointer text-slate-300 hover:border-sky-500/40">
                  <input
                    type="checkbox"
                    checked={config.pinMessage}
                    onChange={(e) => handleSaveConfig({ pinMessage: e.target.checked })}
                    className="accent-sky-500"
                  />
                  <Pin className="w-3.5 h-3.5 text-amber-400" />
                  <span>ปักหมุดข้อความอัตโนมัติในกลุ่ม (ต้องตั้ง Bot เป็น Admin)</span>
                </label>

                <label className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg cursor-pointer text-slate-300 hover:border-sky-500/40">
                  <input
                    type="checkbox"
                    checked={config.disableNotification}
                    onChange={(e) => handleSaveConfig({ disableNotification: e.target.checked })}
                    className="accent-sky-500"
                  />
                  <span>ส่งแบบเงียบ (Silent)</span>
                </label>
              </div>
            </div>

            {/* Discovered Telegram Groups List */}
            {discoveredChats.length > 0 && (
              <div className="rounded-xl bg-sky-950/30 border border-sky-500/30 p-3.5 space-y-2">
                <div className="text-xs font-semibold text-sky-300">
                  พบกลุ่ม / แชทที่เชื่อมต่อกับ Bot แล้ว — กดเพื่อเลือกใส่ Group Chat ID ทันที:
                </div>
                <div className="space-y-1.5">
                  {discoveredChats.map((c) => (
                    <div
                      key={c.chatId}
                      className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-white mr-2">{c.title}</span>
                        <span className="text-[11px] text-slate-400 mr-2">({c.type})</span>
                        <code className="text-[11px] font-mono text-sky-300">{c.chatId}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateFieldLocally({ chatId: c.chatId })}
                        className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold whitespace-nowrap shrink-0"
                      >
                        เลือกกลุ่มนี้
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save & Verify Bot + Discover Groups Bar */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              {hasUnsavedChanges && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/40 px-3.5 py-2.5 text-xs text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>มีการแก้ไขข้อมูลที่ยังไม่บันทึก — กรุณากด &quot;บันทึกการตั้งค่า Telegram&quot;</span>
                </div>
              )}

              {botVerifyResult && (
                <div
                  className={`rounded-xl px-3.5 py-2.5 text-xs flex items-center gap-2 border ${
                    botVerifyResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {botVerifyResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{botVerifyResult.message}</span>
                </div>
              )}

              {saveBanner && (
                <div
                  className={`rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 border ${
                    saveBanner.type === 'error'
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                      : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{saveBanner.message}</span>
                  </div>
                  {saveBanner.timestamp && (
                    <span className="text-[11px] opacity-80 tabular-nums shrink-0">{saveBanner.timestamp}</span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  {envStatus?.hasBotToken && envStatus?.hasChatId
                    ? 'ตรวจพบ AI Studio Secrets พร้อมใช้งานถาวรบนเซิร์ฟเวอร์แล้ว'
                    : 'กรอก Bot Token แล้วกดปุ่มค้นหากลุ่ม เพื่อดึง Group Chat ID อัตโนมัติได้ทันที'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyBotAndChats}
                    disabled={isVerifying}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    <Search className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isVerifying ? 'กำลังค้นหากลุ่ม...' : 'ตรวจสอบ Bot & ค้นหากลุ่ม'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveConfig()}
                    disabled={isSaving}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                      hasUnsavedChanges
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20'
                        : 'bg-sky-600 hover:bg-sky-500 text-white'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า Telegram'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Studio Secrets Status Box for Telegram */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>ตั้งค่าถาวรผ่าน AI Studio Secrets (สำหรับ Telegram)</span>
                </div>
                <span
                  className={`text-[11px] font-semibold ${
                    envStatus?.hasBotToken && envStatus?.hasChatId ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {envStatus?.hasBotToken && envStatus?.hasChatId
                    ? 'เชื่อมต่อ Secrets แล้ว'
                    : 'ยังไม่ได้ตั้งค่าใน Secrets'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    keyName: 'TELEGRAM_BOT_TOKEN',
                    active: Boolean(envStatus?.hasBotToken),
                    preview: envStatus?.botTokenPreview,
                    desc: 'Bot Token จาก @BotFather'
                  },
                  {
                    keyName: 'TELEGRAM_CHAT_ID',
                    active: Boolean(envStatus?.hasChatId),
                    preview: envStatus?.chatIdPreview,
                    desc: 'Group Chat ID (เช่น -1001234567890) หรือ @channelusername'
                  }
                ].map((item) => (
                  <div
                    key={item.keyName}
                    className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-[11px] font-mono font-bold text-amber-300">{item.keyName}</code>
                        <span
                          className={`text-[11px] font-semibold ${
                            item.active ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {item.active ? `พร้อมใช้ (${item.preview})` : 'ยังไม่ได้ตั้งค่า'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyEnvKey(item.keyName)}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                    >
                      {copiedEnvKey === item.keyName ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>คัดลอกชื่อแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>คัดลอกชื่อตัวแปร</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Step-by-step setup guide */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>วิธีตั้งค่าส่งเข้ากลุ่ม Telegram ภายใน 1 นาที</span>
              </div>
              <p>1. เปิด Telegram ค้นหา <strong className="text-slate-200">@BotFather</strong> → พิมพ์ <code className="text-amber-300">/newbot</code> เพื่อสร้างบอทและรับ <strong>Bot Token</strong></p>
              <p>2. ดึงบอทของคุณเข้ากลุ่ม Telegram ที่ต้องการ (แนะนำให้ตั้งบอทเป็น Admin หากต้องการปักหมุดอัตโนมัติ) แล้วพิมพ์ข้อความอะไรก็ได้ 1 ครั้งในกลุ่ม</p>
              <p>3. วาง Bot Token ด้านบน แล้วกดปุ่ม <strong>&quot;ตรวจสอบ Bot &amp; ค้นหากลุ่ม&quot;</strong> ระบบจะดึงรายชื่อกลุ่มและ <strong>Chat ID</strong> มาให้กดเลือกทันที!</p>
            </div>
          </div>

          {/* Message Composer */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">รูปแบบข้อความสำหรับสมาชิกกลุ่ม Telegram</h3>
              <button
                onClick={handleCopyMessage}
                className="text-xs text-sky-300 hover:text-white flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                {copiedMsg ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMsg ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}</span>
              </button>
            </div>

            {/* Lottery Types Selection for Telegram Group */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                เลือกประเภทหวยที่จะส่งเข้ากลุ่ม (ส่งรวมกันทีเดียวหรือเลือกเฉพาะหวยก็ได้):
              </div>
              <div className="flex flex-wrap gap-2.5 text-xs">
                {LOTTERY_LIST.map((lot) => {
                  const isChecked = activeLotteryTypes.includes(lot.id);
                  return (
                    <label
                      key={lot.id}
                      className={`flex items-center gap-2 border px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-sky-500/15 border-sky-500/50 text-sky-200 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? Array.from(new Set([...activeLotteryTypes, lot.id]))
                            : activeLotteryTypes.filter((id) => id !== lot.id);
                          if (next.length === 0) return; // Require at least 1 lottery selected
                          handleSaveConfig({ lotteryTypes: next });
                        }}
                        className="accent-sky-500"
                      />
                      <span>{lot.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs">
              {[
                { key: 'includeThreeStraight', label: 'ใส่ชุด 3 ตัวตรง VIP' },
                { key: 'includeRunners', label: 'ใส่เลขวิ่ง-รูด' },
                { key: 'includeTwoDigits', label: 'ใส่ชุด 2 ตัวบน-ล่าง' }
              ].map((opt) => {
                const checked = Boolean(config[opt.key as keyof TelegramConfig]);
                return (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg cursor-pointer text-slate-300 hover:border-sky-500/40"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => handleSaveConfig({ [opt.key]: e.target.checked })}
                      className="accent-sky-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>

            <textarea
              rows={10}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-sky-400 font-['Prompt',sans-serif]"
            />

            {sendResult && (
              <div
                className={`rounded-xl px-4 py-3 text-xs font-medium flex items-center gap-2 border ${
                  sendResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                }`}
              >
                {sendResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{sendResult.message}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                onClick={() => setCustomMessage(generatedMessage)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>รีเซ็ตข้อความตามผลงวดล่าสุด</span>
              </button>

              <button
                onClick={handleSendToGroup}
                disabled={isSending}
                className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSending
                    ? 'กำลังส่งเข้ากลุ่ม Telegram...'
                    : useSimulatedMode
                      ? 'ทดสอบส่งจำลอง (Sandbox)'
                      : 'ส่งข้อความเข้ากลุ่ม Telegram ทันที'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Telegram Group Preview + Logs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Telegram Mobile Group Preview */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">ตัวอย่างข้อความในกลุ่ม Telegram</h3>
              <span className="text-[11px] text-sky-400 font-medium">ก่อนหวยออก {config.daysBeforeDraw} วัน</span>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-700 bg-[#0e1621] shadow-inner">
              {/* Telegram Group Header */}
              <div className="bg-[#17212b] px-4 py-3 flex items-center justify-between text-white border-b border-slate-800/80">
                <div>
                  <div className="text-xs font-bold">กลุ่ม VIP เลขเด็ด AI แม่นยำ</div>
                  <div className="text-[10px] text-sky-400">bot · Auto Alert {config.notifyTime} น.</div>
                </div>
                {config.pinMessage && (
                  <span className="text-[10px] text-amber-300 flex items-center gap-1">
                    <Pin className="w-3 h-3" />
                    <span>Pinned</span>
                  </span>
                )}
              </div>

              {/* Telegram Chat Body */}
              <div className="p-4 space-y-3 min-h-[300px]">
                <div className="text-center">
                  <span className="bg-[#182533] text-slate-300 text-[10px] px-2.5 py-0.5 rounded-full">
                    {computedNotifyDateStr}
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-sky-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    TG
                  </div>
                  <div className="bg-[#182533] text-slate-100 border border-slate-700/60 rounded-2xl rounded-tl-none px-4 py-3 text-xs leading-relaxed whitespace-pre-line shadow-sm max-w-[90%]">
                    <div className="text-[11px] font-bold text-sky-400 mb-1">
                      {botVerifyResult?.firstName || 'AI หวยแม่นยำ Bot'}
                    </div>
                    {customMessage}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Telegram Delivery Logs */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">ประวัติการส่งเข้ากลุ่ม Telegram</h3>
              <button
                onClick={fetchConfigAndLogs}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                <span>รีเฟรช</span>
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                ยังไม่มีประวัติการส่ง กดปุ่มส่งด้านล่างซ้ายเพื่อทดสอบส่งเข้ากลุ่ม
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-200">งวด {log.drawDate}</span>
                      <span
                        className={`font-semibold ${
                          log.status === 'sent'
                            ? 'text-sky-400'
                            : log.status === 'failed'
                              ? 'text-rose-400'
                              : 'text-amber-300'
                        }`}
                      >
                        {log.status === 'sent'
                          ? 'ส่งเข้ากลุ่มจริงแล้ว'
                          : log.status === 'failed'
                            ? 'ส่งไม่สำเร็จ'
                            : 'ทดสอบจำลองสำเร็จ'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-2 whitespace-pre-line">
                      {log.message}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900 tabular-nums">
                      <span>{log.chatSummary || 'Telegram Group'}</span>
                      <span>{new Date(log.timestamp).toLocaleString('th-TH')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
