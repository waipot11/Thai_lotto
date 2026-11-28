export type Lottery4DType = 'lao' | 'malay' | 'vietnam' | 'thai' | 'baac' | 'gsb';
export type LotteryType = Lottery4DType;

export type DrawImportSource =
  | 'database'
  | 'gemini-search'
  | 'text-cleaner'
  | 'image-ocr'
  | 'manual';

export interface Lottery4DMeta {
  id: Lottery4DType;
  name: string;
  shortName: string;
  countryCode: 'LA' | 'MY' | 'VN' | 'TH';
  countryName: string;
  strategyMode: '4d' | 'win4_3d';
  scheduleLabel: string;
  drawDaysOfWeek: number[]; // 0 = Sun, 1 = Mon, ... 6 = Sat (or empty for date-based like 1 & 16)
  drawTimeLabel: string;
  drawTimeMinutes: number; // Official draw time in Bangkok minutes from 00:00 (e.g. 10:30 = 630)
  strictParsingRule: string;
  searchQueryHint: string;
  accentColor: 'emerald' | 'sky' | 'rose' | 'amber' | 'teal' | 'pink';
}

export interface LotteryDraw4D {
  id: string;
  lotteryType: Lottery4DType;
  drawDate: string; // e.g. "25 พฤศจิกายน 2569"
  dateIso: string; // "2026-11-25"
  dayOfWeek: string; // "วันพุธ"
  number4D: string; // Strictly 4 digits "0000"-"9999"
  rawPrize?: string; // Original 6-digit / 5-digit / 4-digit main prize for verification
  source: DrawImportSource;
}

// Legacy compatibility interface for older modules/utilities
export interface LotteryDraw {
  id: string;
  lotteryType?: string;
  drawDate: string;
  dateIso: string;
  dayOfWeek: string;
  firstPrize: string;
  last2Digits: string;
  first3Digits: string[];
  last3Digits: string[];
}

export interface DigitFrequencyItem {
  digit: string; // '0'..'9'
  count: number;
  percentage: number;
  expectedAvg: number;
  ratioToAvg: number; // >= 2.0 means Hot Outlier
  isHotOutlier: boolean;
  isHot: boolean;
  isCold: boolean;
  gapDraws: number; // draws since last seen at this position
}

export interface PositionStats4D {
  positionIndex: 0 | 1 | 2 | 3; // 0=พัน, 1=ร้อย, 2=สิบ, 3=หน่วย
  positionLabel: string;
  digits: DigitFrequencyItem[]; // sorted 0..9
  hotDigits: DigitFrequencyItem[]; // top 3
  coldDigits: DigitFrequencyItem[]; // bottom 3
  hotOutliers: DigitFrequencyItem[]; // ratioToAvg >= 2.0
}

export interface RatioStatItem {
  ratio: string; // e.g. '2:2', '3:1', '1:3', '4:0', '0:4'
  label: string;
  count: number;
  percentage: number;
}

export interface SumBucketStat {
  sum: number; // 0..36
  count: number;
  percentage: number;
  isOptimalZone: boolean;
}

export interface Positional4DStats {
  totalDraws: number;
  positions: [PositionStats4D, PositionStats4D, PositionStats4D, PositionStats4D];
  evenOddDistribution: RatioStatItem[]; // 4:0, 3:1, 2:2, 1:3, 0:4
  highLowDistribution: RatioStatItem[]; // 4:0, 3:1, 2:2, 1:3, 0:4 (0-4 Low, 5-9 High)
  sumDistribution: SumBucketStat[]; // 0..36
  optimalSumMin: number;
  optimalSumMax: number;
  optimalSumHitRate: number;
  topEvenOddRatios: string[];
  topHighLowRatios: string[];
  repeat4DRate: number;
}

export interface Sniper4DSet {
  rank: number;
  number4D: string;
  confidence: number;
  sum: number;
  evenOddRatio: string;
  highLowRatio: string;
  isHotOutlierAnchored: boolean;
  outlierNotes: string[];
  rationale: string;
}

export type CircuitBreakerState = 'normal' | 'yellow_nearmiss' | 'red_pause';

export interface CircuitBreakerAnalysis {
  status: CircuitBreakerState;
  statusTitle: string;
  statusBadgeText: string;
  consecutiveMisses: number;
  recentNearMissCount: number;
  coldStreakWithoutNearMiss: number;
  naturalLosingStreakAvg: number;
  naturalColdStreakAvg: number;
  recommendedSetsCount: number; // 4 in normal, 1 in yellow_nearmiss, 0 in red_pause
  recommendedUnitCostBaht: number; // 120
  recommendedBudgetBaht: number; // 480 in normal, 120 in yellow_nearmiss, 0 in red_pause
  defensiveRecommendation: string;
  backupTwoAndThreeToad: {
    twoDigits: string[];
    threeDigitToad: string[];
  };
  reason: string;
}

