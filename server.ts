import express, { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  LOTTERY_4D_LIST,
  LOTTERY_4D_META_MAP,
  build4DPredictionSummary,
  getAllDefault4DStore,
  getDefault4DDraws,
  getNextDrawInfo4D,
  getScheduledDrawDateStepBack,
  validateStrict4DNumber
} from './src/data/lottery4DDatabase.ts';
import { THAI_DAY_NAMES, THAI_MONTH_NAMES } from './src/data/lotteryHistory.ts';
import {
  DrawImportSource,
  GroundingSourceLink,
  Lottery4DType,
  LotteryDraw4D,
  PostDrawScorecard,
  TelegramConfig
} from './src/types/lottery.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'thai-lotto-4d-data')
  : path.resolve(__dirname, '.data');
const STORE_FILE = path.join(DATA_DIR, 'app-4d-store.json');

export const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize @google/genai server-side client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

function parseSafeLotteryType(raw?: unknown): Lottery4DType {
  if (
    raw === 'lao' ||
    raw === 'malay' ||
    raw === 'vietnam' ||
    raw === 'thai' ||
    raw === 'baac' ||
    raw === 'gsb'
  ) {
    return raw;
  }
  return 'lao';
}

// Persistent 4D Draw Database Store
let drawsStore: Record<Lottery4DType, LotteryDraw4D[]> = getAllDefault4DStore();

// Persistent Telegram Group Alert Config & Logs
let telegramConfig: TelegramConfig = {
  isTelegramEnabled: true,
  scheduleMode: 'per_lottery_offset',
  minutesBeforeDraw: 90,
  daysBeforeDraw: 0,
  notifyTime: '15:00',
  botToken: '',
  chatId: '',
  messageThreadId: '',
  pinMessage: false,
  disableNotification: false,
  includeSniperSets: true,
  includeDefensiveScaling: true,
  includeBackups: true,
  lotteryTypes: ['lao', 'malay', 'vietnam', 'thai', 'baac', 'gsb'],
  lastNotifiedDraw: '',
  lastNotifiedByLottery: {}
};

interface TelegramLogItem {
  id: string;
  timestamp: string;
  drawDate: string;
  message: string;
  status: 'sent' | 'scheduled' | 'failed' | 'simulated';
  chatSummary?: string;
  telegramMessageId?: number;
  errorMessage?: string;
}

let telegramLogs: TelegramLogItem[] = [
  {
    id: 'tg-4d-init-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    drawDate: '25 พฤศจิกายน 2569',
    message:
      '📣 แจ้งเตือน Super Number 4 ตัว [หวยชุด 4 ประเทศ]\n🎯 ลาวพัฒนา: Super Number 4D [ 4286 ] · เต็มพอร์ต 4 ชุด',
    status: 'simulated',
    chatSummary: 'โหมดจำลอง (Telegram Group)'
  }
];

const KV_STORE_KEY = 'thai_lotto_4d_store_v1';

function getKvConfig(): { url: string; token: string } | null {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!url || !token) return null;
  return { url, token };
}

function applyParsedStore(parsed: any) {
  if (!parsed || typeof parsed !== 'object') return;
  if (parsed.drawsStore && typeof parsed.drawsStore === 'object') {
    for (const t of ['lao', 'malay', 'vietnam', 'thai', 'baac', 'gsb'] as Lottery4DType[]) {
      if (Array.isArray(parsed.drawsStore[t]) && parsed.drawsStore[t].length > 0) {
        drawsStore[t] = parsed.drawsStore[t].filter((d: any) => /^\d{4}$/.test(d?.number4D));
      }
    }
  }
  if (parsed.telegramConfig && typeof parsed.telegramConfig === 'object') {
    telegramConfig = { ...telegramConfig, ...parsed.telegramConfig };
  }
  if (Array.isArray(parsed.telegramLogs)) {
    telegramLogs = parsed.telegramLogs;
  }
}

function loadPersistedStore() {
  try {
    if (!fs.existsSync(STORE_FILE)) return;
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    if (!raw.trim()) return;
    applyParsedStore(JSON.parse(raw));
    console.log(`[Store] Loaded persisted 4D store from ${STORE_FILE}`);
  } catch (err: any) {
    console.warn('[Store] Failed to load persisted 4D store:', err?.message);
  }
}

async function loadRemoteKvStore(): Promise<void> {
  const kv = getKvConfig();
  if (!kv) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${kv.url}/get/${encodeURIComponent(KV_STORE_KEY)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${kv.token}` },
      signal: controller.signal
    });
    if (!res.ok) return;
    const data: any = await res.json().catch(() => null);
    if (!data || data.result == null) return;
    const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    applyParsedStore(parsed);
    console.log('[Store] Hydrated 4D store from Remote KV');
  } catch (err: any) {
    console.warn('[Store] Failed to hydrate from Remote KV:', err?.message);
  } finally {
    clearTimeout(timer);
  }
}

let storeHydratedPromise: Promise<void> | null = null;

async function ensureStoreHydrated(): Promise<void> {
  if (!getKvConfig()) return;
  if (!storeHydratedPromise) {
    storeHydratedPromise = loadRemoteKvStore().catch(() => {
      storeHydratedPromise = null;
    });
  }
  await storeHydratedPromise;
}

async function saveRemoteKvStore(payloadStr: string): Promise<void> {
  const kv = getKvConfig();
  if (!kv) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(kv.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kv.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['SET', KV_STORE_KEY, payloadStr]),
      signal: controller.signal
    });
    if (!res.ok) {
      console.warn(`[Store] Remote KV save HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.warn('[Store] Failed to save Remote KV store:', err?.message);
  } finally {
    clearTimeout(timer);
  }
}

async function savePersistedStore(): Promise<void> {
  const payloadStr = JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      drawsStore,
      telegramConfig,
      telegramLogs: telegramLogs.slice(0, 100)
    },
    null,
    2
  );

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${STORE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, payloadStr, 'utf-8');
    fs.renameSync(tmpFile, STORE_FILE);
  } catch (err: any) {
    console.warn('[Store] Failed to persist local 4D store:', err?.message);
  }

  await saveRemoteKvStore(payloadStr);
}

loadPersistedStore();

