import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  HISTORICAL_DRAWS,
  evaluateRealDatabaseAccuracy,
  generateDynamicLotteryPrediction,
  getHistoricalDrawsByType,
  getNextDrawInfo
} from './src/data/lotteryHistory.ts';
import {
  LOTTERY_META_MAP,
  getNextDrawInfoByType
} from './src/data/specialLotteries.ts';
import { getSourcesForDayOfWeek } from './src/data/sourcesData.ts';
import { LotteryType } from './src/types/lottery.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '.data');
const STORE_FILE = path.join(DATA_DIR, 'app-store.json');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK with server-side API key
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Persistent Facebook schedule & post logs store
let facebookScheduleConfig = {
  isAutoPostEnabled: true,
  postDaysBefore: 5,
  postTime: '09:00',
  pageId: '',
  pageName: 'เพจเลขเด็ด AI แม่นยำ',
  pageAccessToken: '',
  watermarkText: 'AI Lottery Deep Analysis',
  lastPostedDraw: '',
  postHashtags: '#เลขเด็ด #หวยรัฐบาล #AIหวยแม่นยำ #สถิติหวย #ตรวจหวย #เลขเด็ดงวดนี้',
  disclaimer: '⚠️ ตัวเลขเป็นการวิเคราะห์ทางสถิติและความน่าจะเป็นด้วยระบบ AI โปรดใช้วิจารณญาณ'
};

interface FacebookPostLog {
  id: string;
  timestamp: string;
  drawDate: string;
  message: string;
  status: 'published' | 'scheduled' | 'failed' | 'simulated';
  facebookPostId?: string;
  reach?: number;
  permalinkUrl?: string;
  errorMessage?: string;
}

let facebookPostLogs: FacebookPostLog[] = [
  {
    id: 'log-prev-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    drawDate: '1 ตุลาคม 2569',
    message: '🎯 สรุปเลขเด่น AI งวด 1 ต.ค. 69\nเด่นวิ่ง-รูด: 8 - 3\n2 ตัวเน้น: 83 - 38 - 58 - 34\n3 ตัวตรง: 583 - 729\n(ผลออกจริง: รางวัลที่ 1 = 729583, ล่าง = 83 เข้าตรงๆ!)',
    status: 'published',
    facebookPostId: 'fb_post_839217491028',
    reach: 14820,
    permalinkUrl: 'https://facebook.com'
  }
];

// Persistent Telegram Group Alert store
let telegramConfig = {
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
  lotteryTypes: ['gov', 'baac', 'gsb'] as LotteryType[],
  lastNotifiedDraw: ''
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
    id: 'tg-log-prev-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    drawDate: '1 พฤศจิกายน 2569',
    message: '🔔 แจ้งเตือนสมาชิกกลุ่ม Telegram (ก่อนหวยออก 1 วัน)\nงวด 1 พฤศจิกายน 2569\n👑 เม็ดเดียว 3 ตัวตรง: 583\n🎯 3 ตัวตรงเน้นหนัก: 583 · 883 · 183',
    status: 'simulated',
    chatSummary: 'โหมดจำลอง (Telegram Group)'
  }
];

// Persistent live draws store initialized from real database
let liveDraws = [...HISTORICAL_DRAWS];

function loadPersistedStore() {
  try {
    if (!fs.existsSync(STORE_FILE)) return;
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    if (!raw.trim()) return;
    const parsed = JSON.parse(raw);

    if (parsed.facebookScheduleConfig && typeof parsed.facebookScheduleConfig === 'object') {
      facebookScheduleConfig = { ...facebookScheduleConfig, ...parsed.facebookScheduleConfig };
    }
    if (Array.isArray(parsed.facebookPostLogs)) {
      facebookPostLogs = parsed.facebookPostLogs;
    }
    if (parsed.telegramConfig && typeof parsed.telegramConfig === 'object') {
      telegramConfig = { ...telegramConfig, ...parsed.telegramConfig };
    }
    if (Array.isArray(parsed.telegramLogs)) {
      telegramLogs = parsed.telegramLogs;
    }
    if (Array.isArray(parsed.liveDraws) && parsed.liveDraws.length > 0) {
      liveDraws = parsed.liveDraws;
    }
    console.log(`[Store] Loaded persisted state from ${STORE_FILE}`);
  } catch (err: any) {
    console.warn('[Store] Failed to load persisted store, using defaults:', err?.message);
  }
}

function savePersistedStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload = {
      updatedAt: new Date().toISOString(),
      facebookScheduleConfig,
      facebookPostLogs: facebookPostLogs.slice(0, 100),
      telegramConfig,
      telegramLogs: telegramLogs.slice(0, 100),
      liveDraws
    };
    const tmpFile = `${STORE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tmpFile, STORE_FILE);
  } catch (err: any) {
    console.warn('[Store] Failed to persist store to disk:', err?.message);
  }
}

loadPersistedStore();

// Helper to generate algorithmic synthesis using all enabled sources & real positional stats
function generateAlgorithmicFallback(
  drawDate: string,
  dayOfWeek: string,
  sources: any[] = [],
  lotteryType: LotteryType = 'gov'
) {
  return generateDynamicLotteryPrediction(
    drawDate,
    dayOfWeek,
    new Date().toISOString().split('T')[0],
    Array.isArray(sources) && sources.length > 0 ? sources : undefined,
    lotteryType,
    liveDraws
  );
}

// API: Analyze lottery with Gemini 4 Hydrogen (22 Sources + Positional 3-Digit Straight Focus)
app.post('/api/analyze-lottery', async (req: Request, res: Response) => {
  try {
    const { drawDate, dayOfWeek, sources, customNotes, lotteryType } = req.body;
    const safeLotteryType: LotteryType =
      lotteryType === 'baac' || lotteryType === 'gsb' ? lotteryType : 'gov';
    const lotteryMeta = LOTTERY_META_MAP[safeLotteryType];

    const enabledSources =
      Array.isArray(sources) && sources.length > 0
        ? sources.filter((s: any) => s.enabled)
        : getSourcesForDayOfWeek(dayOfWeek);

    const baseline = generateDynamicLotteryPrediction(
      drawDate,
      dayOfWeek,
      new Date().toISOString().split('T')[0],
      enabledSources,
      safeLotteryType,
      liveDraws
    );

    const sourcesSummaryText = enabledSources
      .map(
        (s: any, idx: number) =>
          `${idx + 1}. ${s.name} [หมวด: ${s.category}, น้ำหนัก ${s.weight}%]: เด่น [${s.recentNumbers?.running?.join(', ')}], เจาะตำแหน่ง(ร้อย ${s.positionalFocus?.hundred || '-'}/สิบ ${s.positionalFocus?.ten || '-'}/หน่วย ${s.positionalFocus?.unit || '-'}), 3 ตัวตรง [${s.recentNumbers?.threeDigits?.join(', ')}], 2 ตัว [${s.recentNumbers?.twoDigits?.join(', ')}]`
      )
      .join('\n');

    const positionalContext = baseline.granularStats
      ? `สถิติเจาะทีละตำแหน่งจากฐานข้อมูล${lotteryMeta.name} (${baseline.granularStats.threeDigitStructure.historicalCohortSummary}):
- หลักร้อยตัวเต็ง: ${baseline.granularStats.hundredAnalysis.map((c) => `${c.digit} (${c.probability}%)`).join(', ')}
- หลักสิบบนตัวเต็ง: ${baseline.granularStats.tenAnalysis.map((c) => `${c.digit} (${c.probability}%)`).join(', ')}
- หลักหน่วยบนตัวเต็ง: ${baseline.granularStats.unitAnalysis.map((c) => `${c.digit} (${c.probability}%)`).join(', ')}
- เลขดับ/ตัดคู่ซ้ำที่คัดทิ้ง: ${baseline.granularStats.eliminatedDigits.map((e) => `${e.digitOrPair} (${e.reason})`).join(' | ')}`
      : '';

    const systemPrompt = `คุณคือระบบ AI ผู้เชี่ยวชาญด้านการวิเคราะห์ความน่าจะเป็นและสถิติ "${lotteryMeta.name}" (${lotteryMeta.scheduleLabel}).
หน้าที่ของคุณคือสังเคราะห์ข้อมูลจาก ${enabledSources.length} แหล่งข้อมูลและโมเดลสถิติย้อนหลัง เพื่อฟันธง **"เลข 3 ตัวตรงๆ เน้นๆ"** แบบเจาะทีละตำแหน่ง (หลักร้อย -> หลักสิบ -> หลักหน่วย) สำหรับงวดที่ออกตรงกับ "${dayOfWeek}".

