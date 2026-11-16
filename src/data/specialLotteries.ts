import { LotteryDraw, LotteryMeta, LotteryType, NextDrawInfo } from '../types/lottery';

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAY_NAMES = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
];

export const LOTTERY_META_MAP: Record<LotteryType, LotteryMeta> = {
  gov: {
    id: 'gov',
    name: 'สลากกินแบ่งรัฐบาล',
    shortName: 'รัฐบาล',
    scheduleLabel: 'ออกทุกวันที่ 1 และ 16',
    prizeFormatLabel: 'รางวัลที่ 1 (3 ตัวบน/2 ตัวบน) · เลขท้าย 2 ตัวล่าง',
    accentColor: 'amber'
  },
  baac: {
    id: 'baac',
    name: 'หวย ธ.ก.ส. (สลากออมทรัพย์)',
    shortName: 'ธ.ก.ส.',
    scheduleLabel: 'ออกทุกวันที่ 16 ของเดือน',
    prizeFormatLabel: '3 ตัวบน · 2 ตัวบน (ท้ายรางวัลที่ 1) & 2 ตัวล่าง',
    accentColor: 'emerald'
  },
  gsb: {
    id: 'gsb',
    name: 'หวยออมสิน (สลากออมสินพิเศษ)',
    shortName: 'ออมสิน',
    scheduleLabel: 'ออกทุกวันที่ 1 (2 ปี) และ 16 (1 ปี)',
    prizeFormatLabel: '3 ตัวบน · 2 ตัวบน & เลขท้าย 2 ตัวล่าง',
    accentColor: 'pink'
  }
};

export const LOTTERY_LIST: LotteryMeta[] = [
  LOTTERY_META_MAP.gov,
  LOTTERY_META_MAP.baac,
  LOTTERY_META_MAP.gsb
];

// Historical dataset for สลากออมทรัพย์ ธ.ก.ส. (ออกรางวัลทุกวันที่ 16)
export const BAAC_HISTORICAL_DRAWS: LotteryDraw[] = [
  {
    id: 'baac-2569-10-16',
    lotteryType: 'baac',
    drawDate: '16 ตุลาคม 2569',
    dateIso: '2026-10-16',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '941628',
    last2Digits: '73',
    first3Digits: ['941'],
    last3Digits: ['628']
  },
  {
    id: 'baac-2569-09-16',
    lotteryType: 'baac',
    drawDate: '16 กันยายน 2569',
    dateIso: '2026-09-16',
    dayOfWeek: 'วันพุธ',
    firstPrize: '720594',
    last2Digits: '51',
    first3Digits: ['720'],
    last3Digits: ['594']
  },
  {
    id: 'baac-2569-08-16',
    lotteryType: 'baac',
    drawDate: '16 สิงหาคม 2569',
    dateIso: '2026-08-16',
    dayOfWeek: 'วันอาทิตย์',
    firstPrize: '318842',
    last2Digits: '69',
    first3Digits: ['318'],
    last3Digits: ['842']
  },
  {
    id: 'baac-2569-07-16',
    lotteryType: 'baac',
    drawDate: '16 กรกฎาคม 2569',
    dateIso: '2026-07-16',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '562319',
    last2Digits: '84',
    first3Digits: ['562'],
    last3Digits: ['319']
  },
  {
    id: 'baac-2569-06-16',
    lotteryType: 'baac',
    drawDate: '16 มิถุนายน 2569',
    dateIso: '2026-06-16',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '409735',
    last2Digits: '26',
    first3Digits: ['409'],
    last3Digits: ['735']
  },
  {
    id: 'baac-2569-05-16',
    lotteryType: 'baac',
    drawDate: '16 พฤษภาคม 2569',
    dateIso: '2026-05-16',
    dayOfWeek: 'วันเสาร์',
    firstPrize: '834907',
    last2Digits: '15',
    first3Digits: ['834'],
    last3Digits: ['907']
  },
  {
    id: 'baac-2569-04-16',
    lotteryType: 'baac',
    drawDate: '16 เมษายน 2569',
    dateIso: '2026-04-16',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '275163',
    last2Digits: '42',
    first3Digits: ['275'],
    last3Digits: ['163']
  },
  {
    id: 'baac-2569-03-16',
    lotteryType: 'baac',
    drawDate: '16 มีนาคม 2569',
    dateIso: '2026-03-16',
    dayOfWeek: 'วันจันทร์',
    firstPrize: '614289',
    last2Digits: '94',
    first3Digits: ['614'],
    last3Digits: ['289']
  },
  {
    id: 'baac-2569-02-16',
    lotteryType: 'baac',
    drawDate: '16 กุมภาพันธ์ 2569',
    dateIso: '2026-02-16',
    dayOfWeek: 'วันจันทร์',
    firstPrize: '193452',
    last2Digits: '08',
    first3Digits: ['193'],
    last3Digits: ['452']
  },
  {
    id: 'baac-2569-01-16',
    lotteryType: 'baac',
    drawDate: '16 มกราคม 2569',
    dateIso: '2026-01-16',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '857630',
    last2Digits: '57',
    first3Digits: ['857'],
    last3Digits: ['630']
  },
  {
    id: 'baac-2568-12-16',
    lotteryType: 'baac',
    drawDate: '16 ธันวาคม 2568',
    dateIso: '2025-12-16',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '482914',
    last2Digits: '38',
    first3Digits: ['482'],
    last3Digits: ['914']
  },
  {
    id: 'baac-2568-11-16',
    lotteryType: 'baac',
    drawDate: '16 พฤศจิกายน 2568',
    dateIso: '2025-11-16',
    dayOfWeek: 'วันอาทิตย์',
    firstPrize: '706583',
    last2Digits: '21',
    first3Digits: ['706'],
    last3Digits: ['583']
  }
];