// Security: timing-safe secret comparison & header extraction
function timingSafeEqualStr(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const hashA = crypto.createHash('sha256').update(provided).digest();
  const hashB = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function extractProvidedSecret(req: Request, headerNames: string[], allowQuery = false): string {
  const auth = req.get('authorization') || '';
  if (/^bearer\s+/i.test(auth)) {
    return auth.replace(/^bearer\s+/i, '').trim();
  }
  for (const h of headerNames) {
    const val = (req.get(h) || '').trim();
    if (val) return val;
  }
  if (allowQuery && typeof req.query.secret === 'string') {
    return req.query.secret.trim();
  }
  return '';
}

function isAdminAuthorized(req: Request): boolean {
  const expected = (process.env.ADMIN_API_SECRET || '').trim();
  if (!expected) return true;
  const provided = extractProvidedSecret(req, ['x-admin-secret'], false);
  return timingSafeEqualStr(provided, expected);
}

function requireAdminSecret(req: Request, res: Response, next: NextFunction) {
  if (!isAdminAuthorized(req)) {
    return res.status(401).json({
      success: false,
      error: 'จำเป็นต้องยืนยันรหัส Admin Passcode (ADMIN_API_SECRET) ก่อนบันทึกหรือส่งข้อความ'
    });
  }
  next();
}

function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const expected = (process.env.CRON_SECRET || '').trim();
  if (!expected) return next();
  const provided = extractProvidedSecret(req, ['x-cron-secret'], true);
  if (!timingSafeEqualStr(provided, expected)) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized cron request'
    });
  }
  next();
}

app.use('/api', async (req: Request, _res: Response, next: NextFunction) => {
  if (req.path !== '/health') {
    await ensureStoreHydrated();
  }
  next();
});

function formatGeminiError(err: any): { status: number; message: string } {
  const msg = String(err?.message || err || 'Gemini API error');
  if (msg.includes('GEMINI_API_KEY') || msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
    return {
      status: 400,
      message:
        'ไม่พบหรือยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Settings > Secrets (หรือ Environment Variables บน Vercel) กรุณาตรวจสอบก่อนใช้งาน AI Smart Data Extractor'
    };
  }
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
    return {
      status: 429,
      message: 'โควตา Gemini API ชั่วคราวเต็ม (429) กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
    };
  }
  return { status: 500, message: `Gemini API Error: ${msg}` };
}

function stripJsonMarkdown(text: string): string {
  const trimmed = (text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) return fenced[1].trim();
  const arrStart = trimmed.indexOf('[');
  const arrEnd = trimmed.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) {
    return trimmed.slice(arrStart, arrEnd + 1);
  }
  const objStart = trimmed.indexOf('{');
  const objEnd = trimmed.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    return trimmed.slice(objStart, objEnd + 1);
  }
  return trimmed;
}

function normalizeDateFields(
  lotteryType: Lottery4DType,
  rawDate?: string,
  rawIso?: string,
  idxFallback = 0
) {
  let dateIso = (rawIso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    dateIso = getScheduledDrawDateStepBack(lotteryType, idxFallback, new Date());
  }
  const parsed = new Date(`${dateIso}T12:00:00Z`);
  const dayOfWeek = !Number.isNaN(parsed.getTime())
    ? THAI_DAY_NAMES[parsed.getUTCDay()]
    : 'วันพุธ';
  const drawDate =
    rawDate && rawDate.trim()
      ? rawDate.trim()
      : !Number.isNaN(parsed.getTime())
        ? `${parsed.getUTCDate()} ${THAI_MONTH_NAMES[parsed.getUTCMonth()]} ${parsed.getUTCFullYear() + 543}`
        : dateIso;

  return { dateIso, drawDate, dayOfWeek };
}

async function mergeDrawsIntoStore(
  lotteryType: Lottery4DType,
  incoming: Array<{ drawDate?: string; dateIso?: string; dayOfWeek?: string; number4D: string; rawPrize?: string }>,
  source: DrawImportSource
): Promise<{ addedCount: number; updatedDraws: LotteryDraw4D[] }> {
  const existing = [...(drawsStore[lotteryType] || getDefault4DDraws(lotteryType))];
  const byKey = new Map<string, LotteryDraw4D>();

  for (const item of existing) {
    byKey.set(`${item.dateIso}:${item.number4D}`, item);
  }

  let addedCount = 0;
  incoming.forEach((raw, idx) => {
    const check = validateStrict4DNumber(raw.number4D, raw.rawPrize);
    if (!check.valid) return;

    const { dateIso, drawDate, dayOfWeek } = normalizeDateFields(lotteryType, raw.drawDate, raw.dateIso, idx);
    const key = `${dateIso}:${check.number4D}`;
    if (!byKey.has(key)) {
      addedCount++;
    }
    byKey.set(key, {
      id: `${lotteryType}-${dateIso}-${check.number4D}`,
      lotteryType,
      drawDate,
      dateIso,
      dayOfWeek: raw.dayOfWeek || dayOfWeek,
      number4D: check.number4D,
      rawPrize: raw.rawPrize,
      source
    });
  });

  const sorted = Array.from(byKey.values()).sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  drawsStore[lotteryType] = sorted;
  await savePersistedStore();
  return { addedCount, updatedDraws: sorted };
}

// ================= 4D DATABASE & GEMINI SMART DATA EXTRACTOR ROUTES =================

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Get current 4D draws for a country
app.get('/api/4d/draws', (req: Request, res: Response) => {
  const lotteryType = parseSafeLotteryType(req.query.lotteryType);
  const draws = drawsStore[lotteryType] || getDefault4DDraws(lotteryType);
  res.json({
    success: true,
    lotteryType,
    draws
  });
});

// Import verified 4D draws (from Auto-Fetch 10-draw audit or Image OCR preview)
app.post('/api/4d/draws/import', async (req: Request, res: Response) => {
  try {
    const lotteryType = parseSafeLotteryType(req.body?.lotteryType);
    const source: DrawImportSource =
      req.body?.source === 'gemini-search' ||
      req.body?.source === 'text-cleaner' ||
      req.body?.source === 'image-ocr' ||
      req.body?.source === 'manual'
        ? req.body.source
        : 'manual';

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ success: false, error: 'ไม่มีรายการตัวเลข 4 หลักสำหรับนำเข้า' });
    }

    const validItems = items.filter((item: any) => validateStrict4DNumber(item?.number4D, item?.rawPrize).valid);
    if (validItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'ไม่พบตัวเลข 4 หลักที่ถูกต้อง (ต้องเป็นตัวเลข 0000-9999 เท่านั้น)'
      });
    }

    const { addedCount, updatedDraws } = await mergeDrawsIntoStore(lotteryType, validItems, source);
    return res.json({
      success: true,
      lotteryType,
      addedCount,
      totalDraws: updatedDraws.length,
      draws: updatedDraws
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Import failed' });
  }
});

