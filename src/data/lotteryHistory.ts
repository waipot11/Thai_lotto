import { LotteryDraw } from '../types/lottery';

// Real historical Thai Government Lottery (สลากกินแบ่งรัฐบาล) dataset
export const HISTORICAL_DRAWS: LotteryDraw[] = [
  // งวดล่าสุด (16 พฤศจิกายน 2569 / 2026) - ผลออกจริง
  {
    id: '2569-11-16',
    drawDate: '16 พฤศจิกายน 2569',
    dateIso: '2026-11-16',
    dayOfWeek: 'วันจันทร์',
    firstPrize: '645654',
    last2Digits: '06',
    first3Digits: ['101', '938'],
    last3Digits: ['106', '782']
  },
  // 16 ตุลาคม 2569 / 2026
  {
    id: '2569-10-16',
    drawDate: '16 ตุลาคม 2569',
    dateIso: '2026-10-16',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '285781',
    last2Digits: '48',
    first3Digits: ['029', '428'],
    last3Digits: ['680', '981']
  },
  // 2567 (2024)
  {
    id: '2567-10-01',
    drawDate: '1 ตุลาคม 2567',
    dateIso: '2024-10-01',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '884784',
    last2Digits: '89',
    first3Digits: ['212', '453'],
    last3Digits: ['608', '971']
  },
  {
    id: '2567-09-16',
    drawDate: '16 กันยายน 2567',
    dateIso: '2024-09-16',
    dayOfWeek: 'วันจันทร์',
    firstPrize: '608662',
    last2Digits: '37',
    first3Digits: ['230', '904'],
    last3Digits: ['008', '472']
  },
  {
    id: '2567-09-01',
    drawDate: '1 กันยายน 2567',
    dateIso: '2024-09-01',
    dayOfWeek: 'วันอาทิตย์',
    firstPrize: '199606',
    last2Digits: '94',
    first3Digits: ['173', '220'],
    last3Digits: ['380', '415']
  },
  {
    id: '2567-08-16',
    drawDate: '16 สิงหาคม 2567',
    dateIso: '2024-08-16',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '095867',
    last2Digits: '28',
    first3Digits: ['495', '604'],
    last3Digits: ['726', '970']
  },
  {
    id: '2567-08-01',
    drawDate: '1 สิงหาคม 2567',
    dateIso: '2024-08-01',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '756532',
    last2Digits: '91',
    first3Digits: ['120', '481'],
    last3Digits: ['576', '844']
  },
  {
    id: '2567-07-16',
    drawDate: '16 กรกฎาคม 2567',
    dateIso: '2024-07-16',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '367336',
    last2Digits: '21',
    first3Digits: ['411', '652'],
    last3Digits: ['721', '828']
  },
  {
    id: '2567-07-01',
    drawDate: '1 กรกฎาคม 2567',
    dateIso: '2024-07-01',
    dayOfWeek: 'วันจันทร์',
    firstPrize: '922608',
    last2Digits: '89',
    first3Digits: ['214', '883'],
    last3Digits: ['260', '830']
  },
  {
    id: '2567-06-16',
    drawDate: '16 มิถุนายน 2567',
    dateIso: '2024-06-16',
    dayOfWeek: 'วันอาทิตย์',
    firstPrize: '518504',
    last2Digits: '31',
    first3Digits: ['428', '447'],
    last3Digits: ['426', '466']
  },
  {
    id: '2567-06-01',
    drawDate: '1 มิถุนายน 2567',
    dateIso: '2024-06-01',
    dayOfWeek: 'วันเสาร์',
    firstPrize: '530392',
    last2Digits: '42',
    first3Digits: ['361', '697'],
    last3Digits: ['215', '877']
  },
  {
    id: '2567-05-16',
    drawDate: '16 พฤษภาคม 2567',
    dateIso: '2024-05-16',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '205690',
    last2Digits: '60',
    first3Digits: ['747', '885'],
    last3Digits: ['070', '137']
  },
  {
    id: '2567-05-02',
    drawDate: '2 พฤษภาคม 2567',
    dateIso: '2024-05-02',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '980116',
    last2Digits: '17',
    first3Digits: ['104', '383'],
    last3Digits: ['633', '833']
  },
  {
    id: '2567-04-16',
    drawDate: '16 เมษายน 2567',
    dateIso: '2024-04-16',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '943598',
    last2Digits: '79',
    first3Digits: ['727', '729'],
    last3Digits: ['154', '200']
  },
  {
    id: '2567-04-01',
    drawDate: '1 เมษายน 2567',
    dateIso: '2024-04-01',
    dayOfWeek: 'วันจันทร์',
    firstPrize: '803481',
    last2Digits: '90',
    first3Digits: ['122', '809'],
    last3Digits: ['559', '947']
  },
  {
    id: '2567-03-16',
    drawDate: '16 มีนาคม 2567',
    dateIso: '2024-03-16',
    dayOfWeek: 'วันเสาร์',
    firstPrize: '997626',
    last2Digits: '78',
    first3Digits: ['509', '571'],
    last3Digits: ['794', '980']
  },
  {
    id: '2567-03-01',
    drawDate: '1 มีนาคม 2567',
    dateIso: '2024-03-01',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '253603',
    last2Digits: '79',
    first3Digits: ['900', '975'],
    last3Digits: ['382', '703']
  },
  {
    id: '2567-02-16',
    drawDate: '16 กุมภาพันธ์ 2567',
    dateIso: '2024-02-16',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '941395',
    last2Digits: '43',
    first3Digits: ['056', '330'],
    last3Digits: ['375', '875']
  },
  {
    id: '2567-02-01',
    drawDate: '1 กุมภาพันธ์ 2567',
    dateIso: '2024-02-01',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '607063',
    last2Digits: '09',
    first3Digits: ['454', '943'],
    last3Digits: ['544', '591']
  },
  {
    id: '2567-01-17',
    drawDate: '17 มกราคม 2567',
    dateIso: '2024-01-17',
    dayOfWeek: 'วันพุธ',
    firstPrize: '105979',
    last2Digits: '61',
    first3Digits: ['429', '931'],
    last3Digits: ['196', '635']
  },

  // 2566 (2023)
  {
    id: '2566-12-30',
    drawDate: '30 ธันวาคม 2566',
    dateIso: '2023-12-30',
    dayOfWeek: 'วันเสาร์',
    firstPrize: '625544',
    last2Digits: '89',
    first3Digits: ['600', '648'],
    last3Digits: ['493', '882']
  },
  {
    id: '2566-12-16',
    drawDate: '16 ธันวาคม 2566',
    dateIso: '2023-12-16',
    dayOfWeek: 'วันเสาร์',
    firstPrize: '356757',
    last2Digits: '85',
    first3Digits: ['410', '584'],
    last3Digits: ['586', '964']
  },
  {
    id: '2566-12-01',
    drawDate: '1 ธันวาคม 2566',
    dateIso: '2023-12-01',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '251097',
    last2Digits: '91',
    first3Digits: ['265', '288'],
    last3Digits: ['055', '290']
  },
  {
    id: '2566-11-16',
    drawDate: '16 พฤศจิกายน 2566',
    dateIso: '2023-11-16',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '557990',
    last2Digits: '14',
    first3Digits: ['346', '412'],
    last3Digits: ['778', '961']
  },
  {
    id: '2566-11-01',
    drawDate: '1 พฤศจิกายน 2566',
    dateIso: '2023-11-01',
    dayOfWeek: 'วันพุธ',
    firstPrize: '743951',
    last2Digits: '63',
    first3Digits: ['723', '913'],
    last3Digits: ['238', '383']
  },
  {
    id: '2566-10-16',
    drawDate: '16 ตุลาคม 2566',
    dateIso: '2023-10-16',
    dayOfWeek: 'วันจันทร์',
    firstPrize: '931446',
    last2Digits: '44',
    first3Digits: ['193', '398'],
    last3Digits: ['712', '998']
  },
  {
    id: '2566-10-01',
    drawDate: '1 ตุลาคม 2566',
    dateIso: '2023-10-01',
    dayOfWeek: 'วันอาทิตย์',
    firstPrize: '727202',
    last2Digits: '66',
    first3Digits: ['324', '355'],
    last3Digits: ['426', '615']
  },
  {
    id: '2566-09-16',
    drawDate: '16 กันยายน 2566',
    dateIso: '2023-09-16',
    dayOfWeek: 'วันเสาร์',
    firstPrize: '320812',
    last2Digits: '46',
    first3Digits: ['699', '037'],
    last3Digits: ['344', '057']
  },
  {
    id: '2566-09-01',
    drawDate: '1 กันยายน 2566',
    dateIso: '2023-09-01',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '915478',
    last2Digits: '91',
    first3Digits: ['521', '596'],
    last3Digits: ['692', '743']
  },
  {
    id: '2566-08-16',
    drawDate: '16 สิงหาคม 2566',
    dateIso: '2023-08-16',
    dayOfWeek: 'วันพุธ',
    firstPrize: '471782',
    last2Digits: '67',
    first3Digits: ['431', '330'],
    last3Digits: ['737', '282']
  },
  {
    id: '2566-07-31',
    drawDate: '31 กรกฎาคม 2566',
    dateIso: '2023-07-31',
    dayOfWeek: 'วันจันทร์',
    firstPrize: '260453',
    last2Digits: '11',
    first3Digits: ['268', '708'],
    last3Digits: ['387', '601']
  },
  {
    id: '2566-07-16',
    drawDate: '16 กรกฎาคม 2566',
    dateIso: '2023-07-16',
    dayOfWeek: 'วันอาทิตย์',
    firstPrize: '169530',
    last2Digits: '62',
    first3Digits: ['261', '384'],
    last3Digits: ['780', '924']
  },
  {
    id: '2566-07-01',
    drawDate: '1 กรกฎาคม 2566',
    dateIso: '2023-07-01',
    dayOfWeek: 'วันเสาร์',
    firstPrize: '922605',
    last2Digits: '16',
    first3Digits: ['281', '867'],
    last3Digits: ['491', '947']
  },
  {
    id: '2566-06-16',
    drawDate: '16 มิถุนายน 2566',
    dateIso: '2023-06-16',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '264872',
    last2Digits: '30',
    first3Digits: ['519', '681'],
    last3Digits: ['202', '947']
  },
  {
    id: '2566-06-01',
    drawDate: '1 มิถุนายน 2566',
    dateIso: '2023-06-01',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '125272',
    last2Digits: '09',
    first3Digits: ['681', '000'],
    last3Digits: ['386', '971']
  },
  {
    id: '2566-05-16',
    drawDate: '16 พฤษภาคม 2566',
    dateIso: '2023-05-16',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '132903',
    last2Digits: '99',
    first3Digits: ['739', '678'],
    last3Digits: ['693', '731']
  },
  {
    id: '2566-05-02',
    drawDate: '2 พฤษภาคม 2566',
    dateIso: '2023-05-02',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '842097',
    last2Digits: '03',
    first3Digits: ['268', '424'],
    last3Digits: ['544', '665']
  },
  {
    id: '2566-04-16',
    drawDate: '16 เมษายน 2566',
    dateIso: '2023-04-16',
    dayOfWeek: 'วันอาทิตย์',
    firstPrize: '984906',
    last2Digits: '71',
    first3Digits: ['670', '678'],
    last3Digits: ['797', '551']
  },
  {
    id: '2566-04-01',
    drawDate: '1 เมษายน 2566',
    dateIso: '2023-04-01',
    dayOfWeek: 'วันเสาร์',
    firstPrize: '087907',
    last2Digits: '99',
    first3Digits: ['111', '914'],
    last3Digits: ['290', '698']
  },
  {
    id: '2566-03-16',
    drawDate: '16 มีนาคม 2566',
    dateIso: '2023-03-16',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '025873',
    last2Digits: '73',
    first3Digits: ['420', '800'],
    last3Digits: ['355', '544']
  },
  {
    id: '2566-03-01',
    drawDate: '1 มีนาคม 2566',
    dateIso: '2023-03-01',
    dayOfWeek: 'วันพุธ',
    firstPrize: '417652',
    last2Digits: '55',
    first3Digits: ['577', '983'],
    last3Digits: ['083', '228']
  },
  {
    id: '2566-02-16',
    drawDate: '16 กุมภาพันธ์ 2566',
    dateIso: '2023-02-16',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '590417',
    last2Digits: '80',
    first3Digits: ['664', '195'],
    last3Digits: ['593', '377']
  },
  {
    id: '2566-02-01',
    drawDate: '1 กุมภาพันธ์ 2566',
    dateIso: '2023-02-01',
    dayOfWeek: 'วันพุธ',
    firstPrize: '297411',
    last2Digits: '92',
    first3Digits: ['181', '789'],
    last3Digits: ['664', '101']
  },
  {
    id: '2566-01-17',
    drawDate: '17 มกราคม 2566',
    dateIso: '2023-01-17',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '812519',
    last2Digits: '47',
    first3Digits: ['443', '389'],
    last3Digits: ['849', '564']
  },

  // 2565 (2022)
  {
    id: '2565-12-30',
    drawDate: '30 ธันวาคม 2565',
    dateIso: '2022-12-30',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '157196',
    last2Digits: '58',
    first3Digits: ['007', '522'],
    last3Digits: ['250', '425']
  },
  {
    id: '2565-12-16',
    drawDate: '16 ธันวาคม 2565',
    dateIso: '2022-12-16',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '845093',
    last2Digits: '14',
    first3Digits: ['223', '912'],
    last3Digits: ['402', '855']
  },
  {
    id: '2565-12-01',
    drawDate: '1 ธันวาคม 2565',
    dateIso: '2022-12-01',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '375805',
    last2Digits: '08',
    first3Digits: ['170', '786'],
    last3Digits: ['409', '421']
  },
  {
    id: '2565-11-16',
    drawDate: '16 พฤศจิกายน 2565',
    dateIso: '2022-11-16',
    dayOfWeek: 'วันพุธ',
    firstPrize: '121789',
    last2Digits: '64',
    first3Digits: ['722', '532'],
    last3Digits: ['157', '973']
  },
  {
    id: '2565-11-01',
    drawDate: '1 พฤศจิกายน 2565',
    dateIso: '2022-11-01',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '913106',
    last2Digits: '70',
    first3Digits: ['722', '839'],
    last3Digits: ['343', '922']
  },
  {
    id: '2565-10-16',
    drawDate: '16 ตุลาคม 2565',
    dateIso: '2022-10-16',
    dayOfWeek: 'วันอาทิตย์',
    firstPrize: '613106',
    last2Digits: '15',
    first3Digits: ['158', '037'],
    last3Digits: ['606', '799']
  },
  {
    id: '2565-10-01',
    drawDate: '1 ตุลาคม 2565',
    dateIso: '2022-10-01',
    dayOfWeek: 'วันเสาร์',
    firstPrize: '484669',
    last2Digits: '50',
    first3Digits: ['206', '996'],
    last3Digits: ['278', '194']
  },
  {
    id: '2565-09-16',
    drawDate: '16 กันยายน 2565',
    dateIso: '2022-09-16',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '943703',
    last2Digits: '75',
    first3Digits: ['971', '540'],
    last3Digits: ['631', '432']
  },
  {
    id: '2565-09-01',
    drawDate: '1 กันยายน 2565',
    dateIso: '2022-09-01',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '929332',
    last2Digits: '83',
    first3Digits: ['725', '298'],
    last3Digits: ['604', '210']
  },
  {
    id: '2565-08-16',
    drawDate: '16 สิงหาคม 2565',
    dateIso: '2022-08-16',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '331583',
    last2Digits: '42',
    first3Digits: ['271', '300'],
    last3Digits: ['876', '284']
  },
  {
    id: '2565-08-01',
    drawDate: '1 สิงหาคม 2565',
    dateIso: '2022-08-01',
    dayOfWeek: 'วันจันทร์',
    firstPrize: '436594',
    last2Digits: '14',
    first3Digits: ['893', '266'],
    last3Digits: ['447', '282']
  },
  {
    id: '2565-07-16',
    drawDate: '16 กรกฎาคม 2565',
    dateIso: '2022-07-16',
    dayOfWeek: 'วันเสาร์',
    firstPrize: '620405',
    last2Digits: '53',
    first3Digits: ['159', '834'],
    last3Digits: ['061', '279']
  },
  {
    id: '2565-07-01',
    drawDate: '1 กรกฎาคม 2565',
    dateIso: '2022-07-01',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '981417',
    last2Digits: '61',
    first3Digits: ['242', '287'],
    last3Digits: ['542', '002']
  },
  {
    id: '2565-06-16',
    drawDate: '16 มิถุนายน 2565',
    dateIso: '2022-06-16',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '361807',
    last2Digits: '92',
    first3Digits: ['549', '285'],
    last3Digits: ['228', '106']
  },
  {
    id: '2565-06-01',
    drawDate: '1 มิถุนายน 2565',
    dateIso: '2022-06-01',
    dayOfWeek: 'วันพุธ',
    firstPrize: '319196',
    last2Digits: '02',
    first3Digits: ['679', '817'],
    last3Digits: ['213', '652']
  },
  {
    id: '2565-05-16',
    drawDate: '16 พฤษภาคม 2565',
    dateIso: '2022-05-16',
    dayOfWeek: 'วันจันทร์',
    firstPrize: '251014',
    last2Digits: '53',
    first3Digits: ['941', '943'],
    last3Digits: ['264', '796']
  },
  {
    id: '2565-05-02',
    drawDate: '2 พฤษภาคม 2565',
    dateIso: '2022-05-02',
    dayOfWeek: 'วันจันทร์',
    firstPrize: '658642',
    last2Digits: '09',
    first3Digits: ['778', '518'],
    last3Digits: ['041', '325']
  },
  {
    id: '2565-04-16',
    drawDate: '16 เมษายน 2565',
    dateIso: '2022-04-16',
    dayOfWeek: 'วันเสาร์',
    firstPrize: '395919',
    last2Digits: '58',
    first3Digits: ['859', '395'],
    last3Digits: ['493', '508']
  },
  {
    id: '2565-04-01',
    drawDate: '1 เมษายน 2565',
    dateIso: '2022-04-01',
    dayOfWeek: 'วันศุกร์',
    firstPrize: '970618',
    last2Digits: '10',
    first3Digits: ['738', '391'],
    last3Digits: ['578', '870']
  },
  {
    id: '2565-03-16',
    drawDate: '16 มีนาคม 2565',
    dateIso: '2022-03-16',
    dayOfWeek: 'วันพุธ',
    firstPrize: '737867',
    last2Digits: '03',
    first3Digits: ['349', '985'],
    last3Digits: ['789', '821']
  },
  {
    id: '2565-03-01',
    drawDate: '1 มีนาคม 2565',
    dateIso: '2022-03-01',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '061905',
    last2Digits: '07',
    first3Digits: ['236', '834'],
    last3Digits: ['234', '690']
  },
  {
    id: '2565-02-17',
    drawDate: '17 กุมภาพันธ์ 2565',
    dateIso: '2022-02-17',
    dayOfWeek: 'วันพฤหัสบดี',
    firstPrize: '098597',
    last2Digits: '57',
    first3Digits: ['085', '644'],
    last3Digits: ['816', '592']
  },
  {
    id: '2565-02-01',
    drawDate: '1 กุมภาพันธ์ 2565',
    dateIso: '2022-02-01',
    dayOfWeek: 'วันอังคาร',
    firstPrize: '944308',
    last2Digits: '30',
    first3Digits: ['942', '061'],
    last3Digits: ['509', '485']
  },
  {
    id: '2565-01-17',
    drawDate: '17 มกราคม 2565',
    dateIso: '2022-01-17',
    dayOfWeek: 'วันจันทร์',
    firstPrize: '880159',
    last2Digits: '92',
    first3Digits: ['731', '786'],
    last3Digits: ['529', '119']
  }
];

export const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_DAY_NAMES = [
  'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
];