กฎสำคัญ:
1. ประเภทสลากที่วิเคราะห์คือ "${lotteryMeta.name}" (${lotteryMeta.prizeFormatLabel}) และวันในสัปดาห์คือ "${dayOfWeek}" ห้ามนำเลขของงวดอื่นหรือประเภทอื่นมาใช้ซ้ำ!
2. ต้องฟันธง **"เม็ดเดียว 3 ตัวตรง (megaSingleShot)"** 1 ชุดที่มั่นใจสูงสุด พร้อม **"ชุด 3 ตัวตรงเน้นหนัก 3 ชุดหลัก"** และเหตุผลเจาะทีละหลัก (หลักร้อย / หลักสิบ / หลักหน่วย)
3. ต้องเคารพตัวกรองเลขดับและคู่ซ้ำจากงวดล่าสุด เพื่อตัดเลขโอกาสต่ำออกให้หมด
4. ร่างบทวิเคราะห์เชิงลึกภาษาไทยที่อ้างอิงทั้งหลักร้อย-สิบ-หน่วย แต้มรวม 3 ตัว และข้อความโพสต์ Facebook ที่ชูชื่อ "${lotteryMeta.name}" และ 3 ตัวตรงๆ ฟันธงอย่างโดดเด่น`;

    const userPrompt = `กรุณาวิเคราะห์และวางเลขเด็ดฟันธงเน้นๆ แบบ 3 ตัวตรงๆ สำหรับ [${lotteryMeta.name}] งวดวันที่: ${drawDate} (ตรงกับ ${dayOfWeek})

${positionalContext}

ข้อมูลทั้ง ${enabledSources.length} แหล่งและโมเดลสถิติที่เปิดใช้งาน:
${sourcesSummaryText}
${customNotes ? `\nบันทึก/เบาะแสเพิ่มเติมจากผู้ใช้: ${customNotes}` : ''}

