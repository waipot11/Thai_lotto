import { AIPrediction4DResult } from '../types/lottery';

export function renderLotteryCardToCanvas(
  canvas: HTMLCanvasElement,
  prediction: AIPrediction4DResult,
  watermark: string = 'AI หวยชุด 4 ประเทศ & ธ.ก.ส. · ออมสิน'
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 1080;
  const height = 1080;
  canvas.width = width;
  canvas.height = height;

  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#020617');
  bgGrad.addColorStop(0.55, '#0f172a');
  bgGrad.addColorStop(1, '#064e3b');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 10;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, width - 84, height - 84);

  const isWin4Mode = prediction.strategyMode === 'win4_3d';
  const superNum = prediction.superNumber4D || '4286';
  const win4 = prediction.win4Breakdown;
  const lotteryLabel = prediction.lotteryName || 'AI หวยชุด 4 ประเทศ';
  const cb = prediction.circuitBreaker;

  ctx.fillStyle = '#eab308';
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px "Prompt", sans-serif';
  ctx.fillText(
    isWin4Mode ? `AI วิน 4 ตัวแตก 3 ตัว · ${lotteryLabel}` : `AI Super Number 4D · ${lotteryLabel}`,
    width / 2,
    95
  );

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 40px "Prompt", sans-serif';
  ctx.fillText(`งวดวันที่ ${prediction.drawDate}`, width / 2, 150);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px "Prompt", sans-serif';
  ctx.fillText(
    `(${prediction.dayOfWeek}) · ชนครบ ${prediction.totalSourcesAnalyzed || 22} แหล่ง · เสถียรภาพ ${prediction.consistencyScore}/100`,
    width / 2,
    190
  );

  // Hero Box
  const boxY = 225;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.roundRect(75, boxY, width - 150, 275, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 28px "Prompt", sans-serif';
  ctx.fillText(
    isWin4Mode
      ? `แกนวิน 4 ตัวลงทุน (ชนเฉลี่ย ${prediction.deepAnalysis?.averageAgreementOutOf22 || 0}/${prediction.totalSourcesAnalyzed || 22} แหล่ง)`
      : `เม็ดเดียว 4 ตัวตรงเน้นสุด (ชนเฉลี่ย ${prediction.deepAnalysis?.averageAgreementOutOf22 || 0}/${prediction.totalSourcesAnalyzed || 22} แหล่ง)`,
    width / 2,
    boxY + 46
  );

  const heroDigits = isWin4Mode ? win4.coreDigits4 : superNum.split('');
  const labels = isWin4Mode
    ? ['แกนวิน 1', 'แกนวิน 2', 'แกนวิน 3', 'แกนวิน 4']
    : ['หลักพัน', 'หลักร้อย', 'หลักสิบ', 'หลักหน่วย'];

  const tileWidth = 112;
  const tileGap = 32;
  const totalRowW = tileWidth * 4 + tileGap * 3;
  const startTileX = (width - totalRowW) / 2;

  for (let i = 0; i < 4; i++) {
    const tx = startTileX + i * (tileWidth + tileGap);
    const ty = boxY + 72;

    const tileGrad = ctx.createLinearGradient(tx, ty, tx + tileWidth, ty + 115);
    tileGrad.addColorStop(0, '#fef08a');
    tileGrad.addColorStop(0.5, '#eab308');
    tileGrad.addColorStop(1, '#ca8a04');

    ctx.fillStyle = tileGrad;
    ctx.roundRect(tx, ty, tileWidth, 115, 18);
    ctx.fill();

    ctx.fillStyle = '#020617';
    ctx.font = 'bold 74px "JetBrains Mono", "Prompt", monospace';
    ctx.fillText(heroDigits[i] || '0', tx + tileWidth / 2, ty + 84);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 20px "Prompt", sans-serif';
    ctx.fillText(labels[i], tx + tileWidth / 2, ty + 148);
  }

  // Second Box: Either Win-4 -> 3D Breakdown OR Diverse Sniper Sets
  const setsY = 525;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.roundRect(75, setsY, width - 150, 205, 18);
  ctx.fill();
  ctx.stroke();

  if (isWin4Mode) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px "Prompt", sans-serif';
    ctx.fillText(`4 ชุดเน้นหลัก (เม็ดเดียว: ${win4.megaThreeStraight}) + แตก 3 ตัว 24 ชุด`, width / 2, setsY + 34);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 38px "JetBrains Mono", "Prompt", monospace';
    ctx.fillText(win4.threeDigitStraightSets.join('   ·   '), width / 2, setsY + 80);

    const sets24 = win4.threeDigitStraight24Sets || [];
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '19px "JetBrains Mono", "Prompt", monospace';
    ctx.fillText(sets24.slice(0, 12).join(' · '), width / 2, setsY + 120);
    ctx.fillText(sets24.slice(12, 24).join(' · '), width / 2, setsY + 150);

    const hedgeSets = win4.threeDigitDoubleHedgeSets || [];
    if (hedgeSets.length > 0) {
      ctx.fillStyle = '#fcd34d';
      ctx.font = 'bold 19px "Prompt", sans-serif';
      ctx.fillText(`⚡ กันเบิ้ล/หาม 4 ชุด: ${hedgeSets.join(' · ')}`, width / 2, setsY + 185);
    }
  } else {
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 26px "Prompt", sans-serif';
    ctx.fillText('4 ชุด Diverse Sniper (Confidence-Weighted)', width / 2, setsY + 44);

    const sniperLine = prediction.sniperSets.map((s) => s.number4D).join('    ·    ');
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 46px "JetBrains Mono", "Prompt", monospace';
    ctx.fillText(sniperLine, width / 2, setsY + 112);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '23px "Prompt", sans-serif';
    ctx.fillText(
      `3 ตัวโต๊ดกันพลาด: ${prediction.backupThreeToad.join(' · ')}   |   2 ตัวท้ายประคอง: ${prediction.backupTwoBack.slice(0, 4).join(' · ')}`,
      width / 2,
      setsY + 168
    );
  }

  // Circuit Breaker / Scaling Box
  const cbY = 755;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.strokeStyle =
    cb.status === 'red_pause'
      ? '#f43f5e'
      : cb.status === 'yellow_nearmiss'
        ? '#f59e0b'
        : '#10b981';
  ctx.lineWidth = 2;
  ctx.roundRect(75, cbY, width - 150, 130, 16);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle =
    cb.status === 'red_pause'
      ? '#fda4af'
      : cb.status === 'yellow_nearmiss'
        ? '#fde68a'
        : '#6ee7b7';
  ctx.font = 'bold 24px "Prompt", sans-serif';
  ctx.fillText(`สถานะพอร์ต: ${cb.statusBadgeText}`, width / 2, cbY + 46);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '21px "Prompt", sans-serif';
  ctx.fillText(
    `งบลงทุนแนะนำ: ${cb.recommendedBudgetBaht.toLocaleString()} บาท (${cb.recommendedSetsCount} ชุด × ${cb.recommendedUnitCostBaht} บ.)`,
    width / 2,
    cbY + 92
  );

  // Footer
  const footerY = 945;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px "Prompt", sans-serif';
  ctx.fillText(watermark, width / 2, footerY);

  ctx.fillStyle = '#64748b';
  ctx.font = '18px "Prompt", sans-serif';
  ctx.fillText('คำเตือน: ข้อมูลนี้เป็นการคำนวณความน่าจะเป็นทางสถิติย้อนหลังเท่านั้น โปรดใช้วิจารณญาณ', width / 2, footerY + 38);
}