// Reset draws back to default 200-draw archive
app.post('/api/4d/draws/reset', async (req: Request, res: Response) => {
  const lotteryType = parseSafeLotteryType(req.body?.lotteryType);
  drawsStore[lotteryType] = [...getDefault4DDraws(lotteryType)];
  await savePersistedStore();
  return res.json({
    success: true,
    lotteryType,
    draws: drawsStore[lotteryType]
  });
});

// MODE 1: Auto-Fetch via Google Search Grounding (Strict 4D Parsing Validation + 10-draw visual audit preview)
app.post('/api/4d/extract/auto-fetch', async (req: Request, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Settings > Secrets สำหรับใช้ Google Search Grounding'
      });
    }

    const lotteryType = parseSafeLotteryType(req.body?.lotteryType);
    const count = Math.min(50, Math.max(5, Number(req.body?.count) || 20));
    const meta = LOTTERY_4D_META_MAP[lotteryType];

    const prompt = `ค้นหาผลรางวัลงวดย้อนหลังจริงของ "${meta.name}" (${meta.countryName}) จำนวน ${count} งวดล่าสุด เรียงลำดับจากงวดล่าสุดไปเก่าสุด

กฎ Strict 4D Parsing Validation (ห้ามผิดพลาดเด็ดขาด):
- ${meta.strictParsingRule}
- ห้ามดึงเลข 4 ตัวหน้า, ห้ามดึงเลข 3 ตัวหน้า/ท้าย, และห้ามดึงรางวัลข้างเคียง
- ตัวเลข 4 หลัก (number4D) ต้องเป็นตัวเลข 0000-9999 จำนวน 4 ตัวตรงเป๊ะเท่านั้น

กรุณาส่งผลลัพธ์เป็น JSON Array เท่านั้น (ไม่ต้องมีข้อความอธิบายอื่น) โดยแต่ละ element มีรูปแบบ:
{
  "drawDate": "วันที่งวด เช่น 25 พฤศจิกายน 2569",
  "dateIso": "YYYY-MM-DD (ค.ศ.)",
  "rawPrize": "เลขรางวัลหลักเต็ม (เช่น 6 หลักสำหรับไทย หรือ 5 หลักสำหรับฮานอย)",
  "number4D": "เลขท้าย 4 ตัวของรางวัลหลักเท่านั้น เช่น 5654"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a strict lottery data extractor. Use Google Search to verify actual recent draws. Return ONLY a valid JSON array with exact 4-digit strings in number4D taken strictly from the LAST 4 digits of the primary prize.',
        tools: [{ googleSearch: {} }]
      }
    });

    const rawText = stripJsonMarkdown(response.text || '[]');
    let parsedList: any[] = [];
    try {
      const parsed = JSON.parse(rawText);
      parsedList = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.draws) ? parsed.draws : [];
    } catch {
      return res.status(422).json({
        success: false,
        error: 'AI ค้นหาข้อมูลแล้วแต่ไม่สามารถแปลงเป็น JSON 4 หลักได้ กรุณาลองกดดึงข้อมูลอีกครั้ง'
      });
    }

    const candidates = parsedList
      .map((item, idx) => {
        const validation = validateStrict4DNumber(String(item?.number4D || ''), String(item?.rawPrize || ''));
        const { dateIso, drawDate, dayOfWeek } = normalizeDateFields(lotteryType, item?.drawDate, item?.dateIso, idx);
        return {
          id: `fetch-${lotteryType}-${dateIso}-${idx}`,
          drawDate,
          dateIso,
          dayOfWeek,
          rawPrize: item?.rawPrize ? String(item.rawPrize).replace(/\D/g, '') : undefined,
          number4D: validation.number4D,
          isValid4D: validation.valid,
          validationNote: validation.note,
          selected: validation.valid
        };
      })
      .filter((c) => c.number4D.length > 0);

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingSources: GroundingSourceLink[] = groundingChunks
      .map((c: any) => c?.web)
      .filter((w: any) => w?.uri)
      .map((w: any) => ({
        title: String(w.title || w.uri),
        uri: String(w.uri)
      }))
      .slice(0, 6);

    return res.json({
      success: true,
      lotteryType,
      candidates,
      groundingSources
    });
  } catch (err: any) {
    const formatted = formatGeminiError(err);
    return res.status(formatted.status).json({ success: false, error: formatted.message });
  }
});

// AUTO-VERIFY LATEST DRAW: Fetch the single latest draw via Google Search Grounding & auto-merge into store
app.post('/api/4d/verify-latest', async (req: Request, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY สำหรับตรวจผลรางวัลล่าสุดอัตโนมัติ'
      });
    }

    const lotteryType = parseSafeLotteryType(req.body?.lotteryType);
    const meta = LOTTERY_4D_META_MAP[lotteryType];

    const prompt = `ค้นหาผลรางวัล "งวดล่าสุดที่ออกแล้ว" ของ "${meta.name}" (${meta.countryName}) จำนวน 3 งวดล่าสุด เรียงจากงวดล่าสุดไปเก่าสุด
