import React, { useState, useEffect, useRef } from 'react';
import { AIPredictionResult, NextDrawInfo, FacebookConfig, FacebookPostLog } from '../types/lottery';
import { renderLotteryCardToCanvas } from '../utils/canvasCard';
import {
  Share2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Download,
  Eye,
  EyeOff,
  Settings,
  Sparkles,
  ExternalLink,
  RefreshCw,
  ThumbsUp,
  MessageCircle,
  Share,
  SlidersHorizontal,
  Info,
  Save
} from 'lucide-react';

const FB_LOCAL_STORAGE_KEY = 'ai_lottery_fb_config_v1';

interface FacebookAutoPostViewProps {
  prediction: AIPredictionResult;
  nextDraw: NextDrawInfo;
}

export const FacebookAutoPostView: React.FC<FacebookAutoPostViewProps> = ({
  prediction,
  nextDraw
}) => {
  // Config state
  const [config, setConfig] = useState<FacebookConfig>({
    pageId: '',
    pageName: 'เพจเลขเด็ด AI สถิติแม่นยำ',
    pageAccessToken: '',
    isAutoPostEnabled: true,
    postDaysBefore: 5,
    postTime: '09:00',
    targetDrawDate: nextDraw.drawDateStr,
    includeImageCard: true,
    watermarkText: 'AI Lottery Deep Analysis',
    postHashtags: '#เลขเด็ด #หวยรัฐบาล #AIหวยแม่นยำ #สถิติหวย #ตรวจหวย #เลขเด็ดงวดนี้',
    disclaimer: '⚠️ ข้อมูลเป็นการประมวลผลทางสถิติและความน่าจะเป็นด้วย AI เพื่อความบันเทิงและการตัดสินใจ โปรดใช้วิจารณญาณ'
  });

  const [postCaption, setPostCaption] = useState(prediction.facebookCaption || '');
  const [showToken, setShowToken] = useState(false);
  const [useSimulatedMode, setUseSimulatedMode] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveBanner, setSaveBanner] = useState<{
    type: 'saved' | 'restored' | 'error';
    message: string;
    timestamp?: string;
  } | null>(null);
  const [postResult, setPostResult] = useState<{ success: boolean; message: string; postId?: string } | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [postLogs, setPostLogs] = useState<FacebookPostLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const saveToBrowserStorage = (cfg: FacebookConfig, simulated: boolean) => {
    try {
      localStorage.setItem(
        FB_LOCAL_STORAGE_KEY,
        JSON.stringify({
          config: cfg,
          useSimulatedMode: simulated,
          savedAt: new Date().toLocaleString('th-TH')
        })
      );
    } catch (err) {
      console.warn('Unable to write Facebook config to localStorage:', err);
    }
  };

  const readFromBrowserStorage = (): {
    config?: Partial<FacebookConfig>;
    useSimulatedMode?: boolean;
    savedAt?: string;
  } | null => {
    try {
      const raw = localStorage.getItem(FB_LOCAL_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  // Sync caption when prediction updates
  useEffect(() => {
    if (prediction.facebookCaption) {
      setPostCaption(prediction.facebookCaption);
    }
  }, [prediction]);

  // Load existing configuration & logs from server (with localStorage backup auto-restore)
  useEffect(() => {
    fetchLogsAndConfig();
  }, []);

  // Render canvas card
  useEffect(() => {
    if (canvasRef.current && prediction) {
      renderLotteryCardToCanvas(canvasRef.current, prediction, config.watermarkText);
    }
  }, [prediction, config.watermarkText]);

  const fetchLogsAndConfig = async () => {
    setIsLoadingLogs(true);
    const localBackup = readFromBrowserStorage();
    try {
      const res = await fetch('/api/facebook/config');
      const data = await res.json();
      if (data.success) {
        const serverCfg = data.config as Partial<FacebookConfig> | undefined;
        const serverHasCreds = Boolean(serverCfg?.pageId && serverCfg?.pageAccessToken);
        const localHasCreds = Boolean(
          localBackup?.config?.pageId || localBackup?.config?.pageAccessToken
        );

        if (!serverHasCreds && localHasCreds && localBackup?.config) {
          const restored: FacebookConfig = {
            ...config,
            ...(serverCfg || {}),
            ...localBackup.config,
            targetDrawDate: nextDraw.drawDateStr
          };
          setConfig(restored);
          const restoredSim = localBackup.useSimulatedMode ?? !Boolean(restored.pageAccessToken);
          setUseSimulatedMode(restoredSim);

          await fetch('/api/facebook/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(restored)
          });
          setSaveBanner({
            type: 'restored',
            message: 'กู้คืน Page ID / Access Token จากเบราว์เซอร์เข้าสู่เซิร์ฟเวอร์อัตโนมัติแล้ว',
            timestamp: localBackup.savedAt
          });
        } else if (serverCfg) {
          const merged: FacebookConfig = {
            ...config,
            ...serverCfg,
            targetDrawDate: nextDraw.drawDateStr
          };
          setConfig(merged);
          const nextSim =
            localBackup?.useSimulatedMode !== undefined
              ? localBackup.useSimulatedMode
              : !serverHasCreds;
          setUseSimulatedMode(nextSim);

          if (serverHasCreds) {
            saveToBrowserStorage(merged, nextSim);
          }
        }
        if (data.logs) {
          setPostLogs(data.logs);
        }
      }
    } catch (e) {
      console.error('Failed to load facebook settings:', e);
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

  const updateFieldLocally = (patch: Partial<FacebookConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
    setHasUnsavedChanges(true);
    setSaveBanner(null);
  };

  const persistConfig = async (
    targetConfig: FacebookConfig,
    simulatedOverride?: boolean,
    showSuccessBanner = true
  ) => {
    setIsSaving(true);
    const simMode = simulatedOverride !== undefined ? simulatedOverride : useSimulatedMode;
    saveToBrowserStorage(targetConfig, simMode);

    try {
      const res = await fetch('/api/facebook/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetConfig)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกการตั้งค่าไม่สำเร็จ');
      }
      setHasUnsavedChanges(false);
      if (showSuccessBanner) {
        setSaveBanner({
          type: 'saved',
          message: 'บันทึกการตั้งค่า Facebook เรียบร้อยแล้ว (เก็บทั้งบนเซิร์ฟเวอร์และเบราว์เซอร์)',
          timestamp: new Date().toLocaleTimeString('th-TH')
        });
      }
    } catch (e: any) {
      console.error('Failed to save config:', e);
      setSaveBanner({
        type: 'error',
        message: `บันทึกในเบราว์เซอร์แล้ว แต่เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ: ${e?.message || 'Network error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConfig = async (newConfig?: Partial<FacebookConfig>) => {
    const updated = newConfig ? { ...config, ...newConfig } : config;
    setConfig(updated);
    await persistConfig(updated);
  };

  const handleToggleSimulatedMode = () => {
    const nextSim = !useSimulatedMode;
    setUseSimulatedMode(nextSim);
    saveToBrowserStorage(config, nextSim);
  };

  // Trigger post (Real or Simulated)
  const handlePostNow = async () => {
    setIsPosting(true);
    setPostResult(null);

    if (hasUnsavedChanges) {
      await persistConfig(config, useSimulatedMode, false);
    }

    try {
      const response = await fetch('/api/facebook/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: config.pageId,
          pageAccessToken: config.pageAccessToken,
          message: postCaption,
          drawDate: nextDraw.drawDateStr,
          isSimulated: useSimulatedMode || !config.pageAccessToken
        })
      });

      const resData = await response.json();

      if (resData.success) {
        setPostResult({
          success: true,
          message: useSimulatedMode || !config.pageAccessToken
            ? '✅ โพสต์สำเร็จในโหมดจำลอง! บันทึกลงประวัติเรียบร้อย'
            : '🎉 โพสต์สำเร็จไปยัง Facebook Page ของคุณผ่าน Graph API!',
          postId: resData.data?.postId
        });
        // Refresh logs
        fetchLogsAndConfig();
      } else {
        setPostResult({
          success: false,
          message: resData.error || 'เกิดข้อผิดพลาดในการโพสต์'
        });
      }
    } catch (err: any) {
      setPostResult({
        success: false,
        message: `ข้อผิดพลาดเครือข่าย: ${err.message}`
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(postCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleDownloadCard = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `AI-Lottery-${prediction.drawDate.replace(/\s+/g, '-')}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleWebShareToFacebook = () => {
    // Standard Facebook Sharer dialog URL
    const url = encodeURIComponent(window.location.origin);
    const quote = encodeURIComponent(postCaption.slice(0, 300) + '...');
    const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`;
    window.open(fbShareUrl, '_blank', 'width=600,height=500');
  };

  return (
    <div className="space-y-8">
      {/* 5-Day Auto-Post Schedule Master Card */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-950/70 via-slate-900 to-indigo-950/60 border border-blue-500/30 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-semibold mb-3">
              <Clock className="w-3.5 h-3.5" />
              ระบบตั้งเวลาโพสต์ล่วงหน้า 5 วันอัตโนมัติ (Automated 5-Day Pre-Draw Posting Engine)
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              ตั้งค่าโพสต์อัตโนมัติบน Facebook
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              ระบบจะทำการวิเคราะห์สถิติล่าสุด และโพสต์ขึ้นหน้าเพจ Facebook อัตโนมัติล่วงหน้า 5 วันก่อนหวยออก
            </p>
          </div>

          {/* Master Switch */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 px-5 py-4 rounded-2xl">
            <div className="text-right">
              <div className="text-sm font-bold text-white">ระบบโพสต์ออโต้</div>
              <div className="text-xs text-slate-400">
                {config.isAutoPostEnabled ? 'เปิดใช้งาน (กำลังทำงาน)' : 'ปิดใช้งาน'}
              </div>
            </div>
            <button
              onClick={() => {
                const nextVal = !config.isAutoPostEnabled;
                handleSaveConfig({ isAutoPostEnabled: nextVal });
              }}
              className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center ${
                config.isAutoPostEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>
        </div>

        {/* 5-Day Schedule Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> งวดหวยออกเป้าหมาย
            </div>
            <div className="text-lg font-bold text-amber-300">{nextDraw.drawDateStr}</div>
            <div className="text-xs text-slate-500 mt-1">({nextDraw.dayOfWeek})</div>
          </div>

          <div className="bg-slate-950/60 border border-blue-500/30 rounded-2xl p-4">
            <div className="text-xs text-blue-400 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5" /> กำหนดโพสต์ล่วงหน้า 5 วัน
            </div>
            <div className="text-lg font-bold text-blue-300">{nextDraw.autoPostDateStr}</div>
            <div className="text-xs text-slate-400 mt-1">เวลา {config.postTime} น.</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" /> นับถอยหลังถึงวันโพสต์
            </div>
            <div className="text-lg font-bold text-emerald-400">
              {nextDraw.daysUntilAutoPost <= 0 ? 'ถึงกำหนดโพสต์แล้ว' : `อีก ${nextDraw.daysUntilAutoPost} วัน`}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              (อีก {nextDraw.daysUntilDraw} วันถึงวันหวยออก)
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
              <Settings className="w-3.5 h-3.5 text-indigo-400" /> ตั้งเวลาโพสต์
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="time"
                value={config.postTime}
                onChange={(e) => handleSaveConfig({ postTime: e.target.value })}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-sm font-semibold focus:outline-none focus:border-blue-400"
              />
              <span className="text-xs text-slate-400">น.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Post Config & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Facebook Page Settings & Caption Editor */}
        <div className="lg:col-span-7 space-y-6">
          {/* Facebook Connection Config */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                การเชื่อมต่อ Facebook Page
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">โหมดจำลอง (Simulated):</span>
                <button
                  onClick={handleToggleSimulatedMode}
                  className={`px-2.5 py-1 rounded-full font-semibold transition-colors whitespace-nowrap ${
                    useSimulatedMode
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {useSimulatedMode ? 'ทดสอบจำลอง (Sandbox)' : 'ใช้งานจริง (Live API)'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ชื่อ Facebook Page
                </label>
                <input
                  type="text"
                  value={config.pageName}
                  onChange={(e) => updateFieldLocally({ pageName: e.target.value })}
                  placeholder="เช่น เพจเลขเด็ด AI สถิติแม่นยำ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Facebook Page ID {useSimulatedMode && <span className="text-slate-500">(ไม่บังคับในโหมดจำลอง)</span>}
                </label>
                <input
                  type="text"
                  value={config.pageId}
                  onChange={(e) => updateFieldLocally({ pageId: e.target.value })}
                  placeholder="เช่น 108392019482710"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Facebook Page Access Token {useSimulatedMode && <span className="text-slate-500">(ไม่บังคับในโหมดจำลอง)</span>}
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={config.pageAccessToken}
                  onChange={(e) => updateFieldLocally({ pageAccessToken: e.target.value })}
                  placeholder="EAA..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3" />
                หากยังไม่มี Token สามารถใช้ <strong>โหมดจำลอง</strong> เพื่อทดสอบระบบโพสต์และดาวน์โหลดภาพได้ 100%
              </p>
            </div>

            {/* Save Button & Persistence Status Bar */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              {hasUnsavedChanges && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/40 px-3.5 py-2.5 text-xs text-amber-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>มีการแก้ไขข้อมูลที่ยังไม่บันทึก — กรุณากดปุ่ม &quot;บันทึกการตั้งค่า Facebook&quot; เพื่อจัดเก็บข้อมูลถาวร</span>
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
                  {config.pageId || config.pageAccessToken
                    ? 'ระบบจะบันทึกข้อมูลไว้ทั้งในฐานข้อมูลเซิร์ฟเวอร์ และสำรองในเบราว์เซอร์อัตโนมัติ'
                    : 'กรอก Page ID / Access Token แล้วกดปุ่มบันทึกเพื่อเก็บข้อมูลไว้ใช้งานระยะยาว'}
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveConfig()}
                  disabled={isSaving}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 ${
                    hasUnsavedChanges
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/20'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า Facebook'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Caption & Content Editor */}
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                แคปชั่นโพสต์หวยอัตโนมัติ (Post Caption)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCaption}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  {copiedCaption ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCaption ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={9}
              value={postCaption}
              onChange={(e) => setPostCaption(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500 font-mono"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  แฮชแท็ก (#Hashtags)
                </label>
                <input
                  type="text"
                  value={config.postHashtags}
                  onChange={(e) => updateFieldLocally({ postHashtags: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  ลายน้ำบนรูปการ์ด (Watermark)
                </label>
                <input
                  type="text"
                  value={config.watermarkText}
                  onChange={(e) => updateFieldLocally({ watermarkText: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={handlePostNow}
                disabled={isPosting}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isPosting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังส่งข้อมูลไปยัง Facebook...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {useSimulatedMode ? 'ทดสอบโพสต์ทันที (Simulate Post)' : 'โพสต์จริงไปยัง Facebook Page'}
                    </span>
                  </>
                )}
              </button>

              <button
                onClick={handleWebShareToFacebook}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center gap-2 transition-all"
              >
                <Share2 className="w-4 h-4 text-blue-400" />
                <span>แชร์ไปยัง Facebook โดยตรง</span>
              </button>

              <button
                onClick={handleDownloadCard}
                className="px-4 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-sm border border-amber-500/40 flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดรูปภาพการ์ด</span>
              </button>
            </div>

            {/* Post Result Alert */}
            {postResult && (
              <div
                className={`p-4 rounded-xl text-xs sm:text-sm flex items-start gap-3 border ${
                  postResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                {postResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{postResult.message}</div>
                  {postResult.postId && (
                    <div className="text-xs text-slate-400 mt-1">
                      Post ID: {postResult.postId}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Live Facebook Post Preview Mockup */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-24">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-blue-400" /> ตัวอย่างโพสต์เสมือนจริงบน Facebook
              </span>
              <span className="text-[11px] text-slate-500">Live Preview</span>
            </div>

            {/* Facebook Card Mockup */}
            <div className="rounded-2xl bg-slate-900 border border-slate-700 shadow-xl overflow-hidden">
              {/* Facebook Header */}
              <div className="p-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center font-black text-slate-950 text-sm shadow">
                    AI
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-1">
                      {config.pageName || 'เพจเลขเด็ด AI สถิติแม่นยำ'}
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 inline" />
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <span>ล่วงหน้า 5 วันก่อนหวยออก</span> • <span>🌐 สาธารณะ</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Facebook Post Body Text */}
              <div className="p-4 text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed max-h-64 overflow-y-auto">
                {postCaption}
              </div>

              {/* Visual Card Canvas Preview */}
              <div className="relative bg-slate-950 border-t border-b border-slate-800 flex justify-center p-2">
                <canvas
                  ref={canvasRef}
                  className="max-w-full h-auto rounded-lg shadow-md border border-slate-800"
                  style={{ maxHeight: '320px', width: 'auto' }}
                />
              </div>

              {/* Engagement Stats Bar */}
              <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800">
                <div className="flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white">
                    👍
                  </span>
                  <span className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-[10px] text-white">
                    ❤️
                  </span>
                  <span className="text-[11px] ml-1">1.2K คน</span>
                </div>
                <div className="text-[11px]">
                  <span>248 ความคิดเห็น</span> • <span>592 แชร์</span>
                </div>
              </div>

              {/* Facebook Like / Comment / Share Buttons */}
              <div className="px-4 py-2.5 grid grid-cols-3 gap-1 text-xs text-slate-300 font-semibold">
                <button className="py-1.5 rounded hover:bg-slate-800 flex items-center justify-center gap-1.5 text-slate-300">
                  <ThumbsUp className="w-3.5 h-3.5" /> ถูกใจ
                </button>
                <button className="py-1.5 rounded hover:bg-slate-800 flex items-center justify-center gap-1.5 text-slate-300">
                  <MessageCircle className="w-3.5 h-3.5" /> แสดงความคิดเห็น
                </button>
                <button
                  onClick={handleWebShareToFacebook}
                  className="py-1.5 rounded hover:bg-slate-800 flex items-center justify-center gap-1.5 text-blue-400"
                >
                  <Share className="w-3.5 h-3.5" /> แชร์
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Post History & Scheduled Queue Logs */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              ประวัติและคิวการโพสต์อัตโนมัติ (Automated Posting Logs & Queue)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              รายการโพสต์ล่วงหน้า 5 วันที่ผ่านมาและคิวการทำงานของระบบ
            </p>
          </div>
          <button
            onClick={fetchLogsAndConfig}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">วัน-เวลา</th>
                <th className="px-4 py-3">งวดหวยออก</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3">ข้อความย่อ</th>
                <th className="px-4 py-3">การเข้าถึง (Reach)</th>
                <th className="px-4 py-3">ลิงก์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {/* Upcoming Scheduled Entry */}
              {config.isAutoPostEnabled && (
                <tr className="bg-blue-950/20 text-slate-300">
                  <td className="px-4 py-3 font-medium text-blue-400">
                    {nextDraw.autoPostDateStr} ({config.postTime} น.)
                  </td>
                  <td className="px-4 py-3 font-semibold text-amber-300">
                    {nextDraw.drawDateStr}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      ตั้งเวลาล่วงหน้า 5 วัน (Queued)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                    {postCaption.slice(0, 50)}...
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    รอการเผยแพร่
                  </td>
                  <td className="px-4 py-3 text-slate-500">-</td>
                </tr>
              )}

              {/* Past Logs */}
              {postLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 text-slate-300">
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(log.timestamp).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">
                    {log.drawDate}
                  </td>
                  <td className="px-4 py-3">
                    {log.status === 'published' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        โพสต์สำเร็จ (Live)
                      </span>
                    )}
                    {log.status === 'simulated' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        จำลองสำเร็จ (Simulated)
                      </span>
                    )}
                    {log.status === 'failed' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        ล้มเหลว
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 max-w-xs truncate">
                    {log.message.slice(0, 60)}...
                  </td>
                  <td className="px-4 py-3 text-emerald-400 font-semibold">
                    {log.reach ? `${log.reach.toLocaleString()} คน` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {log.permalinkUrl ? (
                      <a
                        href={log.permalinkUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <span>ดู</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