// Historical dataset for สลากออมสินพิเศษ (ออกวันที่ 1 และ 16)
export const GSB_HISTORICAL_DRAWS: LotteryDraw[] = [
  {
    id: 'gsb-2569-11-01',
    lotteryType: 'gsb',
    drawDate: '1 พฤศจิกายน 2569',
    dateIso: '2026-11-01',
    dayOfWeek: 'วันอาทิตย์',
    firstPrize: '639518',
    last2Digits: '64',
    first3Digits: ['639'],
    last3Digits: ['518']
  },
  {
    id: 'gsb-2569-10-16',
    lotteryType: 'gsb',
    drawDate: '16 ตุลาคม 2569',
    dateIso: '2026-10-16',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '482936',
    last2Digits: '29',
    first3Digits: ['482'],
    last3Digits: ['936']
  },
  {
    id: 'gsb-2569-10-01',
    lotteryType: 'gsb',
    drawDate: '1 ตุลาคม 2569',
    dateIso: '2026-10-01',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '715304',
    last2Digits: '82',
    first3Digits: ['715'],
    last3Digits: ['304']
  },
  {
    id: 'gsb-2569-09-16',
    lotteryType: 'gsb',
    drawDate: '16 กันยายน 2569',
    dateIso: '2026-09-16',
    dayOfWeek: 'วันพุธ',
    firstPrize: '204861',
    last2Digits: '47',
    first3Digits: ['204'],
    last3Digits: ['861']
  },
  {
    id: 'gsb-2569-09-01',
    lotteryType: 'gsb',
    drawDate: '1 กันยายน 2569',
    dateIso: '2026-09-01',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '953740',
    last2Digits: '18',
    first3Digits: ['953'],
    last3Digits: ['740']
  },
  {
    id: 'gsb-2569-08-16',
    lotteryType: 'gsb',
    drawDate: '16 สิงหาคม 2569',
    dateIso: '2026-08-16',
    dayOfWeek: 'วันอาทิตย์',
    firstPrize: '184692',
    last2Digits: '53',
    first3Digits: ['184'],
    last3Digits: ['692']
  },
  {
    id: 'gsb-2569-08-01',
    lotteryType: 'gsb',
    drawDate: '1 สิงหาคม 2569',
    dateIso: '2026-08-01',
    dayOfWeek: 'วันเสาร์',
    firstPrize: '527084',
    last2Digits: '76',
    first3Digits: ['527'],
    last3Digits: ['084']
  },
  {
    id: 'gsb-2569-07-16',
    lotteryType: 'gsb',
    drawDate: '16 กรกฎาคม 2569',
    dateIso: '2026-07-16',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '861539',
    last2Digits: '90',
    first3Digits: ['861'],
    last3Digits: ['539']
  },
  {
    id: 'gsb-2569-07-01',
    lotteryType: 'gsb',
    drawDate: '1 กรกฎาคม 2569',
    dateIso: '2026-07-01',
    dayOfWeek: 'วันพุธ',
    firstPrize: '349271',
    last2Digits: '35',
    first3Digits: ['349'],
    last3Digits: ['271']
  },
  {
    id: 'gsb-2569-06-16',
    lotteryType: 'gsb',
    drawDate: '16 มิถุนายน 2569',
    dateIso: '2026-06-16',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '702485',
    last2Digits: '14',
    first3Digits: ['702'],
    last3Digits: ['485']
  },
  {
    id: 'gsb-2569-06-01',
    lotteryType: 'gsb',
    drawDate: '1 มิถุนายน 2569',
    dateIso: '2026-06-01',
    dayOfWeek: 'วันจันทร์',
    firstPrize: '418927',
    last2Digits: '68',
    first3Digits: ['418'],
    last3Digits: ['927']
  },
  {
    id: 'gsb-2569-05-16',
    lotteryType: 'gsb',
    drawDate: '16 พฤษภาคม 2569',
    dateIso: '2026-05-16',
    dayOfWeek: 'วันเสาร์',
    firstPrize: '695140',
    last2Digits: '09',
    first3Digits: ['695'],
    last3Digits: ['140']
  },
  {
    id: 'gsb-2569-05-01',
    lotteryType: 'gsb',
    drawDate: '1 พฤษภาคม 2569',
    dateIso: '2026-05-01',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '283659',
    last2Digits: '41',
    first3Digits: ['283'],
    last3Digits: ['659']
  },
  {
    id: 'gsb-2569-04-16',
    lotteryType: 'gsb',
    drawDate: '16 เมษายน 2569',
    dateIso: '2026-04-16',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '530716',
    last2Digits: '87',
    first3Digits: ['530'],
    last3Digits: ['716']
  }
];