กฎ Strict 4D Parsing Validation:
- ${meta.strictParsingRule}
- ส่งกลับเป็น JSON Array ที่มี object รูปแบบ: {"drawDate": "วันที่งวด", "dateIso": "YYYY-MM-DD", "rawPrize": "เลขรางวัลหลักเต็ม", "number4D": "เลข 4 ตัวท้ายตรงเป๊ะ (0000-9999)"} เท่านั้น`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a strict lottery result verifier. Use Google Search to get the latest official draw result. Return ONLY a JSON array.',
        tools: [{ googleSearch: {} }]
      }
    });

    const rawText = stripJsonMarkdown(response.text || '[]');
    let parsedList: any[] = [];
    try {
      const parsed = JSON.parse(rawText);
      parsedList = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.draws) ? parsed.draws : [];
    } catch {
      return res.status(422).json({
        success: false,
        error: 'ไม่สามารถแปลงผลตรวจรางวัลงวดล่าสุดเป็น JSON 4 หลักได้ กรุณาลองอีกครั้ง'
      });
    }

    const validItems = parsedList
      .map((item: any, idx: number) => {
        const check = validateStrict4DNumber(String(item?.number4D || ''), String(item?.rawPrize || ''));
        if (!check.valid) return null;
        const { dateIso, drawDate, dayOfWeek } = normalizeDateFields(lotteryType, item?.drawDate, item?.dateIso, idx);
        return {
          drawDate,
          dateIso,
          dayOfWeek,
          rawPrize: item?.rawPrize ? String(item.rawPrize).replace(/\D/g, '') : undefined,
          number4D: check.number4D
        };
      })
      .filter(Boolean) as Array<{
      drawDate: string;
      dateIso: string;
      dayOfWeek: string;
      rawPrize?: string;
      number4D: string;
    }>;

    if (validItems.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'ไม่พบผลรางวัล 4 หลักที่ผ่านเกณฑ์ตรวจสอบสำหรับงวดล่าสุด'
      });
    }

    // Build honest pre-draw prediction scorecard BEFORE merging the new result
    const latest = validItems[0];
    const priorDraws = [...(drawsStore[lotteryType] || getDefault4DDraws(lotteryType))];
    const priorHistory = priorDraws.filter((d) => d.dateIso !== latest.dateIso);
    const priorPred = build4DPredictionSummary(
      priorHistory.length >= 10 ? priorHistory : priorDraws,
      lotteryType
    );

    const actual4D = latest.number4D;
    const actual3D = actual4D.slice(-3);
    const actual2D = actual4D.slice(-2);

    const digitOverlap = (a: string, b: string) => {
      const counts: Record<string, number> = {};
      for (const ch of b) counts[ch] = (counts[ch] || 0) + 1;
      let hit = 0;
      for (const ch of a) {
        if (counts[ch] && counts[ch] > 0) {
          hit++;
          counts[ch]--;
        }
      }
      return hit;
    };

    const matchedSources = priorPred.sources22.filter((s) => {
      let posMatch = 0;
      for (let i = 0; i < 4; i++) {
        if (s.candidate4D[i] === actual4D[i]) posMatch++;
      }
      return posMatch >= 2 || digitOverlap(s.candidate4D, actual4D) >= 3;
    });

    let scorecard: PostDrawScorecard;
    if (priorPred.strategyMode === 'win4_3d') {
      const focusSets = priorPred.win4Breakdown.threeDigitStraightSets;
      const all24 = priorPred.win4Breakdown.threeDigitStraight24Sets;
      const dblHedge = priorPred.win4Breakdown.threeDigitDoubleHedgeSets;
      const inFocus = focusSets.includes(actual3D);
      const in24 = all24.includes(actual3D);
      const inHedge = dblHedge.includes(actual3D);
      const in2D = priorPred.win4Breakdown.twoDigitNoDouble12.includes(actual2D) ||
        priorPred.win4Breakdown.twoDigitDoubles4.includes(actual2D);
      const bestOverlap = Math.max(...focusSets.map((f) => digitOverlap(f, actual3D)), 0);

      let hitStatus: PostDrawScorecard['hitStatus'] = 'miss';
      let hitMessage = `งวดนี้หลุดกรอบวิน 4 ตัว [${priorPred.win4Breakdown.coreDigits4.join('-')}] (ระบบบันทึกผลและปรับน้ำหนัก 22 แหล่งแล้ว)`;

      if (inFocus) {
        hitStatus = 'exact_focus';
        hitMessage = `เข้าเป้าเต็ม! 3 ตัวท้าย ${actual3D} ตรงกับ 4 ชุดเน้นหลัก (${focusSets.join(' · ')})`;
      } else if (in24) {
        hitStatus = 'hit_24';
        hitMessage = `เข้าวิน 24 ชุด! 3 ตัวท้าย ${actual3D} อยู่ในชุดแตก 3 ตัว 24 ชุดจากแกน [${priorPred.win4Breakdown.coreDigits4.join('-')}]`;
      } else if (inHedge) {
        hitStatus = 'hit_24';
        hitMessage = `เข้าชุดกันเบิ้ล/หาม! 3 ตัวท้าย ${actual3D} ตรงกับชุดกันเบิ้ลจากแกนวิน`;
      } else if (in2D) {
        hitStatus = 'hit_2d';
        hitMessage = `เข้า 2 ตัวท้าย ${actual2D} ในชุดวิน 2 ตัวประคองทุน`;
      } else if (bestOverlap >= 2) {
        hitStatus = 'near_miss';
        hitMessage = `เฉียดเข้าใกล้ (Near-Miss): แกนวิน [${priorPred.win4Breakdown.coreDigits4.join('-')}] ติดตรง 2 ใน 3 หลักของ ${actual3D}`;
      }

      scorecard = {
        drawDate: latest.drawDate,
        actual4D,
        actual3D,
        predictedHeadline: `แกน [${priorPred.win4Breakdown.coreDigits4.join('-')}] · เน้น ${priorPred.win4Breakdown.megaThreeStraight}`,
        predictedSets: focusSets,
        hitStatus,
        hitMessage,
        matchedSourcesCount22: matchedSources.length,
        topMatchedSources: matchedSources.slice(0, 4).map((s) => `${s.sourceName} (${s.candidate4D})`)
      };
    } else {
      const sniperNums = priorPred.sniperSets.map((s) => s.number4D);
      const exact4D = sniperNums.includes(actual4D) || priorPred.superNumber4D === actual4D;
      const toad4D = sniperNums.some((s) => s.split('').sort().join('') === actual4D.split('').sort().join(''));
      const hit3Back = sniperNums.some((s) => s.slice(-3) === actual3D);
      const hit2Back = priorPred.backupTwoBack.includes(actual2D) || sniperNums.some((s) => s.slice(-2) === actual2D);
      const bestOverlap = Math.max(...sniperNums.map((s) => digitOverlap(s, actual4D)), 0);

      let hitStatus: PostDrawScorecard['hitStatus'] = 'miss';
      let hitMessage = `งวดนี้ยังไม่เข้าชุดหลัก (ระบบบันทึกผล ${actual4D} และปรับน้ำหนัก Adaptive 22 แหล่งเรียบร้อย)`;

      if (exact4D) {
        hitStatus = 'hit_4d';
        hitMessage = `เข้า 4 ตัวตรง! ผลจริง ${actual4D} ตรงกับชุด Diverse Sniper / Super 4D`;
      } else if (toad4D || hit3Back) {
        hitStatus = 'exact_focus';
        hitMessage = toad4D
          ? `เข้า 4 ตัวโต๊ด! ชุด Sniper มีเลขครบ 4 หลักของผลจริง ${actual4D}`
          : `เข้า 3 ตัวท้าย ${actual3D}! ตรง 3 หลักท้ายจากชุด Sniper 4D`;
      } else if (hit2Back) {
        hitStatus = 'hit_2d';
        hitMessage = `เข้า 2 ตัวท้าย ${actual2D} ในชุด Sniper / 2 ตัวประคองพอร์ต`;
      } else if (bestOverlap >= 3) {
        hitStatus = 'near_miss';
        hitMessage = `เฉียดเข้าใกล้ (Near-Miss 3/4 หลัก): ชุด Sniper ติดตัวเลขหลักของ ${actual4D} ถึง 3 ตัว`;
      }

      scorecard = {
        drawDate: latest.drawDate,
        actual4D,
        actual3D,
        predictedHeadline: `Super ${priorPred.superNumber4D}`,
        predictedSets: sniperNums,
        hitStatus,
        hitMessage,
        matchedSourcesCount22: matchedSources.length,
        topMatchedSources: matchedSources.slice(0, 4).map((s) => `${s.sourceName} (${s.candidate4D})`)
      };
    }

    const { addedCount, updatedDraws } = await mergeDrawsIntoStore(lotteryType, validItems, 'gemini-search');
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingSources: GroundingSourceLink[] = groundingChunks
      .map((c: any) => c?.web)
      .filter((w: any) => w?.uri)
      .map((w: any) => ({
        title: String(w.title || w.uri),
        uri: String(w.uri)
      }))
      .slice(0, 4);

    return res.json({
      success: true,
      lotteryType,
      addedCount,
      latestVerified: validItems[0],
      scorecard,
      draws: updatedDraws,
      groundingSources
    });
  } catch (err: any) {
    const formatted = formatGeminiError(err);
    return res.status(formatted.status).json({ success: false, error: formatted.message });
  }
});

// MODE 2: Smart Text Cleaner (Gemini Structured Output JSON Schema -> auto validate & save immediately)
app.post('/api/4d/extract/text', async (req: Request, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Settings > Secrets สำหรับใช้ AI กลั่นกรองข้อความ'
      });
    }

    const lotteryType = parseSafeLotteryType(req.body?.lotteryType);
    const rawText = String(req.body?.rawText || '').trim();
    if (!rawText) {
      return res.status(400).json({ success: false, error: 'กรุณาวางข้อความดิบก่อนกดให้ AI กลั่นกรองตัวเลข' });
    }

    const meta = LOTTERY_4D_META_MAP[lotteryType];

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `จงสกัดเอาเฉพาะชุดตัวเลข 4 หลักของรางวัลหลักสำหรับ "${meta.name}" จากข้อความด้านล่างนี้ (เรียงจากงวดล่าสุดไปเก่าสุด):
กฎ: ${meta.strictParsingRule}
ตัดข้อความขยะ วันที่ เวลา ราคา และรางวัล 2-3 ตัวที่ไม่เกี่ยวข้องทิ้งทั้งหมด หากรางวัลหลักมี 5-6 หลัก ให้เก็บ rawPrize เต็มไว้และตัดเอาเฉพาะ 4 หลักท้ายใส่ใน number4D