export interface WeeklyWinRateItem {
  weekKey: string; // e.g. "2026-W47"
  weekLabel: string;
  drawsCount: number;
  winCount: number;
  nearMissCount: number;
  winRatePercent: number;
  nearMissRatePercent: number;
  netProfitBaht: number;
}

export interface Backtest4DAuditRow {
  drawId: string;
  drawDate: string;
  dateIso: string;
  dayOfWeek: string;
  actual4D: string;
  sniperSets: string[]; // 4 predicted 4D sets (or 1 during defensive scaling)
  superNumber4D: string;
  setsPlayedCount: number;
  stakeBaht: number;
  payoutBaht: number;
  netProfitBaht: number;
  hitType: '4d_straight' | '4d_toad' | '3d_back' | '2d_back' | 'near_miss' | 'cold_miss';
  matchedDigitsCount: number; // max distinct/positional digit overlap with actual4D
  isWin: boolean;
  isNearMiss: boolean;
  circuitBreakerStateAtDraw: CircuitBreakerState;
  detailText: string;
}

export interface Backtest4DReport {
  lotteryType: Lottery4DType;
  totalEvaluated: number; // up to 200 draws
  requestedWindow: number; // 200
  totalStakedBaht: number;
  totalPayoutBaht: number;
  netProfitBaht: number;
  roiPercent: number;
  win4StraightCount: number;
  win4ToadCount: number;
  win3BackCount: number;
  win2BackCount: number;
  totalWinningDraws: number;
  nearMissDraws: number;
  coldMissDraws: number;
  winRatePercent: number;
  nearMissOrWinRatePercent: number;
  maxConsecutiveLosses: number;
  maxDrawdownBaht: number;
  naturalLosingStreakAvg: number;
  naturalColdStreakAvg: number;
  consistencyScore: number; // 0-100 stability metric
  weeklyBreakdown: WeeklyWinRateItem[];
  circuitBreaker: CircuitBreakerAnalysis;
  equityCurve: { index: number; label: string; cumulativeProfit: number }[];
  auditRows: Backtest4DAuditRow[];
}

export interface SmartFilterCriteria {
  evenOddRatios: string[]; // e.g. ['2:2', '3:1']
  highLowRatios: string[]; // e.g. ['2:2', '3:1', '1:3']
  sumMin: number; // 0..36
  sumMax: number; // 0..36
  killDigitsByPosition: [string[], string[], string[], string[]]; // pos 0..3
  excludeHistoricalRepeats: boolean;
}

export interface Filtered4DCandidate {
  number4D: string;
  sum: number;
  evenOddRatio: string;
  highLowRatio: string;
  aiScore: number;
}

export type Source4DCategory =
  | 'สถิติ & AI'
  | 'โหราศาสตร์ & กำลังวัน'
  | 'สูตรเฉพาะ 4 ประเทศ'
  | 'สำนักเลขชน';

export interface Lottery4DSourceEntry {
  id: string;
  rankIndex: number; // 1..22
  sourceName: string;
  category: Source4DCategory;
  weight: number;
  adaptiveMultiplier?: number; // Walk-forward causal multiplier (0.65x - 1.65x)
  effectiveWeight?: number; // weight * adaptiveMultiplier
  recentHitsCount?: number; // recent hit alignment score in calibration window
  digits4D: [string, string, string, string];
  candidate4D: string;
  twoBack: string;
  rationale: string;
  matchesSuperCount: number; // 0..4 positional alignment with Super Number 4D
}

export interface PositionCollisionRow {
  digit: string; // '0'..'9'
  posCounts: [number, number, number, number]; // votes out of 22 at หลักพัน, หลักร้อย, หลักสิบ, หลักหน่วย
  uniqueSourcesCount: number; // out of 22 sources containing this digit anywhere
  totalVotes: number; // sum of posCounts
  isTopConsensusByPos: [boolean, boolean, boolean, boolean];
  isHotOutlierByPos: [boolean, boolean, boolean, boolean];
}

export interface DeepAnalysisSection4D {
  dayOfWeekTitle: string;
  dayPlanetaryDigits: string[];
  dayOfWeekSummary: string;
  regimeTrendSummary: string;
  consensusVerdict: string;
  adaptiveSummary?: string;
  markovTopPairs?: string[];
  positionalLeaders: {
    positionLabel: string;
    topDigit: string;
    votesOutOf22: number;
    runnerUpDigit: string;
    runnerUpVotes: number;
  }[];
  averageAgreementOutOf22: number;
}

