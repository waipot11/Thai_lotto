import React, { useEffect, useRef, useState } from 'react';
import {
  ExtractedDrawCandidate,
  GroundingSourceLink,
  Lottery4DType,
  LotteryDraw4D
} from '../types/lottery';
import { LOTTERY_4D_META_MAP, validateStrict4DNumber } from '../data/lottery4DDatabase';
import { THAI_DAY_NAMES, THAI_MONTH_NAMES } from '../data/lotteryHistory';
import {
  Globe,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Upload,
  Check,
  Trash2,
  RotateCcw,
  Plus,
  Loader2,
  ShieldCheck
} from 'lucide-react';

interface DataInputViewProps {
  lotteryType: Lottery4DType;
  draws: LotteryDraw4D[];
  onDrawsUpdated: (nextDraws: LotteryDraw4D[]) => void;
  onResetDraws: () => void;
  onNavigateToStatistics: () => void;
}

type ExtractMode = 'auto' | 'text' | 'image';

export const DataInputView: React.FC<DataInputViewProps> = ({
  lotteryType,
  draws,
  onDrawsUpdated,
  onResetDraws,
  onNavigateToStatistics
}) => {
  const meta = LOTTERY_4D_META_MAP[lotteryType];
  const [mode, setMode] = useState<ExtractMode>('auto');

  // Mode 1: Auto-Fetch via Google Search Grounding
  const [fetchCount, setFetchCount] = useState<number>(20);
  const [isFetchingAuto, setIsFetchingAuto] = useState(false);
  const [autoCandidates, setAutoCandidates] = useState<ExtractedDrawCandidate[]>([]);
  const [groundingSources, setGroundingSources] = useState<GroundingSourceLink[]>([]);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [autoSuccessMsg, setAutoSuccessMsg] = useState<string | null>(null);

  // Mode 2: Smart Text Cleaner
  const [rawText, setRawText] = useState('');
  const [isCleaningText, setIsCleaningText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [textExtractedResult, setTextExtractedResult] = useState<{
    extractedCount: number;
    addedCount: number;
    numbers: string[];
  } | null>(null);

  // Mode 3: Image / Screenshot OCR
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [ocrCandidates, setOcrCandidates] = useState<ExtractedDrawCandidate[]>([]);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);

  // Manual quick entry
  const [manualNumber, setManualNumber] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    setAutoCandidates([]);
    setGroundingSources([]);
    setAutoError(null);
    setAutoSuccessMsg(null);
    setOcrCandidates([]);
    setOcrError(null);
    setOcrSuccessMsg(null);
    setTextError(null);
    setTextExtractedResult(null);
    setManualError(null);
  }, [lotteryType]);

  // Run Mode 1: Auto-Fetch
  const handleAutoFetch = async () => {
    setIsFetchingAuto(true);
    setAutoError(null);
    setAutoSuccessMsg(null);
    setAutoCandidates([]);
    setGroundingSources([]);

    try {
      const res = await fetch('/api/4d/extract/auto-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotteryType, count: fetchCount })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถดึงข้อมูลจากเว็บได้');
      }
      setAutoCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      setGroundingSources(Array.isArray(data.groundingSources) ? data.groundingSources : []);
    } catch (err: any) {
      setAutoError(err?.message || 'เกิดข้อผิดพลาดระหว่างค้นหาข้อมูล');
    } finally {
      setIsFetchingAuto(false);
    }
  };

  // Run Mode 2: Smart Text Cleaner (Auto validates & saves immediately)
  const handleCleanText = async () => {
    setIsCleaningText(true);
    setTextError(null);
    setTextExtractedResult(null);

    try {
      const res = await fetch('/api/4d/extract/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotteryType, rawText })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถสกัดเลข 4 หลักจากข้อความได้');
      }
      if (Array.isArray(data.draws)) {
        onDrawsUpdated(data.draws);
      }
      setTextExtractedResult({
        extractedCount: data.extractedCount || 0,
        addedCount: data.addedCount || 0,
        numbers: (data.extractedItems || []).map((x: any) => x.number4D)
      });
    } catch (err: any) {
      setTextError(err?.message || 'เกิดข้อผิดพลาดระหว่างกลั่นกรองข้อความ');
    } finally {
      setIsCleaningText(false);
    }
  };

  // Handle file upload for Mode 3
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrError(null);
    setOcrSuccessMsg(null);
    setOcrCandidates([]);
    setImageMimeType(file.type || 'image/png');

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setImagePreviewUrl(result);
      setImageBase64(result);
    };
    reader.readAsDataURL(file);
  };

  // Run Mode 3: Image OCR
  const handleScanImage = async () => {
    if (!imageBase64) return;
    setIsScanningImage(true);
    setOcrError(null);
    setOcrSuccessMsg(null);
    setOcrCandidates([]);

    try {
      const res = await fetch('/api/4d/extract/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotteryType,
          imageBase64,
          mimeType: imageMimeType
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถอ่านตัวเลขจากรูปภาพได้');
      }
      setOcrCandidates(Array.isArray(data.candidates) ? data.candidates : []);
    } catch (err: any) {
      setOcrError(err?.message || 'เกิดข้อผิดพลาดระหว่างสแกนรูปภาพ');
    } finally {
      setIsScanningImage(false);
    }
  };

  // Confirm & import candidates (shared between Mode 1 Visual 10-Draw Audit and Mode 3 Image Preview)
  const confirmImportCandidates = async (
    candidates: ExtractedDrawCandidate[],
    source: 'gemini-search' | 'image-ocr'
  ) => {
    const selected = candidates.filter((c) => c.selected && /^\d{4}$/.test(c.number4D));
    if (selected.length === 0) return;

    setIsImporting(true);
    try {
      const res = await fetch('/api/4d/draws/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotteryType,
          source,
          items: selected
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'นำเข้าข้อมูลไม่สำเร็จ');
      }
      if (Array.isArray(data.draws)) {
        onDrawsUpdated(data.draws);
      }
      if (source === 'gemini-search') {
        setAutoSuccessMsg(
          `ยืนยันนำเข้า ${selected.length} งวด (เพิ่มใหม่ ${data.addedCount} งวด) และอัปเดตกราฟสถิติ + Backtest 200 งวดเรียบร้อยแล้ว`
        );
      } else {
        setOcrSuccessMsg(
          `ยืนยันนำเข้าจากรูปภาพ ${selected.length} ชุด (เพิ่มใหม่ ${data.addedCount} งวด) และอัปเดตกราฟสถิติเรียบร้อยแล้ว`
        );
      }
    } catch (err: any) {
      if (source === 'gemini-search') setAutoError(err?.message);
      else setOcrError(err?.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    const check = validateStrict4DNumber(manualNumber);
    if (!check.valid) {
      setManualError('กรุณากรอกตัวเลข 4 หลักที่ถูกต้อง (0000 - 9999) เท่านั้น');
      return;
    }

    const todayIso = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
    setIsImporting(true);
    try {
      const res = await fetch('/api/4d/draws/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotteryType,
          source: 'manual',
          items: [
            {
              drawDate: manualDate.trim() || undefined,
              dateIso: todayIso,
              number4D: check.number4D
            }
          ]
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      }
      if (Array.isArray(data.draws)) {
        onDrawsUpdated(data.draws);
      }
      setManualNumber('');
      setManualDate('');
    } catch (err: any) {
      setManualError(err?.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsImporting(false);
    }
  };

  const updateCandidateNumber = (
    listSetter: React.Dispatch<React.SetStateAction<ExtractedDrawCandidate[]>>,
    id: string,
    newVal: string
  ) => {
    const digitsOnly = newVal.replace(/\D/g, '').slice(0, 4);
    listSetter((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              number4D: digitsOnly,
              isValid4D: /^\d{4}$/.test(digitsOnly),
              selected: /^\d{4}$/.test(digitsOnly) ? item.selected : false
            }
          : item
      )
    );
  };

  const updateCandidateDate = (
    listSetter: React.Dispatch<React.SetStateAction<ExtractedDrawCandidate[]>>,
    id: string,
    newIso: string
  ) => {
    const cleanIso = newIso.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanIso)) return;
    const parsed = new Date(`${cleanIso}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return;
    const dayOfWeek = THAI_DAY_NAMES[parsed.getUTCDay()];
    const drawDate = `${parsed.getUTCDate()} ${THAI_MONTH_NAMES[parsed.getUTCMonth()]} ${parsed.getUTCFullYear() + 543}`;

    listSetter((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              dateIso: cleanIso,
              drawDate,
              dayOfWeek
            }
          : item
      )
    );
  };

  const toggleCandidateSelection = (
    listSetter: React.Dispatch<React.SetStateAction<ExtractedDrawCandidate[]>>,
    id: string
  ) => {
    listSetter((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Strict 4D Parsing Rule Notice */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs text-amber-400 font-medium">
              AI Smart Data Extractor · {meta.name} · ฐานข้อมูลปัจจุบัน {draws.length} งวด
            </div>
            <h2 className="text-2xl font-bold text-white mt-1">
              นำเข้าข้อมูลสถิติ 4 หลักอัจฉริยะ (3 โหมด Gemini AI)
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onNavigateToStatistics}
              className="px-3.5 py-2 rounded-lg border border-slate-700 hover:border-slate-500 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
            >
              ดูกราฟสถิติ & กรองเลข
            </button>
            <button
              type="button"
              onClick={onResetDraws}
              className="px-3.5 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ตฐานข้อมูลเริ่มต้น</span>
            </button>
          </div>
        </div>

        {/* Strict Validation Rule Banner */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 flex items-start gap-3 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-white">
              กฎตรวจสอบ Strict 4D Parsing Validation ({meta.shortName})
            </div>
            <p className="text-slate-400">
              {meta.strictParsingRule} · ข้อมูลทั้งหมดต้องผ่านการตรวจสอบว่าเป็นตัวเลข 4 หลัก (0000–9999) เท่านั้นก่อนอัปเดตกราฟและระบบคัดกรอง
            </p>
          </div>
        </div>

        {/* 3-Mode Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('auto')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              mode === 'auto'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>1. ดึงข้อมูลอัตโนมัติ (Google Search)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              mode === 'text'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>2. คัดกรองข้อความอัจฉริยะ (JSON Schema)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('image')}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              mode === 'image'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span>3. สแกนจากรูปภาพ (Image OCR)</span>
          </button>
        </div>
      </div>

      {/* MODE 1: Auto-Fetch via Google Search Grounding */}
      {mode === 'auto' && (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-5">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                ประเภทหวยที่ต้องการค้นหา
              </label>
              <div className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white font-medium">
                {meta.name} ({meta.countryName})
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                จำนวนงวดย้อนหลัง
              </label>
              <select
                value={fetchCount}
                onChange={(e) => setFetchCount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              >
                <option value={10}>10 งวดล่าสุด</option>
                <option value={20}>20 งวดล่าสุด</option>
                <option value={35}>35 งวดล่าสุด</option>
                <option value={50}>50 งวดล่าสุด</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <button
                type="button"
                onClick={handleAutoFetch}
                disabled={isFetchingAuto}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isFetchingAuto ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังค้นหาผ่าน Google Search...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>ดึงข้อมูลอัตโนมัติ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {autoError && (
            <div className="rounded-xl bg-rose-950/40 border border-rose-500/40 p-4 text-xs text-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{autoError}</span>
            </div>
          )}

          {autoSuccessMsg && (
            <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-4 text-xs text-emerald-200 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{autoSuccessMsg}</span>
            </div>
          )}

          {/* 10-Draw Visual Audit Confirmation Table */}
          {autoCandidates.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    ตรวจสอบความถูกต้องด้วยตาเปล่า (แสดง {Math.min(10, autoCandidates.length)} งวดล่าสุด จากทั้งหมด {autoCandidates.length} งวดที่ดึงได้)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ตรวจสอบเลข 4 หลักท้ายของรางวัลหลักให้ตรงกับผลจริง หากต้องการแก้ตัวเลขสามารถพิมพ์แก้ในช่องได้ทันทีก่อนกดยืนยัน
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => confirmImportCandidates(autoCandidates, 'gemini-search')}
                  disabled={isImporting || autoCandidates.filter((c) => c.selected).length === 0}
                  className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    ยืนยันนำเข้า {autoCandidates.filter((c) => c.selected).length} งวดสู่ฐานสถิติ
                  </span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">เลือก</th>
                      <th className="px-3 py-2.5">งวดวันที่</th>
                      <th className="px-3 py-2.5">รางวัลหลักที่ค้นพบ</th>
                      <th className="px-3 py-2.5">เลข 4 ตัวท้าย (แก้ไขได้)</th>
                      <th className="px-3 py-2.5">สถานะ Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {autoCandidates.slice(0, 10).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleCandidateSelection(setAutoCandidates, item.id)}
                            className="accent-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-slate-200 font-medium">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{item.drawDate}</span>
                            <input
                              type="date"
                              value={item.dateIso}
                              onChange={(e) => updateCandidateDate(setAutoCandidates, item.id, e.target.value)}
                              aria-label={`แก้ไขวันที่งวด ${item.drawDate}`}
                              className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-400">
                          {item.rawPrize || '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            maxLength={4}
                            value={item.number4D}
                            onChange={(e) =>
                              updateCandidateNumber(setAutoCandidates, item.id, e.target.value)
                            }
                            className="w-24 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 font-mono text-sm font-bold text-amber-300 tracking-widest focus:outline-none focus:border-amber-400"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          {item.isValid4D ? (
                            <span className="text-emerald-400 font-medium">
                              ผ่าน (0000-9999){item.validationNote ? ` · ${item.validationNote}` : ''}
                            </span>
                          ) : (
                            <span className="text-rose-400 font-medium">ไม่ครบ 4 หลัก</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {groundingSources.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <div className="text-xs font-medium text-slate-400">
                    แหล่งอ้างอิงจาก Google Search Grounding:
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {groundingSources.map((src, idx) => (
                      <a
                        key={`${src.uri}-${idx}`}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:text-sky-300 underline inline-flex items-center gap-1"
                      >
                        <span>{src.title}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: Smart Text Cleaner */}
      {mode === 'text' && (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">
              วางข้อความดิบจากเว็บ ข่าว หรือตารางสถิติ ({meta.name})
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              AI จะสกัดเฉพาะเลข 4 หลักท้ายของรางวัลหลักด้วย Gemini Structured Output และบันทึกลงฐานข้อมูลทันที
            </p>
          </div>

          <textarea
            rows={7}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`ตัวอย่าง: วางข้อความปนวันที่หรือผลรางวัล เช่น\nงวด 25 พ.ย. 69 ลาวพัฒนา รางวัลที่ 1 = 834286 เลขท้าย 2 ตัว 86\nงวด 22 พ.ย. 69 รางวัลหลัก 195724 ...\nหรือวางตารางสถิติทั้งหมดจากหน้าเว็บได้เลย`}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs sm:text-sm text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-amber-400"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              ระบบจะตัดข้อความขยะ วันที่ และเลข 2-3 ตัวออกอัตโนมัติ เหลือเฉพาะ 0000-9999
            </span>
            <button
              type="button"
              onClick={handleCleanText}
              disabled={isCleaningText || !rawText.trim()}
              className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isCleaningText ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI กำลังกลั่นกรองตัวเลข...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>ให้ AI กลั่นกรองตัวเลข</span>
                </>
              )}
            </button>
          </div>

          {textError && (
            <div className="rounded-xl bg-rose-950/40 border border-rose-500/40 p-4 text-xs text-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{textError}</span>
            </div>
          )}

          {textExtractedResult && (
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/40 p-4 space-y-2 text-xs">
              <div className="font-semibold text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  สกัดตัวเลข 4 หลักได้ {textExtractedResult.extractedCount} ชุด (เพิ่มงวดใหม่ {textExtractedResult.addedCount} งวด) และอัปเดตสถิติเรียบร้อยแล้ว
                </span>
              </div>
              <div className="flex flex-wrap gap-2 font-mono text-sm text-amber-300 pt-1">
                {textExtractedResult.numbers.map((num, idx) => (
                  <span key={`${num}-${idx}`} className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">
                    {num}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: Image / Screenshot OCR */}
      {mode === 'image' && (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                อัปโหลดรูปภาพตารางสถิติหวย (JPG / PNG)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Gemini Multimodal จะอ่านตัวเลข 4 หลักทั้งหมดจากรูปภาพและแสดงตัวอย่างให้คุณยืนยันก่อนบันทึก
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-lg border border-slate-700 hover:border-amber-400 text-slate-200 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>เลือกรูปภาพ</span>
              </button>

              <button
                type="button"
                onClick={handleScanImage}
                disabled={!imageBase64 || isScanningImage}
                className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isScanningImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังอ่านรูปภาพ...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    <span>สแกนตัวเลข 4 หลัก</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {imagePreviewUrl && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-5 rounded-xl bg-slate-950 border border-slate-800 p-3">
                <img
                  src={imagePreviewUrl}
                  alt="ตัวอย่างรูปภาพตารางสถิติหวย"
                  className="w-full max-h-80 object-contain rounded-lg"
                />
              </div>

              <div className="lg:col-span-7 space-y-3">
                {ocrError && (
                  <div className="rounded-xl bg-rose-950/40 border border-rose-500/40 p-4 text-xs text-rose-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{ocrError}</span>
                  </div>
                )}

                {ocrSuccessMsg && (
                  <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/40 p-4 text-xs text-emerald-200 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{ocrSuccessMsg}</span>
                  </div>
                )}

                {ocrCandidates.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        ตัวอย่างเลข 4 หลักที่สแกนได้ ({ocrCandidates.length} ชุด) — ตรวจสอบและกดยืนยัน
                      </span>
                      <button
                        type="button"
                        onClick={() => confirmImportCandidates(ocrCandidates, 'image-ocr')}
                        disabled={isImporting}
                        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>ยืนยันนำเข้า ({ocrCandidates.filter((c) => c.selected).length})</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                      {ocrCandidates.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => toggleCandidateSelection(setOcrCandidates, item.id)}
                              className="accent-emerald-500"
                            />
                            <input
                              type="text"
                              maxLength={4}
                              value={item.number4D}
                              onChange={(e) =>
                                updateCandidateNumber(setOcrCandidates, item.id, e.target.value)
                              }
                              className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono font-bold text-amber-300 text-center focus:outline-none focus:border-amber-400"
                            />
                          </div>
                          <input
                            type="date"
                            value={item.dateIso}
                            onChange={(e) => updateCandidateDate(setOcrCandidates, item.id, e.target.value)}
                            aria-label={`แก้ไขวันที่ ${item.drawDate}`}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Quick Add + Latest Stored Draws Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleManualAdd}
          className="lg:col-span-4 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-4"
        >
          <h3 className="text-sm font-semibold text-white">เพิ่มเลข 4 หลักด้วยตนเอง (1 งวด)</h3>
          <div>
            <label className="block text-xs text-slate-400 mb-1">เลข 4 หลัก (0000 - 9999)</label>
            <input
              type="text"
              maxLength={4}
              value={manualNumber}
              onChange={(e) => setManualNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="เช่น 5654"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 font-mono text-lg font-bold tracking-widest text-amber-300 focus:outline-none focus:border-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">วันที่งวด (ถ้าเว้นว่างใช้วันนี้)</label>
            <input
              type="text"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
              placeholder="เช่น 27 พฤศจิกายน 2569"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>
          {manualError && <p className="text-xs text-rose-400">{manualError}</p>}
          <button
            type="submit"
            disabled={isImporting}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>บันทึกเข้าฐานสถิติ {meta.shortName}</span>
          </button>
        </form>

        <div className="lg:col-span-8 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-white">
              ฐานข้อมูลล่าสุดในระบบ ({meta.name} · แสดง 12 จาก {draws.length} งวด)
            </h3>
            <span className="text-xs text-slate-400">เรียงจากงวดใหม่สุดไปเก่าสุด</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2 pr-3">งวดวันที่</th>
                  <th className="py-2 pr-3">วัน</th>
                  <th className="py-2 pr-3">รางวัลหลัก</th>
                  <th className="py-2 pr-3">เลข 4 หลักที่ใช้คำนวณ</th>
                  <th className="py-2 text-right">แหล่งที่มา</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {draws.slice(0, 12).map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/30">
                    <td className="py-2 pr-3 text-slate-200 font-medium">{d.drawDate}</td>
                    <td className="py-2 pr-3 text-slate-400">{d.dayOfWeek}</td>
                    <td className="py-2 pr-3 font-mono text-slate-500">{d.rawPrize || d.number4D}</td>
                    <td className="py-2 pr-3 font-mono font-bold text-amber-300 text-sm tracking-wider">
                      {d.number4D}
                    </td>
                    <td className="py-2 text-right text-slate-400">{d.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