ข้อความดิบ:
${rawText}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedDraws: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drawDate: { type: Type.STRING, description: 'วันที่งวดถ้ามีในข้อความ เช่น 16 พฤศจิกายน 2569' },
                  dateIso: { type: Type.STRING, description: 'YYYY-MM-DD ถ้ามีในข้อความ' },
                  rawPrize: { type: Type.STRING, description: 'ตัวเลขรางวัลหลักเต็ม (ถ้ามี)' },
                  number4D: { type: Type.STRING, description: 'ตัวเลข 4 หลักท้ายของรางวัลหลักเท่านั้น (0000-9999)' }
                },
                required: ['number4D']
              }
            }
          },
          required: ['extractedDraws']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{"extractedDraws":[]}');
    const rawList = Array.isArray(parsed?.extractedDraws) ? parsed.extractedDraws : [];

    const validatedDraws = rawList
      .map((item: any, idx: number) => {
        const check = validateStrict4DNumber(String(item?.number4D || ''), String(item?.rawPrize || ''));
        if (!check.valid) return null;
        const { dateIso, drawDate, dayOfWeek } = normalizeDateFields(lotteryType, item?.drawDate, item?.dateIso, idx);
        return {
          drawDate,
          dateIso,
          dayOfWeek,
          rawPrize: item?.rawPrize ? String(item.rawPrize).replace(/\D/g, '') : undefined,
          number4D: check.number4D
        };
      })
      .filter(Boolean) as Array<{
      drawDate: string;
      dateIso: string;
      dayOfWeek: string;
      rawPrize?: string;
      number4D: string;
    }>;

    if (validatedDraws.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'ไม่พบชุดตัวเลข 4 หลัก (0000-9999) ที่ถูกต้องในข้อความที่วาง'
      });
    }

    const { addedCount, updatedDraws } = await mergeDrawsIntoStore(lotteryType, validatedDraws, 'text-cleaner');

    return res.json({
      success: true,
      lotteryType,
      extractedCount: validatedDraws.length,
      addedCount,
      extractedItems: validatedDraws,
      draws: updatedDraws
    });
  } catch (err: any) {
    const formatted = formatGeminiError(err);
    return res.status(formatted.status).json({ success: false, error: formatted.message });
  }
});

// MODE 3: Image/Screenshot OCR (Gemini Multimodal -> returns Preview candidates before saving)
app.post('/api/4d/extract/image', async (req: Request, res: Response) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Settings > Secrets สำหรับสแกนรูปภาพ OCR'
      });
    }

    const lotteryType = parseSafeLotteryType(req.body?.lotteryType);
    const imageBase64 = String(req.body?.imageBase64 || '').trim();
    const mimeType = String(req.body?.mimeType || 'image/png').trim();

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'กรุณาอัปโหลดรูปภาพตารางสถิติหวย (JPG/PNG)' });
    }

    const meta = LOTTERY_4D_META_MAP[lotteryType];

    const imagePart = {
      inlineData: {
        mimeType,
        data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
      }
    };
    const textPart = {
      text: `อ่านตัวเลขรางวัลหลักจากรูปภาพตารางสถิติ "${meta.name}" นี้ทั้งหมด (เรียงจากงวดบน/ล่าสุดลงล่าง)
กฎ: ${meta.strictParsingRule}
ให้สกัดเฉพาะเลขท้าย 4 ตัวของรางวัลหลัก (number4D ต้องเป็นเลข 4 หลัก 0000-9999 เท่านั้น) ห้ามเอาวันที่หรือเลข 2-3 ตัวปนเข้ามา`
    };

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedDraws: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  drawDate: { type: Type.STRING },
                  dateIso: { type: Type.STRING },
                  rawPrize: { type: Type.STRING },
                  number4D: { type: Type.STRING }
                },
                required: ['number4D']
              }
            }
          },
          required: ['extractedDraws']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{"extractedDraws":[]}');
    const rawList = Array.isArray(parsed?.extractedDraws) ? parsed.extractedDraws : [];

    const candidates = rawList
      .map((item: any, idx: number) => {
        const check = validateStrict4DNumber(String(item?.number4D || ''), String(item?.rawPrize || ''));
        const { dateIso, drawDate, dayOfWeek } = normalizeDateFields(lotteryType, item?.drawDate, item?.dateIso, idx);
        return {
          id: `ocr-${lotteryType}-${idx}`,
          drawDate,
          dateIso,
          dayOfWeek,
          rawPrize: item?.rawPrize ? String(item.rawPrize).replace(/\D/g, '') : undefined,
          number4D: check.number4D,
          isValid4D: check.valid,
          validationNote: check.note,
          selected: check.valid
        };
      })
      .filter((c: any) => c.number4D.length > 0);

    return res.json({
      success: true,
      lotteryType,
      candidates
    });
  } catch (err: any) {
    const formatted = formatGeminiError(err);
    return res.status(formatted.status).json({ success: false, error: formatted.message });
  }
});