export interface Win4StrategyBreakdown {
  coreDigits4: string[]; // 4 distinct core digits from 200-draw + 22-source fusion
  megaThreeStraight: string; // top-ranked 3-digit straight from coreDigits4
  threeDigitStraightSets: string[]; // 4 focus straight 3-digit sets (4 ชุดเน้น)
  threeDigitStraight24Sets: string[]; // all 24 straight 3-digit permutations (4*3*2) without doubles
  threeDigitDoubleHedgeSets: string[]; // top 4 double/harn 3-digit hedge sets formed from coreDigits4
  recentDoubleRatePct: number; // recent 20-draw 3D double/harn rate (%)
  doubleGapDraws: number; // consecutive draws without 3D double/harn
  isDoubleRiskElevated: boolean; // true if double/harn cycle is elevated
  threeDigitToadSets: string[]; // 4 sorted 3-digit toad combinations C(4,3)
  twoDigitNoDouble12: string[]; // 12 permutations 4*3
  twoDigitDoubles4: string[]; // 4 doubles
  rationale: string;
}

export interface PostDrawScorecard {
  drawDate: string;
  actual4D: string;
  actual3D: string;
  predictedHeadline: string;
  predictedSets: string[];
  hitStatus: 'exact_focus' | 'hit_24' | 'hit_4d' | 'hit_2d' | 'near_miss' | 'miss';
  hitMessage: string;
  matchedSourcesCount22: number;
  topMatchedSources: string[];
}

export interface AIPrediction4DResult {
  lotteryType: Lottery4DType;
  lotteryName: string;
  strategyMode: '4d' | 'win4_3d';
  drawDate: string;
  drawDateIso: string;
  dayOfWeek: string;
  superNumber4D: string;
  sniperSets: Sniper4DSet[];
  win4Breakdown: Win4StrategyBreakdown;
  backupThreeToad: string[];
  backupTwoBack: string[];
  hotOutliersSummary: {
    positionLabel: string;
    digit: string;
    ratioToAvg: number;
  }[];
  stats: Positional4DStats;
  circuitBreaker: CircuitBreakerAnalysis;
  consistencyScore: number;
  winRate200: number;
  nearMissOrWinRate200: number;
  totalSourcesAnalyzed: number;
  sources22: Lottery4DSourceEntry[];
  collisionMatrix: PositionCollisionRow[];
  deepAnalysis: DeepAnalysisSection4D;
  narrative: string;
  generatedAt: string;
}

export interface NextDrawInfo {
  lotteryType?: Lottery4DType;
  lotteryName?: string;
  drawDateStr: string;
  drawDateIso: string;
  dayOfWeek: string;
  daysUntilDraw: number;
  drawTimeLabel?: string;
  autoPostDateIso: string;
  autoPostDateStr: string;
  daysUntilAutoPost: number;
  isAutoPostDue: boolean;
}

export interface GroundingSourceLink {
  title: string;
  uri: string;
}

export interface ExtractedDrawCandidate {
  id: string;
  drawDate: string;
  dateIso: string;
  dayOfWeek: string;
  number4D: string;
  rawPrize?: string;
  isValid4D: boolean;
  validationNote?: string;
  selected: boolean;
}

export interface TelegramConfig {
  isTelegramEnabled: boolean;
  scheduleMode?: 'per_lottery_offset' | 'fixed_time'; // per_lottery_offset = X minutes before each lottery's official draw time
  minutesBeforeDraw?: number; // 30..180 mins before draw time when scheduleMode === 'per_lottery_offset'
  daysBeforeDraw: number; // 0 (day of draw) to 3 days before
  notifyTime: string; // used when scheduleMode === 'fixed_time'
  botToken: string;
  chatId: string;
  messageThreadId?: string;
  pinMessage: boolean;
  disableNotification: boolean;
  includeSniperSets: boolean;
  includeDefensiveScaling: boolean;
  includeBackups: boolean;
  lotteryTypes: Lottery4DType[];
  lastNotifiedDraw?: string;
  lastNotifiedByLottery?: Partial<Record<Lottery4DType, string>>;
}

export interface TelegramEnvStatus {
  hasBotToken: boolean;
  botTokenPreview?: string;
  hasChatId: boolean;
  chatIdPreview?: string;
  hasKvPersistence?: boolean;
  hasCronSecret?: boolean;
  hasAdminSecret?: boolean;
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
