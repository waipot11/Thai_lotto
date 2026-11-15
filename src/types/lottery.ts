export interface LotteryDraw {
  id: string;
  drawDate: string; // e.g. "16 ตุลาคม 2569"
  dateIso: string; // "2026-10-16"
  dayOfWeek: string; // "วันศุกร์"
  firstPrize: string; // "459123"
  last2Digits: string; // "23"
  first3Digits: string[]; // ["123", "456"]
  last3Digits: string[]; // ["789", "012"]
}

export interface LotterySourceItem {
  id: string;
  name: string;
  category: 'master' | 'temple' | 'calendar' | 'stats' | 'news';
  icon: string;
  description: string;
  recentNumbers: {
    running: string[]; // e.g. ["2", "4"]
    twoDigits: string[]; // e.g. ["27", "24", "47"]
    threeDigits: string[]; // e.g. ["427", "927"]
  };
  positionalFocus?: {
    hundred: string;
    ten: string;
    unit: string;
  };
  weight: number; // 0 to 100
  enabled: boolean;
  reliabilityScore: number; // 0 to 100
}

export interface PositionDigitCandidate {
  digit: string;
  probability: number;
  sourceVotes: number;
  reason: string;
}

export interface StraightPickDetail {
  number: string;
  tag: string;
  votes: number;
  totalSources: number;
  sum: number;
  reason: string;
}

export interface GranularStatsBreakdown {
  totalSources: number;
  hundredAnalysis: PositionDigitCandidate[];
  tenAnalysis: PositionDigitCandidate[];
  unitAnalysis: PositionDigitCandidate[];
  eliminatedDigits: {
    digitOrPair: string;
    reason: string;
  }[];
  threeDigitStructure: {
    topSumRange: string;
    parityPattern: string;
    highLowPattern: string;
    historicalCohortSummary: string;
  };
}

export interface SniperThreeStraightFocus {
  megaSingleShot: string; // เม็ดเดียว 3 ตัวตรง ฟันธงขาด เช่น "427"
  consensusCount: number; // เช่น 19
  totalSources: number; // เช่น 22
  confidencePercent: number; // เช่น 97.6
  positionBreakdown: {
    hundred: string;
    ten: string;
    unit: string;
    hundredReason: string;
    tenReason: string;
    unitReason: string;
  };
  coreStraightPicks: StraightPickDetail[]; // เน้นหนัก 3 ชุดหลัก
  backupStraightPicks: StraightPickDetail[]; // กันพลาด 3 ชุดรอง
}

export interface AIPredictionResult {
  drawDate: string;
  drawDateIso: string;
  dayOfWeek: string;
  confidenceScore: number; // 0 - 100
  totalSourcesAnalyzed?: number;

  // Definitive 3-Digit Straight Sniper Focus
  sniperThreeStraight?: SniperThreeStraightFocus;

  // Deep Positional & Exclusion Granularity
  granularStats?: GranularStatsBreakdown;

  // High-Probability General Runners
  topRunners: {
    digit: string;
    score: number; // percentage
    reason: string;
  }[];

  // DUAL ENGINE: Separate Top (บน) and Bottom (ล่าง)
  topSection: {
    runningDigit: string; // วิ่งบน เม็ดเดียว
    runningSub: string; // วิ่งบน รอง
    hundredDigits: string[]; // เจาะหลักร้อยรางวัลที่ 1 เช่น ["4", "9", "2"]
    tenDigits: string[]; // เจาะหลักสิบบน เช่น ["2", "4"]
    unitDigits: string[]; // เจาะหลักหน่วยบน เช่น ["7", "4", "0"]
    twoDigitsTop: string[]; // 2 ตัวบน คัดเน้น
    threeDigitsStraight: string[]; // 3 ตัวตรง VIP
    threeDigitsToad: string[]; // 3 ตัวโต๊ด 6 กลับ
    sumDigitsTop: string[]; // ผลรวมแต้มบน
  };

  bottomSection: {
    runningDigit: string; // วิ่งล่าง เม็ดเดียว
    runningSub: string; // วิ่งล่าง รอง
    twoDigitsBottom: string[]; // 2 ตัวล่าง คัดเน้น
    sumDigitsBottom: string[]; // ผลรวมแต้มล่าง
    planetaryBottomPair: string; // คู่สมพงษ์ล่าง
  };

