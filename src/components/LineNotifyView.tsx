import React, { useEffect, useMemo, useState } from 'react';
import {
  AIPredictionResult,
  CapturedLineSource,
  LineEnvStatus,
  LineNotifyConfig,
  LineNotifyLog,
  NextDrawInfo
} from '../types/lottery';
import {
  Bell,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Eye,
  EyeOff,
  Settings,
  MessageSquare,
  RefreshCw,
  Info,
  Users,
  Link2,
  Save,
  ShieldCheck
} from 'lucide-react';

const LINE_LOCAL_STORAGE_KEY = 'ai_lottery_line_config_v1';

interface LineNotifyViewProps {
  prediction: AIPredictionResult;
  nextDraw: NextDrawInfo;
  onEnabledChange?: (enabled: boolean) => void;
}

export const LineNotifyView: React.FC<LineNotifyViewProps> = ({
  prediction,
  nextDraw,
  onEnabledChange
}) => {
  const [config, setConfig] = useState<LineNotifyConfig>({
    isLineEnabled: true,
    daysBeforeDraw: 1,
    notifyTime: '08:30',
    deliveryMode: 'messaging_api_push',
    channelAccessToken: '',
    targetId: '',
    webhookUrl: '',
    includeThreeStraight: true,
    includeTwoDigits: true,
    includeRunners: true
  });

  const [useSimulatedMode, setUseSimulatedMode] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [botVerifyResult, setBotVerifyResult] = useState<{
    success: boolean;
    message: string;
    displayName?: string;
    basicId?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveBanner, setSaveBanner] = useState<{
    type: 'saved' | 'restored' | 'error';
    message: string;
    timestamp?: string;
  } | null>(null);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [logs, setLogs] = useState<LineNotifyLog[]>([]);
  const [capturedSources, setCapturedSources] = useState<CapturedLineSource[]>([]);
  const [copiedWebhookEndpoint, setCopiedWebhookEndpoint] = useState(false);
  const [envStatus, setEnvStatus] = useState<LineEnvStatus | null>(null);
  const [copiedEnvKey, setCopiedEnvKey] = useState<string | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  const saveToBrowserStorage = (cfg: LineNotifyConfig, simulated: boolean) => {
    try {
      localStorage.setItem(
        LINE_LOCAL_STORAGE_KEY,
        JSON.stringify({
          config: cfg,
          useSimulatedMode: simulated,
          savedAt: new Date().toLocaleString('th-TH')
        })
      );
    } catch (err) {
      console.warn('Unable to write LINE config to localStorage:', err);
    }
  };

  const readFromBrowserStorage = (): {
    config?: Partial<LineNotifyConfig>;
    useSimulatedMode?: boolean;
    savedAt?: string;
  } | null => {
    try {
      const raw = localStorage.getItem(LINE_LOCAL_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  // Build formatted LINE message from current prediction & toggle options
  const generatedMessage = useMemo(() => {
    const megaShot = prediction.sniperThreeStraight?.megaSingleShot || prediction.threeDigitsStraight?.[0] || '427';
    const coreStraight = (
      prediction.sniperThreeStraight?.coreStraightPicks?.map((p) => p.number) ||
      prediction.threeDigitsStraight?.slice(0, 3) ||
      [megaShot]
    ).join(' · ');
    const backupStraight = (
      prediction.sniperThreeStraight?.backupStraightPicks?.map((p) => p.number) ||
      prediction.threeDigitsStraight?.slice(3, 6) ||
      []
    ).join(' · ');
    const totalSources = prediction.totalSourcesAnalyzed || prediction.multiSourceSummary?.length || 22;

    const lines: string[] = [
      `🔔 แจ้งเตือนโค้งสุดท้าย (ก่อนหวยออก ${config.daysBeforeDraw} วัน)`,
      `งวด ${prediction.drawDate} (${prediction.dayOfWeek})`,
      `📊 สังเคราะห์ ${totalSources} แหล่ง · สถิติ 10 ปี`
    ];

    if (config.includeThreeStraight) {
      lines.push('');
      lines.push(`👑 เม็ดเดียว 3 ตัวตรง ฟันธง: ${megaShot}`);
      lines.push(`🎯 3 ตัวตรงเน้นหนัก: ${coreStraight}`);
      if (backupStraight) {
        lines.push(`🛡️ กันพลาด 3 ตัว: ${backupStraight}`);
      }
    }

    if (config.includeRunners) {
      lines.push('');
      lines.push(
        `⚡ วิ่ง-รูดตัวเดียว: ${prediction.topSection?.runningDigit || '2'} (รอง ${prediction.topSection?.runningSub || '4'})`
      );
    }

    if (config.includeTwoDigits) {
      lines.push(
        `💎 2 ตัวบน: ${(prediction.twoDigitsTop || []).slice(0, 4).join(' - ')}`
      );
      lines.push(
        `🔹 2 ตัวล่าง: ${(prediction.twoDigitsBottom || []).slice(0, 4).join(' - ')}`
      );
    }

    lines.push('');
    lines.push(`⚠️ ระวังเลขเบิ้ล: ${(prediction.cautionDoubles || []).join(' - ')}`);
    return lines.join('\n');
  }, [
    prediction,
    config.daysBeforeDraw,
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
      const res = await fetch('/api/line/config');
      const data = await res.json();
      if (data.success) {
        const nextEnvStatus = (data.envStatus as LineEnvStatus | undefined) || null;
        setEnvStatus(nextEnvStatus);
        const envHasCreds = Boolean(
          nextEnvStatus?.hasChannelAccessToken || nextEnvStatus?.hasWebhookUrl
        );

        const serverCfg = data.config as Partial<LineNotifyConfig> | undefined;
        const serverHasCredentials = Boolean(
          serverCfg?.channelAccessToken || serverCfg?.targetId || serverCfg?.webhookUrl
        );
        const localHasCredentials = Boolean(
          localBackup?.config?.channelAccessToken ||
            localBackup?.config?.targetId ||
            localBackup?.config?.webhookUrl
        );

        if (!serverHasCredentials && localHasCredentials && localBackup?.config) {
          const restored: LineNotifyConfig = {
            ...config,
            ...(serverCfg || {}),
            ...localBackup.config
          };
          setConfig(restored);
          onEnabledChange?.(Boolean(restored.isLineEnabled));
          const restoredSim = localBackup.useSimulatedMode ?? false;
          setUseSimulatedMode(restoredSim);

          // Re-sync browser backup back to server disk store
          await fetch('/api/line/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(restored)
          });
          setSaveBanner({
            type: 'restored',
            message: 'กู้คืน Token และ Target ID จากเบราว์เซอร์เข้าสู่เซิร์ฟเวอร์ให้อัตโนมัติแล้ว',
            timestamp: localBackup.savedAt
          });
        } else if (serverCfg) {
          const merged: LineNotifyConfig = { ...config, ...serverCfg };
          setConfig(merged);
          onEnabledChange?.(Boolean(merged.isLineEnabled));

          const nextSim =
            localBackup?.useSimulatedMode !== undefined
              ? localBackup.useSimulatedMode
              : !(serverHasCredentials || envHasCreds);
          setUseSimulatedMode(nextSim);

          if (serverHasCredentials) {
            saveToBrowserStorage(merged, nextSim);
          }
        }

        if (Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
        if (Array.isArray(data.capturedSources)) {
          setCapturedSources(data.capturedSources);
        }
      }
    } catch (e) {
      console.error('Failed to fetch LINE config:', e);
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

  const updateFieldLocally = (patch: Partial<LineNotifyConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      const hasToken = Boolean(next.channelAccessToken.trim() || envStatus?.hasChannelAccessToken);
      const hasUser = Boolean(next.targetId.trim() || envStatus?.hasTargetId);
      const hasWebhook = Boolean(next.webhookUrl.trim() || envStatus?.hasWebhookUrl);
      const readyForLive =
        (next.deliveryMode === 'messaging_api_push' && hasToken && hasUser) ||
        (next.deliveryMode === 'messaging_api_broadcast' && hasToken) ||
        (next.deliveryMode === 'webhook' && hasWebhook);
      if (readyForLive && useSimulatedMode) {
        setUseSimulatedMode(false);
      }
      return next;
    });
    setHasUnsavedChanges(true);
    setSaveBanner(null);
    setBotVerifyResult(null);
  };

  const persistConfig = async (
    targetConfig: LineNotifyConfig,
    simulatedOverride?: boolean,
    showSuccessBanner = true
  ) => {
    setIsSaving(true);
    const simMode = simulatedOverride !== undefined ? simulatedOverride : useSimulatedMode;
    saveToBrowserStorage(targetConfig, simMode);

    try {
      const res = await fetch('/api/line/config', {
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
          message: 'บันทึกข้อมูลการตั้งค่า LINE เรียบร้อยแล้ว (เก็บทั้งบนเซิร์ฟเวอร์และเบราว์เซอร์)',
          timestamp: new Date().toLocaleTimeString('th-TH')
        });
      }
    } catch (e: any) {
      console.error('Failed to save LINE config:', e);
      setSaveBanner({
        type: 'error',
        message: `บันทึกในเบราว์เซอร์แล้ว แต่เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ: ${e?.message || 'Network error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConfig = async (patch?: Partial<LineNotifyConfig>) => {
    const updated = patch ? { ...config, ...patch } : config;
    setConfig(updated);
    if (patch?.isLineEnabled !== undefined) {
      onEnabledChange?.(patch.isLineEnabled);
    }
    await persistConfig(updated);
  };

  const handleToggleSimulatedMode = (nextSim: boolean) => {
    setUseSimulatedMode(nextSim);
    saveToBrowserStorage(config, nextSim);
  };

  const handleVerifyBot = async () => {
    setIsVerifying(true);
    setBotVerifyResult(null);
    try {
      const res = await fetch('/api/line/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelAccessToken: config.channelAccessToken
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.bot) {
        setBotVerifyResult({
          success: true,
          displayName: data.bot.displayName,
          basicId: data.bot.basicId,
          message: `เชื่อมต่อ LINE OA "${data.bot.displayName}" ${data.bot.basicId ? `(${data.bot.basicId})` : ''} สำเร็จ! พร้อมส่ง Push Message`
        });
      } else {
        setBotVerifyResult({
          success: false,
          message: data.error || 'ไม่สามารถยืนยัน Channel Access Token ได้'
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

  const handleSendTestAlert = async () => {
    setIsSending(true);
    setSendResult(null);

    if (hasUnsavedChanges) {
      await persistConfig(config, useSimulatedMode, false);
    }

    const hasEffectiveToken = Boolean(config.channelAccessToken.trim() || envStatus?.hasChannelAccessToken);
    const hasEffectiveTarget = Boolean(config.targetId.trim() || envStatus?.hasTargetId);
    const hasEffectiveWebhook = Boolean(config.webhookUrl.trim() || envStatus?.hasWebhookUrl);

    const missingLiveCreds =
      (config.deliveryMode === 'messaging_api_push' && (!hasEffectiveToken || !hasEffectiveTarget)) ||
      (config.deliveryMode === 'messaging_api_broadcast' && !hasEffectiveToken) ||
      (config.deliveryMode === 'webhook' && !hasEffectiveWebhook);

    if (!useSimulatedMode && missingLiveCreds) {
      setSendResult({
        success: false,
        message:
          config.deliveryMode === 'messaging_api_push'
            ? 'กรุณากรอก Channel Access Token และ User ID ให้ครบ (หรือตั้งค่าใน AI Studio Secrets) ก่อนทดสอบส่งเข้า LINE OA จริง'
            : config.deliveryMode === 'messaging_api_broadcast'
              ? 'กรุณากรอก Channel Access Token ก่อนทดสอบส่ง Broadcast เข้า LINE OA จริง'
              : 'กรุณากรอก Webhook URL ก่อนทดสอบส่งจริง'
      });
      setIsSending(false);
      return;
    }

    const runSimulated = useSimulatedMode;

    try {
      const res = await fetch('/api/line/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryMode: config.deliveryMode,
          channelAccessToken: config.channelAccessToken,
          targetId: config.targetId,
          webhookUrl: config.webhookUrl,
          message: customMessage,
          drawDate: prediction.drawDate,
          isSimulated: runSimulated
        })
      });

      const data = await res.json();
      if (data.success) {
        setSendResult({
          success: true,
          message: runSimulated
            ? 'ส่งแจ้งเตือนทดสอบในโหมดจำลองสำเร็จ และบันทึกประวัติเรียบร้อย'
            : config.deliveryMode === 'messaging_api_push'
              ? 'ส่ง Push Message เข้าสู่ LINE OA สำเร็จเรียบร้อยแล้ว! กรุณาตรวจสอบแชท LINE ของคุณ'
              : 'ส่งข้อความผ่าน LINE Messaging API สำเร็จเรียบร้อยแล้ว!'
        });
        fetchConfigAndLogs();
      } else {
        setSendResult({
          success: false,
          message: data.error || 'เกิดข้อผิดพลาดในการส่งข้อความ LINE Messaging API'
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

  // Compute adjusted notification date string when daysBeforeDraw !== 1
  const computedNotifyDateStr = useMemo(() => {
    if (config.daysBeforeDraw === 1) return nextDraw.lineNotifyDateStr;
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
      {/* Top 1-Day Pre-Draw LINE Master Card */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div>
            <div className="text-xs text-emerald-400 font-semibold flex items-center gap-2 mb-2">
              <Bell className="w-3.5 h-3.5" />
              <span>ระบบแจ้งเตือนโค้งสุดท้ายทาง LINE อัตโนมัติ (ก่อนหวยออก {config.daysBeforeDraw} วัน)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              แจ้งเตือนเลขเด็ด 3 ตัวตรงเข้า LINE อัตโนมัติ
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              ส่งสรุปเม็ดเดียว 3 ตัวตรง และเลขเด่น 22 แหล่งเข้าแชท/กลุ่ม LINE ของคุณโดยอัตโนมัติก่อนวันออกรางวัล 1 วัน
            </p>
          </div>

          {/* Master Toggle Switch */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 px-5 py-3.5 rounded-2xl shrink-0">
            <div className="text-right">
              <div className="text-sm font-bold text-white">แจ้งเตือน LINE ออโต้</div>
              <div className="text-xs text-slate-400">
                {config.isLineEnabled ? 'เปิดใช้งาน (รอส่งตามเวลา)' : 'ปิดใช้งาน'}
              </div>
            </div>
            <button
              onClick={() => handleSaveConfig({ isLineEnabled: !config.isLineEnabled })}
              aria-label="เปิดหรือปิดการแจ้งเตือนทาง LINE"
              className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center ${
                config.isLineEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
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

          <div className="bg-slate-950/60 border border-emerald-500/30 rounded-2xl p-4">
            <div className="text-xs text-emerald-400 flex items-center gap-1.5 mb-1">
              <Bell className="w-3.5 h-3.5" />
              <span>กำหนดแจ้งเตือน LINE (ก่อน {config.daysBeforeDraw} วัน)</span>
            </div>
            <div className="text-lg font-bold text-emerald-300">{computedNotifyDateStr}</div>
            <div className="text-xs text-slate-400 mt-1">เวลา {config.notifyTime} น.</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>นับถอยหลังวันแจ้งเตือน</span>
            </div>
            <div className="text-lg font-bold text-sky-300">
              {computedDaysLeft <= 0 ? 'ถึงวันแจ้งเตือนแล้ว!' : `อีก ${computedDaysLeft} วัน`}
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
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-emerald-400"
              >
                <option value={1}>ก่อน 1 วัน</option>
                <option value={2}>ก่อน 2 วัน</option>
                <option value={3}>ก่อน 3 วัน</option>
              </select>
              <input
                type="time"
                value={config.notifyTime}
                onChange={(e) => handleSaveConfig({ notifyTime: e.target.value })}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Config + Message Composer (Left) & LINE Chat Preview + Logs (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* LINE Messaging API / Webhook Config */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>ตั้งค่า LINE Messaging API (Push Message)</span>
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
                    !useSimulatedMode ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ส่งเข้า LINE OA จริง (Live)
                </button>
              </div>
            </div>

            {/* Delivery Channel Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'messaging_api_push', label: 'Push Message (User ID)', icon: <MessageSquare className="w-3.5 h-3.5" /> },
                { id: 'messaging_api_broadcast', label: 'LINE OA Broadcast', icon: <Users className="w-3.5 h-3.5" /> },
                { id: 'webhook', label: 'Webhook Relay (เสริม)', icon: <Link2 className="w-3.5 h-3.5" /> }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSaveConfig({ deliveryMode: m.id as LineNotifyConfig['deliveryMode'] })}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                    config.deliveryMode === m.id
                      ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {config.deliveryMode === 'webhook' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Webhook URL{' '}
                  {envStatus?.hasWebhookUrl ? (
                    <span className="text-emerald-400">(พบใน AI Studio Secrets แล้ว — เว้นว่างได้)</span>
                  ) : (
                    useSimulatedMode && <span className="text-slate-500">(ไม่บังคับในโหมดจำลอง)</span>
                  )}
                </label>
                <input
                  type="url"
                  value={config.webhookUrl}
                  onChange={(e) => updateFieldLocally({ webhookUrl: e.target.value })}
                  placeholder={
                    envStatus?.hasWebhookUrl
                      ? `ใช้ค่าจาก Secret (${envStatus.webhookUrlPreview}) หรือกรอกทับที่นี่`
                      : 'https://hook.eu1.make.com/...'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Channel Access Token{' '}
                    {envStatus?.hasChannelAccessToken ? (
                      <span className="text-emerald-400">(พบใน AI Studio Secrets แล้ว — เว้นว่างได้)</span>
                    ) : (
                      useSimulatedMode && <span className="text-slate-500">(ไม่บังคับในโหมดจำลอง)</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={config.channelAccessToken}
                      onChange={(e) => updateFieldLocally({ channelAccessToken: e.target.value })}
                      placeholder={
                        envStatus?.hasChannelAccessToken
                          ? `ใช้งานจาก Secret (${envStatus.channelAccessTokenPreview}) หรือกรอกทับที่นี่`
                          : 'วาง Long-lived Channel Access Token จาก LINE Developers Console...'
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
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

                {config.deliveryMode === 'messaging_api_push' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      User ID{' '}
                      <span className="text-slate-400 font-normal">(หรือ Group ID ที่ขึ้นต้นด้วย C...)</span>{' '}
                      {envStatus?.hasTargetId ? (
                        <span className="text-emerald-400">(พบใน AI Studio Secrets แล้ว — เว้นว่างได้)</span>
                      ) : (
                        useSimulatedMode && <span className="text-slate-500">(ไม่บังคับในโหมดจำลอง)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={config.targetId}
                      onChange={(e) => updateFieldLocally({ targetId: e.target.value })}
                      placeholder={
                        envStatus?.hasTargetId
                          ? `ใช้งานจาก Secret (${envStatus.targetIdPreview}) หรือกรอกทับที่นี่`
                          : 'เช่น U4af4980629... (ดูได้จากหน้า Basic settings ของ Messaging API)'
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Save Button, Verify Bot Button & Persistence Status Bar */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              {hasUnsavedChanges && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/40 px-3.5 py-2.5 text-xs text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>มีการแก้ไขข้อมูลที่ยังไม่บันทึก — กรุณากดปุ่ม &quot;บันทึกการตั้งค่า LINE&quot; เพื่อจัดเก็บข้อมูลถาวร</span>
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
                  {envStatus?.hasChannelAccessToken || envStatus?.hasTargetId
                    ? 'ตรวจพบ AI Studio Secrets พร้อมใช้งานถาวรบนเซิร์ฟเวอร์แล้ว'
                    : config.channelAccessToken || config.webhookUrl
                      ? 'ระบบจะบันทึกข้อมูลไว้ทั้งในฐานข้อมูลเซิร์ฟเวอร์ และสำรองในเบราว์เซอร์อัตโนมัติ'
                      : 'กรอก Channel Access Token และ User ID แล้วกดบันทึก'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {config.deliveryMode !== 'webhook' && (
                    <button
                      type="button"
                      onClick={handleVerifyBot}
                      disabled={isVerifying}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4 text-sky-400" />
                      <span>{isVerifying ? 'กำลังตรวจสอบ...' : 'ตรวจสอบ Token LINE OA'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSaveConfig()}
                    disabled={isSaving}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                      hasUnsavedChanges
                        ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า LINE'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Studio Secrets / Environment Variables Status Box */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>ตั้งค่าถาวรผ่าน AI Studio Secrets / Environment Variables</span>
                </div>
                <span
                  className={`text-[11px] font-semibold ${
                    envStatus?.hasChannelAccessToken ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {envStatus?.hasChannelAccessToken ? 'เชื่อมต่อ Secrets แล้ว' : 'ยังไม่ได้ตั้งค่าใน Secrets'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    keyName: 'LINE_CHANNEL_ACCESS_TOKEN',
                    active: Boolean(envStatus?.hasChannelAccessToken),
                    preview: envStatus?.channelAccessTokenPreview,
                    desc: 'Channel Access Token (LINE Messaging API)'
                  },
                  {
                    keyName: 'LINE_USER_ID',
                    active: Boolean(envStatus?.hasTargetId),
                    preview: envStatus?.targetIdPreview,
                    desc: 'User ID (ขึ้นต้นด้วย U...) หรือ Group ID (รองรับ LINE_TARGET_ID ด้วย)'
                  },
                  {
                    keyName: 'LINE_WEBHOOK_URL',
                    active: Boolean(envStatus?.hasWebhookUrl),
                    preview: envStatus?.webhookUrlPreview,
                    desc: 'ไม่บังคับ (ใช้เฉพาะโหมด Webhook Relay เช่น Make / n8n)'
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

              <div className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-slate-900">
                <span className="text-slate-300 font-semibold">วิธีใส่ใน AI Studio:</span> เปิดเมนูตั้งค่า/กุญแจ (Secrets) ของโปรเจกต์ แล้วเพิ่มชื่อตัวแปรด้านบนพร้อมวาง Channel Access Token และ User ID ของคุณ จากนั้นกดรีเฟรช ระบบหลังบ้านจะดึงมาส่ง Push Message ให้อัตโนมัติถาวรครับ
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2.5 leading-relaxed">
              <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>วิธีเชื่อมต่อ LINE Messaging API (Push Message) เข้า LINE OA</span>
              </div>
              <p>1. เข้า LINE Developers Console → เลือก Provider & Messaging API Channel ของ LINE OA คุณ</p>
              <p>2. แถบ Messaging API → กด Issue เพื่อคัดลอก <strong>Channel Access Token (long-lived)</strong> และดู <strong>Your user ID</strong> ในแถบ Basic settings</p>
              <p>3. อย่าลืมแอด LINE OA ของคุณเป็นเพื่อนก่อน จากนั้นกรอก Token และ User ID (หรือใส่ใน Secrets) แล้วกดทดสอบส่งเข้า LINE OA ได้ทันที</p>

              <div className="mt-2 pt-2.5 border-t border-slate-800/80 space-y-2">
                <div className="font-semibold text-amber-300">
                  กรณีเจอ Webhook URL Error (404 Not Found) ในหน้า LINE Developers:
                </div>
                <p className="text-[11px] text-slate-400">
                  • <strong>หากใช้ Push Message อย่างเดียว ไม่จำเป็นต้องเปิด Use webhook หรือกด Verify ครับ</strong> (สามารถปิดสวิตช์ Use webhook ได้เลย การส่ง Push Message จากแอปนี้จะทำงานได้ตามปกติ)
                </p>
                <p className="text-[11px] text-slate-400">
                  • สาเหตุที่ <code className="text-slate-300">webhook.site/...</code> ขึ้น 404 เพราะลิงก์ชั่วคราวหมดอายุแล้ว หากต้องการ URL ที่ตอบกลับ HTTP 200 เพื่อดึง User ID / Group ID ของคนอื่น สามารถใช้ Webhook Endpoint ของระบบเราเองได้:
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
                  <code className="text-[11px] text-sky-300 font-mono break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/line/webhook` : '/api/line/webhook'}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/api/line/webhook`;
                      navigator.clipboard.writeText(url);
                      setCopiedWebhookEndpoint(true);
                      setTimeout(() => setCopiedWebhookEndpoint(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    {copiedWebhookEndpoint ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>คัดลอก URL แล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>คัดลอก Webhook URL</span>
                      </>
                    )}
                  </button>
                </div>

                {capturedSources.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <div className="text-[11px] font-semibold text-emerald-300">
                      User ID / Group ID ที่จับได้จาก Webhook ล่าสุด:
                    </div>
                    <div className="space-y-1">
                      {capturedSources.slice(0, 5).map((src) => (
                        <div
                          key={src.id}
                          className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px]"
                        >
                          <div className="min-w-0">
                            <span className="text-slate-400 mr-1.5">[{src.sourceType}]</span>
                            <code className="text-amber-300 font-mono">{src.id}</code>
                            {src.lastMessage && (
                              <span className="text-slate-500 ml-2">&quot;{src.lastMessage}&quot;</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => updateFieldLocally({ targetId: src.id })}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold whitespace-nowrap shrink-0"
                          >
                            ใช้ ID นี้
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Message Composer */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">รูปแบบข้อความแจ้งเตือนทาง LINE</h3>
              <button
                onClick={handleCopyMessage}
                className="text-xs text-emerald-300 hover:text-white flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                {copiedMsg ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMsg ? 'คัดลอกแล้ว' : 'คัดลอกข้อความ'}</span>
              </button>
            </div>

            {/* Section Toggles */}
            <div className="flex flex-wrap gap-3 text-xs">
              {[
                { key: 'includeThreeStraight', label: 'ใส่ชุด 3 ตัวตรง VIP' },
                { key: 'includeRunners', label: 'ใส่เลขวิ่ง-รูด' },
                { key: 'includeTwoDigits', label: 'ใส่ชุด 2 ตัวบน-ล่าง' }
              ].map((opt) => {
                const checked = Boolean(config[opt.key as keyof LineNotifyConfig]);
                return (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg cursor-pointer text-slate-300 hover:border-emerald-500/40"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => handleSaveConfig({ [opt.key]: e.target.checked })}
                      className="accent-emerald-500"
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-emerald-400 font-['Prompt',sans-serif]"
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
                onClick={handleSendTestAlert}
                disabled={isSending}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSending
                    ? 'กำลังส่งข้อความ LINE OA...'
                    : useSimulatedMode
                      ? 'ทดสอบส่งจำลอง (Sandbox)'
                      : config.deliveryMode === 'messaging_api_push'
                        ? 'ทดสอบส่ง Push Message เข้า LINE OA จริง'
                        : 'ทดสอบส่งเข้า LINE OA ทันที'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Realistic LINE Chat Preview + Delivery Logs */}
        <div className="lg:col-span-5 space-y-6">
          {/* LINE Mobile Chat Preview */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">ตัวอย่างข้อความบนหน้าจอ LINE</h3>
              <span className="text-[11px] text-emerald-400 font-medium">ก่อนหวยออก {config.daysBeforeDraw} วัน</span>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-700 bg-[#7494c0] shadow-inner">
              {/* LINE Chat Header */}
              <div className="bg-[#242c3c] px-4 py-3 flex items-center justify-between text-white text-xs font-bold">
                <span>AI หวยแม่นยำ Official</span>
                <span className="text-[10px] text-emerald-400">Auto Alert · {config.notifyTime} น.</span>
              </div>

              {/* Chat Body */}
              <div className="p-4 space-y-3 min-h-[300px]">
                <div className="text-center">
                  <span className="bg-black/25 text-white text-[10px] px-2.5 py-0.5 rounded-full">
                    {computedNotifyDateStr}
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    AI
                  </div>
                  <div className="bg-white text-slate-900 rounded-2xl rounded-tl-none px-4 py-3 text-xs leading-relaxed whitespace-pre-line shadow-sm max-w-[90%]">
                    {customMessage}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Logs */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">ประวัติการแจ้งเตือนทาง LINE</h3>
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
                ยังไม่มีประวัติการแจ้งเตือน กดปุ่ม &quot;ทดสอบส่งแจ้งเตือนเข้า LINE ทันที&quot; เพื่อดูตัวอย่างการส่ง
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
                            ? 'text-emerald-400'
                            : log.status === 'failed'
                              ? 'text-rose-400'
                              : 'text-amber-300'
                        }`}
                      >
                        {log.status === 'sent'
                          ? 'ส่งเข้า LINE จริงแล้ว'
                          : log.status === 'failed'
                            ? 'ส่งไม่สำเร็จ'
                            : 'ทดสอบจำลองสำเร็จ'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-2 whitespace-pre-line">
                      {log.message}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900 tabular-nums">
                      <span>{log.recipientSummary || log.deliveryMode}</span>
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