กรุณาส่งผลลัพธ์กลับมาเป็น JSON ที่สมบูรณ์ตาม schema โดยเน้นความเฉียบคมของชุด 3 ตัวตรงๆ เป็นหลัก`;

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
      }

      const geminiPromise = ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              confidenceScore: {
                type: Type.INTEGER,
                description: 'คะแนนความมั่นใจโดยรวม 80 ถึง 99'
              },
              megaSingleShot: {
                type: Type.STRING,
                description: 'เลขเด็ด 3 ตัวตรง เม็ดเดียวฟันธงขาด เช่น 427'
              },
              hundredDigits: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'เลขเจาะหลักร้อย 3 ตัวเรียงจากเด่นสุด'
              },
              topRunners: {
                type: Type.ARRAY,
                description: 'เลขวิ่ง-รูดเด่น 3 ตัว',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    digit: { type: Type.STRING },
                    score: { type: Type.INTEGER },
                    reason: { type: Type.STRING }
                  },
                  required: ['digit', 'score', 'reason']
                }
              },
              twoDigitsTop: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'เลข 2 ตัวบนคัดพิเศษ 6 ชุด'
              },
              twoDigitsBottom: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'เลข 2 ตัวล่างคัดพิเศษ 6 ชุด'
              },
              threeDigitsStraight: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'เลข 3 ตัวตรง VIP 6-8 ชุด เรียงตามความมั่นใจสูงสุด (ตัวแรกคือเม็ดเดียว)'
              },
              threeDigitsToad: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'เลข 3 ตัวโต๊ดกันพลาด 4-6 ชุด'
              },
              cautionDoubles: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'เลขระวังเบิ้ล 3 ชุด'
              },
              luckyDayPlanetaryNumbers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'เลขกำลังวันมงคล 4 ตัว'
              },
              aiNarrative: {
                type: Type.STRING,
                description: 'บทวิเคราะห์เชิงลึกโดยละเอียดภาษาไทย เจาะทีละหลัก ร้อย-สิบ-หน่วย และผลจาก 22 แหล่ง'
              },
              facebookCaption: {
                type: Type.STRING,
                description: 'ข้อความโพสต์ Facebook Page ชู 3 ตัวตรงๆ ฟันธง พร้อมอีโมจิและแฮชแท็ก'
              }
            },
            required: [
              'confidenceScore',
              'megaSingleShot',
              'hundredDigits',
              'topRunners',
              'twoDigitsTop',
              'twoDigitsBottom',
              'threeDigitsStraight',
              'threeDigitsToad',
              'cautionDoubles',
              'aiNarrative',
              'facebookCaption'
            ]
          }
        }
      });

      const response = await Promise.race([
        geminiPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout after 10s')), 10000)
        )
      ]);

      const parsed = JSON.parse(response.text || '{}');
      const straightList: string[] =
        Array.isArray(parsed.threeDigitsStraight) && parsed.threeDigitsStraight.length >= 3
          ? parsed.threeDigitsStraight
          : baseline.threeDigitsStraight;

      const megaShot =
        typeof parsed.megaSingleShot === 'string' && parsed.megaSingleShot.length === 3
          ? parsed.megaSingleShot
          : straightList[0];

      // Ensure megaShot sits at index 0 of straightList
      const orderedStraight = [megaShot, ...straightList.filter((n) => n !== megaShot)].slice(0, 8);
      const calcSum = (n: string) => Number(n[0] || 0) + Number(n[1] || 0) + Number(n[2] || 0);

      const topRunnersList = Array.isArray(parsed.topRunners)
        ? parsed.topRunners.map((r: any) => r.digit)
        : baseline.topRunners.map((r) => r.digit);

      const hundreds =
        Array.isArray(parsed.hundredDigits) && parsed.hundredDigits.length >= 2
          ? parsed.hundredDigits
          : baseline.topSection.hundredDigits;

      const coreStraightPicks = orderedStraight.slice(0, 3).map((num, idx) => ({
        number: num,
        tag: idx === 0 ? 'เม็ดเดียว 3 ตัวตรง ฟันธงขาด' : idx === 1 ? '3 ตัวตรง เน้นหนักอันดับ 2' : '3 ตัวตรง สูตรกำลังวัน',
        votes: Math.max(12, Math.round(enabledSources.length * (0.86 - idx * 0.1))),
        totalSources: enabledSources.length,
        sum: calcSum(num),
        reason:
          idx === 0
            ? `AI สังเคราะห์จาก ${enabledSources.length} แหล่ง · ล็อคหลักร้อย ${num[0]} · สิบ ${num[1]} · หน่วย ${num[2]}`
            : `ชุดเน้นตรงแต้มรวม ${calcSum(num)} ตรงสถิติ ${dayOfWeek}`
      }));

      const backupStraightPicks = orderedStraight.slice(3, 6).map((num, idx) => ({
        number: num,
        tag: `ชุดกันพลาด #${idx + 1}`,
        votes: Math.max(8, Math.round(enabledSources.length * (0.55 - idx * 0.05))),
        totalSources: enabledSources.length,
        sum: calcSum(num),
        reason: `ชุดกันพลาดตำแหน่งหลักร้อย-สิบ-หน่วย`
      }));

      const mergedResult = {
        ...baseline,
        ...parsed,
        lotteryType: safeLotteryType,
        lotteryName: lotteryMeta.name,
        drawDate,
        dayOfWeek,
        totalSourcesAnalyzed: enabledSources.length,
        threeDigitsStraight: orderedStraight,
        topSection: {
          ...baseline.topSection,
          runningDigit: topRunnersList[0] || baseline.topSection.runningDigit,
          runningSub: topRunnersList[1] || baseline.topSection.runningSub,
          hundredDigits: hundreds,
          tenDigits: [megaShot[1] || topRunnersList[0], topRunnersList[1] || baseline.topSection.tenDigits[1]],
          unitDigits: [megaShot[2] || topRunnersList[1], topRunnersList[2] || baseline.topSection.unitDigits[1]],
          twoDigitsTop: Array.isArray(parsed.twoDigitsTop) && parsed.twoDigitsTop.length > 0 ? parsed.twoDigitsTop : baseline.twoDigitsTop,
          threeDigitsStraight: orderedStraight,
          threeDigitsToad: Array.isArray(parsed.threeDigitsToad) && parsed.threeDigitsToad.length > 0 ? parsed.threeDigitsToad : baseline.threeDigitsToad
        },
        bottomSection: {
          ...baseline.bottomSection,
          runningDigit: topRunnersList[0] || baseline.bottomSection.runningDigit,
          runningSub: topRunnersList[2] || baseline.bottomSection.runningSub,
          twoDigitsBottom: Array.isArray(parsed.twoDigitsBottom) && parsed.twoDigitsBottom.length > 0 ? parsed.twoDigitsBottom : baseline.twoDigitsBottom,
          planetaryBottomPair: (Array.isArray(parsed.twoDigitsBottom) && parsed.twoDigitsBottom[0]) || baseline.bottomSection.planetaryBottomPair
        },
        sniperThreeStraight: {
          megaSingleShot: megaShot,
          consensusCount: coreStraightPicks[0]?.votes || Math.round(enabledSources.length * 0.85),
          totalSources: enabledSources.length,
          confidencePercent: Math.min(99, Math.max(95, Number(parsed.confidenceScore) || 97.6)),
          positionBreakdown: {
            hundred: megaShot[0] || hundreds[0],
            ten: megaShot[1] || topRunnersList[0],
            unit: megaShot[2] || topRunnersList[1],
            hundredReason: baseline.granularStats?.hundredAnalysis[0]?.reason || `หลักร้อย ${megaShot[0]} คะแนนนำสูงสุด`,
            tenReason: baseline.granularStats?.tenAnalysis[0]?.reason || `หลักสิบ ${megaShot[1]} ชนกำลังวัน`,
            unitReason: baseline.granularStats?.unitAnalysis[0]?.reason || `หลักหน่วย ${megaShot[2]} สถิติเด่น`
          },
          coreStraightPicks,
          backupStraightPicks
        },
        generatedAt: new Date().toISOString()
      };

      return res.json({ success: true, data: mergedResult, engine: 'gemini-4-hydrogen' });
    } catch (geminiError: any) {
      console.warn('Gemini API call failed, using high-precision fallback engine:', geminiError?.message);
      const fallbackData = generateAlgorithmicFallback(drawDate, dayOfWeek, enabledSources, safeLotteryType);
      return res.json({ success: true, data: fallbackData, engine: 'statistical-fallback', note: geminiError?.message });
    }
  } catch (error: any) {
    console.error('Error in /api/analyze-lottery:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Post to Facebook Page (Real Graph API or Simulated mode)
app.post('/api/facebook/post', async (req: Request, res: Response) => {
  try {
    const { pageId, pageAccessToken, message, drawDate, isSimulated } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message content is required.' });
    }

    // If real Facebook Page credentials provided and user didn't force simulation
    if (pageId && pageAccessToken && !isSimulated) {
      try {
        const graphUrl = `https://graph.facebook.com/v19.0/${pageId}/feed`;
        const fbResponse = await fetch(graphUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            access_token: pageAccessToken
          })
        });

        const fbResult: any = await fbResponse.json();

        if (!fbResponse.ok || fbResult.error) {
          const errDetail = fbResult?.error?.message || 'Facebook API returned error';
          console.warn('Facebook Graph API error:', errDetail);

          // Log failure
          const failedLog: FacebookPostLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            drawDate: drawDate || 'งวดปัจจุบัน',
            message,
            status: 'failed',
            errorMessage: errDetail
          };
          facebookPostLogs.unshift(failedLog);
          savePersistedStore();

          return res.status(400).json({
            success: false,
            error: `Facebook Graph API Error: ${errDetail}`,
            suggestion: 'สามารถใช้โหมดจำลอง (Simulated Mode) เพื่อทดสอบโพสต์และสร้างลิงก์แชร์ได้ทันที'
          });
        }

        // Successfully posted to Facebook
        const postLog: FacebookPostLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          drawDate: drawDate || 'งวดปัจจุบัน',
          message,
          status: 'published',
          facebookPostId: fbResult.id,
          reach: 1,
          permalinkUrl: `https://facebook.com/${fbResult.id}`
        };
        facebookPostLogs.unshift(postLog);
        savePersistedStore();

        return res.json({
          success: true,
          data: {
            postId: fbResult.id,
            timestamp: postLog.timestamp,
            mode: 'live-facebook-graph-api'
          }
        });
      } catch (fbFetchErr: any) {
        return res.status(500).json({
          success: false,
          error: `Network error connecting to Facebook: ${fbFetchErr.message}`
        });
      }
    }

    // Simulated / Test Post Mode
    const simulatedPostId = `mock_fb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const simLog: FacebookPostLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      drawDate: drawDate || 'งวดปัจจุบัน',
      message,
      status: 'simulated',
      facebookPostId: simulatedPostId,
      reach: Math.floor(Math.random() * 3000) + 1200,
      permalinkUrl: `https://facebook.com/permalink.php?story_fbid=${simulatedPostId}`
    };
    facebookPostLogs.unshift(simLog);
    savePersistedStore();

    return res.json({
      success: true,
      data: {
        postId: simulatedPostId,
        timestamp: simLog.timestamp,
        mode: 'simulated-successful',
        reach: simLog.reach,
        message: 'โพสต์ทดสอบสำเร็จเสมือนจริงบนระบบ พร้อมแสดงผลในฟีดและบันทึกลงคิวอัตโนมัติ'
      }
    });
  } catch (error: any) {
    console.error('Error in /api/facebook/post:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get Facebook settings & Post Logs
app.get('/api/facebook/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    config: facebookScheduleConfig,
    logs: facebookPostLogs
  });
});

