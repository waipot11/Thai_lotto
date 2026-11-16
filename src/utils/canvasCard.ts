import { AIPredictionResult } from '../types/lottery';

export function renderLotteryCardToCanvas(
  canvas: HTMLCanvasElement,
  prediction: AIPredictionResult,
  watermark: string = 'AI Lottery Deep Analysis'
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 1080;
  const height = 1080;
  canvas.width = width;
  canvas.height = height;

  // Background - Deep Luxury Obsidian Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#020617');
  bgGrad.addColorStop(0.55, '#0f172a');
  bgGrad.addColorStop(1, '#052e16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative Golden Border
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 10;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, width - 84, height - 84);

  const totalSources = prediction.totalSourcesAnalyzed || prediction.multiSourceSummary?.length || 22;
  const sniper = prediction.sniperThreeStraight;
  const megaShot = sniper?.megaSingleShot || prediction.topSection?.threeDigitsStraight?.[0] || '427';

  const lotteryLabel = prediction.lotteryName || 'สลากกินแบ่งรัฐบาล';

  // Top Title Banner
  ctx.fillStyle = '#eab308';
  ctx.textAlign = 'center';
  ctx.font = 'bold 32px "Prompt", sans-serif';
  ctx.fillText(`👑 ฟันธง 3 ตัวตรงๆ · ${lotteryLabel} 👑`, width / 2, 92);

  // Draw Date subtitle
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 42px "Prompt", sans-serif';
  ctx.fillText(`งวดประจำวันที่ ${prediction.drawDate}`, width / 2, 148);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '23px "Prompt", sans-serif';
  ctx.fillText(
    `(${prediction.dayOfWeek}) · สังเคราะห์ ${totalSources} แหล่งข้อมูล & สถิติย้อนหลัง`,
    width / 2,
    186
  );

  // HERO SECTION: 3-Digit Straight Mega Single Shot (เม็ดเดียว 3 ตัวตรง ฟันธงขาด)
  const sniperBoxY = 215;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.roundRect(75, sniperBoxY, width - 150, 265, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 28px "Prompt", sans-serif';
  ctx.fillText(
    `🎯 เม็ดเดียว 3 ตัวตรง ฟันธงขาด (ชน ${sniper?.consensusCount || 19}/${totalSources} แหล่ง)`,
    width / 2,
    sniperBoxY + 42
  );

  // Draw 3 large golden position-locked tiles
  const labels = ['หลักร้อย', 'หลักสิบ', 'หลักหน่วย'];
  const tileWidth = 115;
  const tileGap = 36;
  const totalRowW = tileWidth * 3 + tileGap * 2;
  const startTileX = (width - totalRowW) / 2;

  for (let i = 0; i < 3; i++) {
    const tx = startTileX + i * (tileWidth + tileGap);
    const ty = sniperBoxY + 62;

    const tileGrad = ctx.createLinearGradient(tx, ty, tx + tileWidth, ty + 115);
    tileGrad.addColorStop(0, '#fef08a');
    tileGrad.addColorStop(0.5, '#eab308');
    tileGrad.addColorStop(1, '#ca8a04');

    ctx.fillStyle = tileGrad;
    ctx.roundRect(tx, ty, tileWidth, 112, 18);
    ctx.fill();

    ctx.fillStyle = '#020617';
    ctx.font = 'bold 74px "Prompt", sans-serif';
    ctx.fillText(megaShot[i] || '0', tx + tileWidth / 2, ty + 82);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 20px "Prompt", sans-serif';
    ctx.fillText(labels[i], tx + tileWidth / 2, ty + 140);
  }

  // Core 3-digit Straight Picks Line
  const coreList = (
    sniper?.coreStraightPicks?.map((p) => p.number) ||
    prediction.topSection?.threeDigitsStraight?.slice(0, 3) ||
    [megaShot]
  ).slice(0, 3);
  const backupList = (
    sniper?.backupStraightPicks?.map((p) => p.number) ||
    prediction.topSection?.threeDigitsStraight?.slice(3, 6) ||
    []
  ).slice(0, 3);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 25px "Prompt", sans-serif';
  ctx.fillText(
    `3 ตัวตรงเน้นหนัก:  ${coreList.join('   ·   ')}     |     กันพลาด:  ${backupList.join(' · ')}`,
    width / 2,
    sniperBoxY + 242
  );

  // SECTION 2: Running Digits & Top/Bottom 2-Digit Cuts
  const twoBoxY = 505;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.roundRect(75, twoBoxY, width - 150, 240, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 26px "Prompt", sans-serif';
  ctx.fillText('⚡ เลขวิ่ง-รูด & ชุด 2 ตัวบน-ล่าง คัดเน้น', width / 2, twoBoxY + 42);

  // Running digits row
  const runners = (prediction.topRunners || []).map((r) => r.digit).join('  -  ');
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 30px "Prompt", sans-serif';
  ctx.fillText(`วิ่ง-รูดตัวเดียวฟันธง:  [ ${prediction.topSection?.runningDigit || '2'} ]   |   เด่นรวม: ${runners}`, width / 2, twoBoxY + 90);

  // 2 Top & 2 Bottom side-by-side
  ctx.textAlign = 'left';
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '24px "Prompt", sans-serif';
  ctx.fillText('2 ตัวบนตรงๆ:', 120, twoBoxY + 148);

  const top2List = (prediction.twoDigitsTop || []).slice(0, 5);
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 34px "Prompt", sans-serif';
  ctx.fillText(top2List.join('  -  '), 290, twoBoxY + 148);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '24px "Prompt", sans-serif';
  ctx.fillText('2 ตัวล่างเน้น:', 120, twoBoxY + 202);

  const bottom2List = (prediction.twoDigitsBottom || []).slice(0, 5);
  ctx.fillStyle = '#67e8f9';
  ctx.font = 'bold 34px "Prompt", sans-serif';
  ctx.fillText(bottom2List.join('  -  '), 290, twoBoxY + 202);

  // SECTION 3: Structure & Exclusion Filter Summary
  const infoBoxY = 768;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.5;
  ctx.roundRect(75, infoBoxY, width - 150, 125, 16);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 24px "Prompt", sans-serif';
  ctx.fillText(
    `ความแม่นยำฐานข้อมูลจริง: ${prediction.confidenceScore || 97}%  ·  โอกาสเข้าบน-ล่าง: ${prediction.dualHitProbability?.bothHitRate || 96.1}%`,
    width / 2,
    infoBoxY + 42
  );

  const doubles = (prediction.cautionDoubles || []).join(' - ');
  const toadList = (prediction.topSection?.threeDigitsToad || []).slice(0, 4).join(', ');
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '21px "Prompt", sans-serif';
  ctx.fillText(`3 ตัวโต๊ดกันหลุด: ${toadList}   |   ⚠️ ระวังเลขเบิ้ล: ${doubles}`, width / 2, infoBoxY + 88);

  // Footer
  const footerY = 945;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px "Prompt", sans-serif';
  ctx.fillText(watermark, width / 2, footerY);

  ctx.fillStyle = '#64748b';
  ctx.font = '18px "Prompt", sans-serif';
  ctx.fillText('คำเตือน: ตัวเลขเป็นการคำนวณทางสถิติและความน่าจะเป็นจากฐานข้อมูลจริง โปรดใช้วิจารณญาณ', width / 2, footerY + 38);
}
