import React, { useEffect, useRef, useState } from 'react';
import { AIPredictionResult } from '../types/lottery';
import { renderLotteryCardToCanvas } from '../utils/canvasCard';
import { Download, X, Copy, Check, Sparkles, Image as ImageIcon } from 'lucide-react';

interface LotteryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  prediction: AIPredictionResult;
}

export const LotteryCardModal: React.FC<LotteryCardModalProps> = ({
  isOpen,
  onClose,
  prediction
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [watermark, setWatermark] = useState('AI Lottery Deep Analysis • แม่นยำ 94%');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current && prediction) {
      renderLotteryCardToCanvas(canvasRef.current, prediction, watermark);
    }
  }, [isOpen, prediction, watermark]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `AI-หวยแม่นยำ-${prediction.drawDate.replace(/\s+/g, '-')}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white">
              การ์ดรูปภาพสรุปตัวเลข AI (Lottery Fortune Card)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas Display */}
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex justify-center">
          <canvas
            ref={canvasRef}
            className="w-full max-w-sm h-auto rounded-xl shadow-lg border border-slate-800"
          />
        </div>

        {/* Watermark customization */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            ข้อความลายน้ำด้านล่างรูป (Watermark / Footer)
          </label>
          <input
            type="text"
            value={watermark}
            onChange={(e) => setWatermark(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
          >
            ปิด
          </button>
          <button
            onClick={handleDownload}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{downloadSuccess ? 'ดาวน์โหลดเสร็จสิ้น!' : 'ดาวน์โหลดรูปภาพ (1080x1080 PNG)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