export function getNextDrawInfoByType(
  lotteryType: LotteryType = 'gov',
  referenceDate = new Date()
): NextDrawInfo {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const day = referenceDate.getDate();

  let nextDrawDate: Date;

  if (lotteryType === 'baac') {
    // หวย ธ.ก.ส. ออกรางวัลทุกวันที่ 16 ของเดือน
    if (day <= 16) {
      nextDrawDate = new Date(year, month, 16);
    } else {
      nextDrawDate = new Date(year, month + 1, 16);
    }
  } else {
    // สลากรัฐบาล และ หวยออมสิน ออกทุกวันที่ 1 และ 16
    if (day < 1) {
      nextDrawDate = new Date(year, month, 1);
    } else if (day >= 1 && day <= 16) {
      nextDrawDate = new Date(year, month, 16);
    } else {
      nextDrawDate = new Date(year, month + 1, 1);
    }

    if (lotteryType === 'gov') {
      if (nextDrawDate.getMonth() === 0 && nextDrawDate.getDate() === 16) {
        nextDrawDate.setDate(17);
      } else if (nextDrawDate.getMonth() === 4 && nextDrawDate.getDate() === 1) {
        nextDrawDate.setDate(2);
      }
    }
  }

  const autoPostDate = new Date(nextDrawDate);
  autoPostDate.setDate(autoPostDate.getDate() - 5);

  const diffTimeDraw = nextDrawDate.getTime() - referenceDate.getTime();
  const daysUntilDraw = Math.max(0, Math.ceil(diffTimeDraw / (1000 * 60 * 60 * 24)));

  const diffTimeAutoPost = autoPostDate.getTime() - referenceDate.getTime();
  const daysUntilAutoPost = Math.ceil(diffTimeAutoPost / (1000 * 60 * 60 * 24));

  const thaiBuddhistYear = nextDrawDate.getFullYear() + 543;
  const drawDateStr = `${nextDrawDate.getDate()} ${THAI_MONTH_NAMES[nextDrawDate.getMonth()]} ${thaiBuddhistYear}`;
  const dayOfWeek = THAI_DAY_NAMES[nextDrawDate.getDay()];

  const autoPostYear = autoPostDate.getFullYear() + 543;
  const autoPostDateStr = `${autoPostDate.getDate()} ${THAI_MONTH_NAMES[autoPostDate.getMonth()]} ${autoPostYear}`;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const drawDateIso = `${nextDrawDate.getFullYear()}-${pad(nextDrawDate.getMonth() + 1)}-${pad(nextDrawDate.getDate())}`;
  const autoPostDateIso = `${autoPostDate.getFullYear()}-${pad(autoPostDate.getMonth() + 1)}-${pad(autoPostDate.getDate())}`;

  return {
    lotteryType,
    lotteryName: LOTTERY_META_MAP[lotteryType].name,
    drawDateStr,
    drawDateIso,
    dayOfWeek,
    daysUntilDraw,
    autoPostDateIso,
    autoPostDateStr,
    daysUntilAutoPost,
    isAutoPostDue: daysUntilAutoPost <= 0 && daysUntilDraw > 0
  };
}