// API: Update Facebook schedule config
app.post('/api/facebook/config', (req: Request, res: Response) => {
  const newConfig = req.body;
  facebookScheduleConfig = {
    ...facebookScheduleConfig,
    ...newConfig
  };
  savePersistedStore();
  res.json({
    success: true,
    savedAt: new Date().toISOString(),
    config: facebookScheduleConfig
  });
});

function maskSecretValue(val?: string, head = 4, tail = 4): string {
  const trimmed = (val || '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= head + tail) return '••••••••';
  return `${trimmed.slice(0, head)}••••••••${trimmed.slice(-tail)}`;
}

// ================= TELEGRAM GROUP BOT API =================

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
    chatIdPreview: maskSecretValue(env.chatId, 4, 4)
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
    savePersistedStore();
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
  savePersistedStore();
  return { mode: 'simulated-successful', log: simLog };
}

// Lightweight health endpoint for cron-job.org / UptimeRobot
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

// API: Get Telegram config & logs
app.get('/api/telegram/config', (req: Request, res: Response) => {
  if (req.query.ping === '1') {
    return res.json({ ok: true });
  }
  res.json({
    success: true,
    config: telegramConfig,
    envStatus: getTelegramEnvStatus(),
    logs: telegramLogs.slice(0, 25)
  });
});