  // Dual-Hit Target Probability
  dualHitProbability: {
    topHitRate: number; // % โอกาสเข้าบน
    bottomHitRate: number; // % โอกาสเข้าล่าง
    bothHitRate: number; // % โอกาสเข้าพร้อมกันทั้งบนและล่าง
  };

  twoDigitsTop: string[];
  twoDigitsBottom: string[];
  threeDigitsStraight: string[];
  threeDigitsToad: string[];
  cautionDoubles: string[]; // e.g. ["22", "44"]
  luckyDayPlanetaryNumbers: string[]; // e.g. ["2", "4", "7", "0"]
  aiNarrative: string;
  multiSourceSummary: {
    sourceName: string;
    category?: 'master' | 'temple' | 'calendar' | 'stats' | 'news';
    concordance: string;
    highlightDigits: string[];
    threeDigitPick?: string;
  }[];
  facebookCaption: string;
  generatedAt: string;
}

export interface FacebookConfig {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  isAutoPostEnabled: boolean;
  postDaysBefore: number; // default 5 days
  postTime: string; // e.g. "09:00"
  targetDrawDate: string;
  includeImageCard: boolean;
  watermarkText: string;
  postHashtags: string;
  disclaimer: string;
}

export interface FacebookPostLog {
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

export interface LineNotifyConfig {
  isLineEnabled: boolean;
  daysBeforeDraw: number; // default 1 day before draw
  notifyTime: string; // e.g. "08:30"
  deliveryMode: 'messaging_api_push' | 'messaging_api_broadcast' | 'webhook';
  channelAccessToken: string;
  targetId: string; // LINE User ID or Group ID
  webhookUrl: string;
  includeThreeStraight: boolean;
  includeTwoDigits: boolean;
  includeRunners: boolean;
  lastNotifiedDraw?: string;
}

export interface LineEnvStatus {
  hasChannelAccessToken: boolean;
  channelAccessTokenPreview?: string;
  hasTargetId: boolean;
  targetIdPreview?: string;
  hasWebhookUrl: boolean;
  webhookUrlPreview?: string;
}

export interface CapturedLineSource {
  id: string;
  sourceType: 'user' | 'group' | 'room';
  eventType: string;
  lastMessage?: string;
  timestamp: string;
}

export interface LineNotifyLog {
  id: string;
  timestamp: string;
  drawDate: string;
  message: string;
  deliveryMode: string;
  status: 'sent' | 'scheduled' | 'failed' | 'simulated';
  recipientSummary?: string;
  errorMessage?: string;
}

export interface TelegramConfig {
  isTelegramEnabled: boolean;
  daysBeforeDraw: number; // 1 to 5 days before draw
  notifyTime: string; // e.g. "08:30"
  botToken: string;
  chatId: string; // Group/Supergroup ID (-100...) or @username
  messageThreadId?: string; // Optional Topic ID in Telegram Supergroups
  pinMessage: boolean;
  disableNotification: boolean;
  includeThreeStraight: boolean;
  includeTwoDigits: boolean;
  includeRunners: boolean;
  lastNotifiedDraw?: string;
}

export interface TelegramEnvStatus {
  hasBotToken: boolean;
  botTokenPreview?: string;
  hasChatId: boolean;
  chatIdPreview?: string;
}

export interface TelegramDiscoveredChat {
  chatId: string;
  title: string;
  type: string;
  username?: string;
}

export interface TelegramLog {
  id: string;
  timestamp: string;
  drawDate: string;
  message: string;
  status: 'sent' | 'scheduled' | 'failed' | 'simulated';
  chatSummary?: string;
  telegramMessageId?: number;
  errorMessage?: string;
}

export interface NextDrawInfo {
  drawDateStr: string;
  drawDateIso: string;
  dayOfWeek: string;
  daysUntilDraw: number;
  autoPostDateIso: string;
  autoPostDateStr: string;
  daysUntilAutoPost: number;
  isAutoPostDue: boolean;
  lineNotifyDateIso: string;
  lineNotifyDateStr: string;
  daysUntilLineNotify: number;
  isLineNotifyDue: boolean;
}