export function getAvailableDrawsByType(lotteryType: LotteryType, nextDraw: NextDrawInfo) {
  if (lotteryType === 'baac') {
    return [
      {
        id: 'next',
        drawDateStr: nextDraw.drawDateStr,
        dayOfWeek: nextDraw.dayOfWeek,
        drawDateIso: nextDraw.drawDateIso,
        badge: 'งวดถัดไป (ธ.ก.ส.)'
      },
      {
        id: 'baac-2569-10-16',
        drawDateStr: '16 ตุลาคม 2569',
        dayOfWeek: 'วันศุกร์',
        drawDateIso: '2026-10-16',
        badge: 'งวด 16 ต.ค.'
      },
      {
        id: 'baac-2569-09-16',
        drawDateStr: '16 กันยายน 2569',
        dayOfWeek: 'วันพุธ',
        drawDateIso: '2026-09-16',
        badge: 'งวด 16 ก.ย.'
      }
    ];
  }

  if (lotteryType === 'gsb') {
    return [
      {
        id: 'next',
        drawDateStr: nextDraw.drawDateStr,
        dayOfWeek: nextDraw.dayOfWeek,
        drawDateIso: nextDraw.drawDateIso,
        badge: 'งวดถัดไป (ออมสิน)'
      },
      {
        id: 'gsb-2569-11-01',
        drawDateStr: '1 พฤศจิกายน 2569',
        dayOfWeek: 'วันอาทิตย์',
        drawDateIso: '2026-11-01',
        badge: 'งวด 1 พ.ย. (2 ปี)'
      },
      {
        id: 'gsb-2569-10-16',
        drawDateStr: '16 ตุลาคม 2569',
        dayOfWeek: 'วันศุกร์',
        drawDateIso: '2026-10-16',
        badge: 'งวด 16 ต.ค. (1 ปี)'
      }
    ];
  }

  return [
    {
      id: 'next',
      drawDateStr: nextDraw.drawDateStr,
      dayOfWeek: nextDraw.dayOfWeek,
      drawDateIso: nextDraw.drawDateIso,
      badge: 'งวดถัดไป'
    },
    {
      id: '2569-11-01',
      drawDateStr: '1 พฤศจิกายน 2569',
      dayOfWeek: 'วันอาทิตย์',
      drawDateIso: '2026-11-01',
      badge: 'งวด 1 พ.ย.'
    },
    {
      id: '2569-10-16',
      drawDateStr: '16 ตุลาคม 2569',
      dayOfWeek: 'วันศุกร์',
      drawDateIso: '2026-10-16',
      badge: 'งวด 16 ต.ค.'
    }
  ];
}