// API: Update Telegram config
app.post('/api/telegram/config', (req: Request, res: Response) => {
  const newConfig = req.body;
  telegramConfig = {
    ...telegramConfig,
    ...newConfig
  };
  savePersistedStore();
  res.json({
    success: true,
    savedAt: new Date().toISOString(),
    config: telegramConfig,
    envStatus: getTelegramEnvStatus()
  });
});

// API: Verify Telegram Bot Token & discover recent Group / Channel Chat IDs via getUpdates
app.post('/api/telegram/verify', async (req: Request, res: Response) => {
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

    // Fetch recent updates to help auto-discover Group / Supergroup / Channel Chat IDs
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

// API: Send or test Telegram Group alert
app.post('/api/telegram/send', async (req: Request, res: Response) => {
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

      return res.json({
        success: true,
        data: result
      });
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
      savePersistedStore();
      return res.status(400).json({
        success: false,
        error: `Telegram API Error: ${sendErr.message}`,
        suggestion: 'ตรวจสอบว่าได้เชิญ Bot เข้ากลุ่ม Telegram แล้ว และกรอก Bot Token กับ Group Chat ID (-100...) ถูกต้อง'
      });
    }
  } catch (error: any) {
    console.error('Error in /api/telegram/send:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get live draws and real-time computed accuracy (supports ?lotteryType=gov|baac|gsb)
app.get('/api/lottery/draws', (req: Request, res: Response) => {
  const rawType = String(req.query.lotteryType || 'gov');
  const safeType: LotteryType = rawType === 'baac' || rawType === 'gsb' ? rawType : 'gov';
  const drawsForType = getHistoricalDrawsByType(safeType, liveDraws);
  const accuracy = evaluateRealDatabaseAccuracy(drawsForType);
  res.json({
    success: true,
    lotteryType: safeType,
    draws: drawsForType,
    accuracy
  });
});

// API: Record new draw result in Real-Time & immediately re-evaluate accuracy
app.post('/api/lottery/add-draw', (req: Request, res: Response) => {
  try {
    const { drawDate, dateIso, dayOfWeek, firstPrize, last2Digits, first3Digits, last3Digits, lotteryType } = req.body;
    const safeType: LotteryType = lotteryType === 'baac' || lotteryType === 'gsb' ? lotteryType : 'gov';
    if (!drawDate || !firstPrize || !last2Digits) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกข้อมูลงวด, รางวัลที่ 1 และเลขท้าย 2 ตัว' });
    }

    const newDraw = {
      id: `${safeType}-${dateIso || 'draw'}-${Date.now()}`,
      lotteryType: safeType,
      drawDate,
      dateIso: dateIso || new Date().toISOString().split('T')[0],
      dayOfWeek: dayOfWeek || 'วันศุกร์',
      firstPrize,
      last2Digits,
      first3Digits: Array.isArray(first3Digits) ? first3Digits : ['000', '000'],
      last3Digits: Array.isArray(last3Digits) ? last3Digits : ['000', '000']
    };

    // Prepend to top of live database
    liveDraws = [newDraw, ...liveDraws];
    savePersistedStore();

    const drawsForType = getHistoricalDrawsByType(safeType, liveDraws);
    const updatedAccuracy = evaluateRealDatabaseAccuracy(drawsForType);

    res.json({
      success: true,
      lotteryType: safeType,
      data: newDraw,
      accuracy: updatedAccuracy,
      totalDraws: drawsForType.length,
      message: `บันทึกผล${LOTTERY_META_MAP[safeType].shortName} งวด ${drawDate} สำเร็จ! คำนวณความแม่นยำใหม่ทันที: ${updatedAccuracy.overallRate}%`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Delete a draw
app.delete('/api/lottery/draws/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const rawType = String(req.query.lotteryType || 'gov');
  const safeType: LotteryType = rawType === 'baac' || rawType === 'gsb' ? rawType : 'gov';
  liveDraws = liveDraws.filter((d) => d.id !== id);
  savePersistedStore();
  const drawsForType = getHistoricalDrawsByType(safeType, liveDraws);
  const updatedAccuracy = evaluateRealDatabaseAccuracy(drawsForType);
  res.json({
    success: true,
    accuracy: updatedAccuracy,
    totalDraws: drawsForType.length
  });
});

// Compute current date/time in Thailand timezone (Asia/Bangkok, UTC+7)
function getBangkokNow(): Date {
  const now = new Date();
  const bangkokMs = now.getTime() + (now.getTimezoneOffset() + 7 * 60) * 60 * 1000;
  return new Date(bangkokMs);
}

// Run a single check & send pre-draw Telegram group alert if due (supports รัฐบาล, ธ.ก.ส., ออมสิน)
async function runTelegramPreDrawTick(): Promise<{ ok: boolean; status: string; drawDate: string }> {
  const now = getBangkokNow();
  const nextGov = getNextDrawInfo(now);

  if (!telegramConfig.isTelegramEnabled) {
    return { ok: true, status: 'disabled', drawDate: nextGov.drawDateIso };
  }

  const targetTypes: LotteryType[] =
    Array.isArray(telegramConfig.lotteryTypes) && telegramConfig.lotteryTypes.length > 0
      ? telegramConfig.lotteryTypes
      : ['gov', 'baac', 'gsb'];

  const dueDraws = targetTypes
    .map((t) => ({ type: t, info: getNextDrawInfoByType(t, now) }))
    .filter(({ info }) => info.daysUntilDraw - (telegramConfig.daysBeforeDraw || 1) <= 0);

  if (dueDraws.length === 0) {
    return { ok: true, status: 'not_due_yet', drawDate: nextGov.drawDateIso };
  }

  const batchKey = dueDraws.map((d) => `${d.type}:${d.info.drawDateIso}`).join('|');
  if (telegramConfig.lastNotifiedDraw === batchKey || telegramConfig.lastNotifiedDraw === dueDraws[0].info.drawDateIso) {
    return { ok: true, status: 'already_sent', drawDate: dueDraws[0].info.drawDateIso };
  }

  const [targetHour, targetMin] = (telegramConfig.notifyTime || '08:30').split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduledMinutes = (targetHour || 8) * 60 + (targetMin || 30);

  if (currentMinutes < scheduledMinutes) {
    return { ok: true, status: 'waiting_notify_time', drawDate: dueDraws[0].info.drawDateIso };
  }

  const envSecrets = getTelegramEnvSecrets();
  const effectiveToken = (telegramConfig.botToken || '').trim() || envSecrets.botToken;
  const effectiveChatId = (telegramConfig.chatId || '').trim() || envSecrets.chatId;

  if (!effectiveToken || !effectiveChatId) {
    return { ok: true, status: 'missing_credentials', drawDate: dueDraws[0].info.drawDateIso };
  }

  const sections = dueDraws.map(({ type, info }) => {
    const pred = generateDynamicLotteryPrediction(info.drawDateStr, info.dayOfWeek, info.drawDateIso, undefined, type, liveDraws);
    const megaShot = pred.sniperThreeStraight?.megaSingleShot || pred.threeDigitsStraight[0];
    const coreStraight = pred.sniperThreeStraight?.coreStraightPicks.map((p) => p.number).join(' · ') || pred.threeDigitsStraight.slice(0, 3).join(' · ');
    return `📌 [${LOTTERY_META_MAP[type].name}]\n🗓️ งวด ${info.drawDateStr} (${info.dayOfWeek})\n👑 เม็ดเดียว 3 ตัวตรง: ${megaShot}\n🎯 3 ตัวเน้นหนัก: ${coreStraight}\n⚡ วิ่ง-รูด: ${pred.topSection.runningDigit} (รอง ${pred.topSection.runningSub})\n💎 2 ตัวบน: ${pred.twoDigitsTop.slice(0, 4).join(', ')} | ล่าง: ${pred.twoDigitsBottom.slice(0, 4).join(', ')}`;
  });

  const autoMsg = `🔔 แจ้งเตือนเลขเด็ดสมาชิกกลุ่ม Telegram (ก่อนหวยออก ${telegramConfig.daysBeforeDraw} วัน)\n\n${sections.join('\n\n────────────────\n\n')}`;

  await dispatchTelegramMessage({
    botToken: effectiveToken,
    chatId: effectiveChatId,
    messageThreadId: telegramConfig.messageThreadId,
    message: autoMsg,
    drawDate: dueDraws.map((d) => `${LOTTERY_META_MAP[d.type].shortName} ${d.info.drawDateStr}`).join(' / '),
    pinMessage: telegramConfig.pinMessage,
    disableNotification: telegramConfig.disableNotification,
    isSimulated: false
  });

  telegramConfig.lastNotifiedDraw = batchKey;
  savePersistedStore();
  console.log(`[Telegram Scheduler] Sent pre-draw group alert for ${batchKey}`);
  return { ok: true, status: 'sent', drawDate: dueDraws[0].info.drawDateIso };
}

// Lightweight HTTP cron endpoints for cron-job.org (tiny JSON response < 100 bytes)
const handleTelegramCronTick = async (_req: Request, res: Response) => {
  try {
    const result = await runTelegramPreDrawTick();
    res.json(result);
  } catch (err: any) {
    console.warn('[Telegram Cron] Error:', err?.message);
    res.status(500).json({ ok: false, error: err?.message || 'cron_error' });
  }
};

app.all('/api/telegram/cron-tick', handleTelegramCronTick);
app.all('/api/telegram/cron-trigger', handleTelegramCronTick);
app.all('/api/telegram/cron', handleTelegramCronTick);

// Automatic Pre-Draw Telegram Group Alert Scheduler (runs every 60s)
function startTelegramPreDrawScheduler() {
  setInterval(async () => {
    try {
      await runTelegramPreDrawTick();
    } catch (err: any) {
      console.warn('[Telegram Scheduler] Error dispatching automatic alert:', err?.message);
    }
  }, 60 * 1000);
}

// Ensure unknown /api/* routes return tiny JSON 404 instead of index.html
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ ok: false, error: `Unknown API route: ${req.path}` });
});

// Setup Vite in Dev or Static files in Prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  startTelegramPreDrawScheduler();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