// ================= TELEGRAM GROUP BOT API (Super Number 4D + Defensive Scaling) =================

function maskSecretValue(val?: string, head = 4, tail = 4): string {
  const trimmed = (val || '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= head + tail) return '••••••••';
  return `${trimmed.slice(0, head)}••••••••${trimmed.slice(-tail)}`;
}

function getTelegramEnvSecrets() {
  return {
    botToken: (process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    chatId: (process.env.TELEGRAM_CHAT_ID || '').trim()
  };
}

function getTelegramEnvStatus() {
  const env = getTelegramEnvSecrets();
  return {
    hasBotToken: Boolean(env.botToken),
    botTokenPreview: maskSecretValue(env.botToken, 6, 4),
    hasChatId: Boolean(env.chatId),
    chatIdPreview: maskSecretValue(env.chatId, 4, 4),
    hasKvPersistence: Boolean(getKvConfig()),
    hasCronSecret: Boolean((process.env.CRON_SECRET || '').trim()),
    hasAdminSecret: Boolean((process.env.ADMIN_API_SECRET || '').trim())
  };
}

async function dispatchTelegramMessage(params: {
  botToken?: string;
  chatId?: string;
  messageThreadId?: string;
  message: string;
  drawDate: string;
  pinMessage?: boolean;
  disableNotification?: boolean;
  isSimulated?: boolean;
}) {
  const {
    botToken,
    chatId,
    messageThreadId,
    message,
    drawDate,
    pinMessage,
    disableNotification,
    isSimulated
  } = params;

  if (!isSimulated) {
    if (!botToken || !chatId) {
      throw new Error('กรุณาระบุ Telegram Bot Token และ Group Chat ID ให้ครบถ้วนก่อนส่งจริง');
    }

    const bodyPayload: Record<string, any> = {
      chat_id: chatId,
      text: message,
      disable_notification: Boolean(disableNotification)
    };
    if (messageThreadId && /^\d+$/.test(messageThreadId.trim())) {
      bodyPayload.message_thread_id = Number(messageThreadId.trim());
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });

    const tgData: any = await tgRes.json().catch(() => ({}));
    if (!tgRes.ok || !tgData.ok) {
      throw new Error(tgData?.description || `Telegram Bot API HTTP ${tgRes.status}`);
    }

    const sentMsgId = tgData?.result?.message_id as number | undefined;
    const chatTitle = tgData?.result?.chat?.title || tgData?.result?.chat?.username || chatId;

    if (pinMessage && sentMsgId) {
      await fetch(`https://api.telegram.org/bot${botToken}/pinChatMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: sentMsgId,
          disable_notification: Boolean(disableNotification)
        })
      }).catch(() => {});
    }

    const log: TelegramLogItem = {
      id: `tg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      drawDate,
      message,
      status: 'sent',
      telegramMessageId: sentMsgId,
      chatSummary: `Telegram (${chatTitle})`
    };
    telegramLogs.unshift(log);
    await savePersistedStore();
    return { mode: 'live-telegram-group', log };
  }

  const simLog: TelegramLogItem = {
    id: `tg-sim-${Date.now()}`,
    timestamp: new Date().toISOString(),
    drawDate,
    message,
    status: 'simulated',
    chatSummary: 'โหมดจำลอง (Telegram Group)'
  };
  telegramLogs.unshift(simLog);
  await savePersistedStore();
  return { mode: 'simulated-successful', log: simLog };
}

app.get('/api/telegram/config', (req: Request, res: Response) => {
  if (req.query.ping === '1') {
    return res.json({ ok: true });
  }
  const authorized = isAdminAuthorized(req);
  const safeConfig = authorized
    ? telegramConfig
    : {
        ...telegramConfig,
        botToken: '',
        chatId: telegramConfig.chatId ? maskSecretValue(telegramConfig.chatId, 3, 3) : ''
      };
  res.json({
    success: true,
    adminAuthorized: authorized,
    config: safeConfig,
    envStatus: getTelegramEnvStatus(),
    logs: telegramLogs.slice(0, 25)
  });
});

app.post('/api/telegram/config', requireAdminSecret, async (req: Request, res: Response) => {
  const newConfig = req.body;
  telegramConfig = {
    ...telegramConfig,
    ...newConfig
  };
  await savePersistedStore();
  res.json({
    success: true,
    savedAt: new Date().toISOString(),
    config: telegramConfig,
    envStatus: getTelegramEnvStatus()
  });
});

app.post('/api/telegram/verify', requireAdminSecret, async (req: Request, res: Response) => {
  try {
    const envSecrets = getTelegramEnvSecrets();
    const tokenToCheck =
      (req.body?.botToken || '').trim() ||
      (telegramConfig.botToken || '').trim() ||
      envSecrets.botToken;

    if (!tokenToCheck) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอก Telegram Bot Token (จาก @BotFather) หรือตั้งค่า TELEGRAM_BOT_TOKEN ใน Secrets ก่อนตรวจสอบ'
      });
    }

    const meRes = await fetch(`https://api.telegram.org/bot${tokenToCheck}/getMe`);
    const meData: any = await meRes.json().catch(() => ({}));
    if (!meRes.ok || !meData.ok) {
      return res.status(400).json({
        success: false,
        error: meData?.description || `Telegram API HTTP ${meRes.status}: Bot Token ไม่ถูกต้อง`
      });
    }

    const updatesRes = await fetch(`https://api.telegram.org/bot${tokenToCheck}/getUpdates?limit=30`);
    const updatesData: any = await updatesRes.json().catch(() => ({}));
    const chatMap = new Map<string, { chatId: string; title: string; type: string; username?: string }>();

    if (updatesRes.ok && updatesData.ok && Array.isArray(updatesData.result)) {
      for (const upd of updatesData.result) {
        const chat =
          upd.message?.chat ||
          upd.edited_message?.chat ||
          upd.channel_post?.chat ||
          upd.my_chat_member?.chat ||
          upd.chat_member?.chat;
        if (!chat || chat.id === undefined) continue;
        const cid = String(chat.id);
        const title =
          chat.title ||
          [chat.first_name, chat.last_name].filter(Boolean).join(' ') ||
          chat.username ||
          cid;
        chatMap.set(cid, {
          chatId: cid,
          title,
          type: chat.type || 'group',
          username: chat.username
        });
      }
    }

    return res.json({
      success: true,
      bot: {
        id: meData.result?.id,
        firstName: meData.result?.first_name || 'Telegram Bot',
        username: meData.result?.username || ''
      },
      discoveredChats: Array.from(chatMap.values())
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `ไม่สามารถเชื่อมต่อ Telegram Bot API: ${err?.message || 'Network error'}`
    });
  }
});

app.post('/api/telegram/send', requireAdminSecret, async (req: Request, res: Response) => {
  try {
    const {
      botToken,
      chatId,
      messageThreadId,
      message,
      drawDate,
      pinMessage,
      disableNotification,
      isSimulated
    } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุข้อความที่จะส่งเข้ากลุ่ม Telegram' });
    }

    const envSecrets = getTelegramEnvSecrets();
    const tokenToUse =
      (botToken || '').trim() ||
      (telegramConfig.botToken || '').trim() ||
      envSecrets.botToken;
    const chatToUse =
      (chatId || '').trim() ||
      (telegramConfig.chatId || '').trim() ||
      envSecrets.chatId;
    const threadToUse =
      (messageThreadId ?? telegramConfig.messageThreadId ?? '').toString().trim();

    try {
      const result = await dispatchTelegramMessage({
        botToken: tokenToUse,
        chatId: chatToUse,
        messageThreadId: threadToUse,
        message,
        drawDate: drawDate || 'งวดปัจจุบัน',
        pinMessage: pinMessage ?? telegramConfig.pinMessage,
        disableNotification: disableNotification ?? telegramConfig.disableNotification,
        isSimulated: Boolean(isSimulated)
      });

      return res.json({ success: true, data: result });
    } catch (sendErr: any) {
      const failLog: TelegramLogItem = {
        id: `tg-err-${Date.now()}`,
        timestamp: new Date().toISOString(),
        drawDate: drawDate || 'งวดปัจจุบัน',
        message,
        status: 'failed',
        errorMessage: sendErr.message
      };
      telegramLogs.unshift(failLog);
      await savePersistedStore();
      return res.status(400).json({
        success: false,
        error: `Telegram API Error: ${sendErr.message}`
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

function getBangkokMinutesOfDay(referenceDate = new Date()): number {
  const bangkokShifted = new Date(referenceDate.getTime() + 7 * 60 * 60 * 1000);
  return bangkokShifted.getUTCHours() * 60 + bangkokShifted.getUTCMinutes();
}

async function runTelegramPreDrawTick(): Promise<{
  ok: boolean;
  status: string;
  drawDate: string;
  scheduleMode?: string;
  sentLotteries?: Lottery4DType[];
}> {
  await ensureStoreHydrated();
  const now = new Date();
  const nextLao = getNextDrawInfo4D('lao', now);
  const scheduleMode = telegramConfig.scheduleMode || 'per_lottery_offset';

  if (!telegramConfig.isTelegramEnabled) {
    return { ok: true, status: 'disabled', drawDate: nextLao.drawDateIso, scheduleMode };
  }

  const targetTypes: Lottery4DType[] =
    Array.isArray(telegramConfig.lotteryTypes) && telegramConfig.lotteryTypes.length > 0
      ? telegramConfig.lotteryTypes
      : LOTTERY_4D_LIST.map((m) => m.id);

  const dueDraws = targetTypes
    .map((t) => ({ type: t, info: getNextDrawInfo4D(t, now), meta: LOTTERY_4D_META_MAP[t] }))
    .filter(({ info }) => info.daysUntilDraw - (telegramConfig.daysBeforeDraw || 0) <= 0);

  if (dueDraws.length === 0) {
    return { ok: true, status: 'not_due_yet', drawDate: nextLao.drawDateIso, scheduleMode };
  }

  const notifiedMap: Partial<Record<Lottery4DType, string>> = {
    ...(telegramConfig.lastNotifiedByLottery || {})
  };
  const currentMinutes = getBangkokMinutesOfDay(now);

  let readyToSend = dueDraws.filter(({ type, info }) => notifiedMap[type] !== info.drawDateIso);
  if (readyToSend.length === 0) {
    return { ok: true, status: 'already_sent', drawDate: dueDraws[0].info.drawDateIso, scheduleMode };
  }

  if (scheduleMode === 'per_lottery_offset') {
    const leadMinutes = Math.min(240, Math.max(15, Number(telegramConfig.minutesBeforeDraw) || 90));
    readyToSend = readyToSend.filter(({ info, meta }) => {
      const alertMin = Math.max(0, meta.drawTimeMinutes - leadMinutes);
      if (info.daysUntilDraw === 0) {
        // On draw day, trigger between (drawTime - leadMinutes) and (drawTime + 20 mins grace)
        return currentMinutes >= alertMin && currentMinutes <= meta.drawTimeMinutes + 20;
      }
      // Advance days (daysBeforeDraw > 0) trigger once we pass that lottery's daily alert time
      return currentMinutes >= alertMin;
    });
  } else {
    const [targetHour, targetMin] = (telegramConfig.notifyTime || '15:00').split(':').map(Number);
    const scheduledMinutes = (Number.isFinite(targetHour) ? targetHour : 15) * 60 + (Number.isFinite(targetMin) ? targetMin : 0);
    if (currentMinutes < scheduledMinutes) {
      return { ok: true, status: 'waiting_notify_time', drawDate: readyToSend[0].info.drawDateIso, scheduleMode };
    }
  }

  if (readyToSend.length === 0) {
    return { ok: true, status: 'waiting_per_lottery_window', drawDate: dueDraws[0].info.drawDateIso, scheduleMode };
  }

  const envSecrets = getTelegramEnvSecrets();
  const effectiveToken = (telegramConfig.botToken || '').trim() || envSecrets.botToken;
  const effectiveChatId = (telegramConfig.chatId || '').trim() || envSecrets.chatId;

  if (!effectiveToken || !effectiveChatId) {
    return { ok: true, status: 'missing_credentials', drawDate: readyToSend[0].info.drawDateIso, scheduleMode };
  }

  const sections = readyToSend.map(({ type, info, meta }) => {
    const draws = drawsStore[type] || getDefault4DDraws(type);
    const pred = build4DPredictionSummary(draws, type, info);
    const cb = pred.circuitBreaker;
    const isWin4Mode = pred.strategyMode === 'win4_3d';
    const sniperList = isWin4Mode
      ? pred.win4Breakdown.threeDigitStraightSets.slice(0, cb.recommendedSetsCount || 1)
      : pred.sniperSets.slice(0, cb.recommendedSetsCount || 1).map((s) => s.number4D);

    const statusLine =
      cb.status === 'red_pause'
        ? '🔴 สถานะ: หยุดพักชั่วคราว (Cold Drift เกินค่าเฉลี่ย)'
        : cb.status === 'yellow_nearmiss'
          ? `🟡 สถานะ: เกาะกลุ่ม Near-Miss · ลดงบเหลือ 1 ชุดเม็ดเดียว (120 บ.) + ประคอง 2 ตัว: ${pred.backupTwoBack.slice(0, 3).join(', ')}`
          : `🟢 สถานะ: ปกติ · เต็มพอร์ต 4 ชุด (480 บ.)`;

    const dw = pred.dualWindowMomentum;
    const anchorLabels = dw
      ? [
          ...dw.anchorDigitsOverall.map((d) => `รวม:${d}`),
          ...dw.perPositionSummary.flatMap((p) => p.anchorDigits.map((d) => `${p.positionLabel}:${d}`))
        ]
      : [];
    const anchorLine =
      anchorLabels.length > 0 ? `\n📍 เลขยืนพื้น Dual-Window (60/40): ${anchorLabels.join(' · ')}` : '';
    const hb = pred.hedgingBreakdown;

    if (isWin4Mode) {
      const all24 = pred.win4Breakdown.threeDigitStraight24Sets || [];
      const hedge = pred.win4Breakdown.threeDigitDoubleHedgeSets || [];
      return `📌 [${meta.name} · ออกเวลา ${meta.drawTimeLabel}]\n🗓️ งวด ${info.drawDateStr} (${info.dayOfWeek})${anchorLine}\n🔥 แกนวิน 4 ตัว: [ ${pred.win4Breakdown.coreDigits4.join(' - ')} ]\n👑 4 ชุดเน้น (เม็ดเดียว ${pred.win4Breakdown.megaThreeStraight}): ${pred.win4Breakdown.threeDigitStraightSets.join(' · ')} (ชนเฉลี่ย ${pred.deepAnalysis?.averageAgreementOutOf22 || 0}/22 แหล่ง)\n🎯 แตก 3 ตัว 24 ชุด: ${all24.join(' · ')}\n🛡️ 3 ตัวโต๊ด 4 ชุด: ${pred.win4Breakdown.threeDigitToadSets.join(' · ')}${hedge.length > 0 ? `\n⚡ กันเบิ้ล/หาม 4 ชุด: ${hedge.join(' · ')}` : ''}\n${statusLine}`;
    }

    const hedgeBlock = hb
      ? `\n🛡️ แตกชุดกันทุน:\n   • 3 ตัวหน้า: ${hb.threeDigitFront.join(' · ')} | 3 ตัวหลัง: ${hb.threeDigitBack.join(' · ')}\n   • 2 ตัวหน้า: ${hb.twoDigitFront.join(' · ')} | 2 ตัวท้าย: ${hb.twoDigitBack.join(' · ')}`
      : `\n🛡️ 3 โต๊ด / 2 ตัวท้าย: ${pred.backupThreeToad.slice(0, 3).join(', ')} / ${pred.backupTwoBack.slice(0, 4).join(', ')}`;

    return `📌 [${meta.name} · ออกเวลา ${meta.drawTimeLabel}]\n🗓️ งวด ${info.drawDateStr} (${info.dayOfWeek})${anchorLine}\n👑 Super Number 4 ตัว: [ ${pred.superNumber4D} ] (ชนเฉลี่ย ${pred.deepAnalysis?.averageAgreementOutOf22 || 0}/${pred.totalSourcesAnalyzed || 22} แหล่ง)\n🎯 ชุดหัวกะทิ 4D (Dual-Window 60/40): ${sniperList.join(' · ')}${hedgeBlock}\n${statusLine}`;
  });

  const leadMinutes = Math.min(240, Math.max(15, Number(telegramConfig.minutesBeforeDraw) || 90));
  const modeHeader =
    scheduleMode === 'per_lottery_offset'
      ? `⏰ แจ้งเตือนก่อนหวยออก ${leadMinutes} นาที`
      : `⏰ แจ้งเตือนรวมรอบเวลา ${telegramConfig.notifyTime} น.`;

  const autoMsg = `🔔 แจ้งเตือนเลขเด็ด AI (${modeHeader} · ${readyToSend.length} สลาก)\n\n${sections.join('\n\n────────────────\n\n')}`;

  await dispatchTelegramMessage({
    botToken: effectiveToken,
    chatId: effectiveChatId,
    messageThreadId: telegramConfig.messageThreadId,
    message: autoMsg,
    drawDate: readyToSend.map((d) => `${d.meta.shortName} ${d.info.drawDateStr}`).join(' / '),
    pinMessage: telegramConfig.pinMessage,
    disableNotification: telegramConfig.disableNotification,
    isSimulated: false
  });

  const sentLotteries: Lottery4DType[] = [];
  for (const d of readyToSend) {
    notifiedMap[d.type] = d.info.drawDateIso;
    sentLotteries.push(d.type);
  }
  telegramConfig.lastNotifiedByLottery = notifiedMap;
  telegramConfig.lastNotifiedDraw = readyToSend.map((d) => `${d.type}:${d.info.drawDateIso}`).join('|');
  await savePersistedStore();

  return {
    ok: true,
    status: 'sent',
    drawDate: readyToSend[0].info.drawDateIso,
    scheduleMode,
    sentLotteries
  };
}

const handleTelegramCronTick = async (_req: Request, res: Response) => {
  try {
    const result = await runTelegramPreDrawTick();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'cron_error' });
  }
};

app.all('/api/telegram/cron-tick', requireCronSecret, handleTelegramCronTick);
app.all('/api/telegram/cron-trigger', requireCronSecret, handleTelegramCronTick);
app.all('/api/telegram/cron', requireCronSecret, handleTelegramCronTick);

function startTelegramPreDrawScheduler() {
  setInterval(async () => {
    try {
      await runTelegramPreDrawTick();
    } catch (err: any) {
      console.warn('[Telegram Scheduler] Error:', err?.message);
    }
  }, 60 * 1000);
}

app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: `Unknown API route: ${req.path}` });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vitePkg = 'vite';
    const { createServer: createViteServer } = await import(vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  startTelegramPreDrawScheduler();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
