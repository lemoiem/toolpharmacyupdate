// Bộ kiểm thử CDSS v1.2 – ca chuẩn + ca biên cho các công thức lâm sàng
// Chạy: npm i -D playwright (hoặc dùng bản cài toàn cục) rồi: node tests/cdss.test.js [đường-dẫn-index.html]
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const path = require('path').resolve(process.argv[2] || __dirname + '/../index.html');
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const near = (a, b, tol = 0.051) => Math.abs(a - b) <= tol;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.dismiss());
  await page.goto('file://' + path);

  const set = (id, v) => page.evaluate(([id, v]) => { const el = document.getElementById(id); el.value = v; }, [id, v]);
  const run = (fn) => page.evaluate(fn => window[fn](), fn);
  const text = id => page.evaluate(id => document.getElementById(id).innerText, id);
  const bad = s => /NaN|undefined|Infinity|\[object/.test(s);

  console.log('1. Mọi module chạy với giá trị mặc định – không NaN/undefined');
  const mods = { resus: 'resus-result', neo: 'neo-result', paed: 'paed-result', burns: 'burns-result', sepsis: 'sepsis-result', dka: 'dka-result', seizure: 'seizure-result', asthma: 'asthma-result', svt: 'svt-result', hyperk: 'hyperk-result', bili: 'bili-result', hypo: 'hypo-result', adhoc: 'adhoc-result', head: 'head-result', eos: 'eos-result', tpn: 'tpn-result' };
  for (const [m, out] of Object.entries(mods)) {
    await page.evaluate(m => showModule(m), m);
    const t = await text(out);
    ok(m + ' render', t.length > 50 && !bad(t), bad(t) ? t.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/)?.[0] : 'len=' + t.length);
  }
  await page.evaluate(() => showModule('cool'));
  const cool = await text('cool-protocol');
  ok('cool render', cool.includes('33,5') && !bad(cool));

  console.log('2. Hàm thuần dùng chung');
  const ab = await page.evaluate(() => [neoAbx(30, 0), neoAbx(39, 0), neoAbx(28, 10), neoAbx(34, 8), neoAbx(26, 30)]);
  ok('GA30 PNA0: gentamicin 4,5 mg/kg q36h', ab[0].gen.d === 4.5 && ab[0].gen.i === 36, JSON.stringify(ab[0].gen));
  ok('GA30 PNA0: ampicillin 50 mg/kg q12h', ab[0].amp.d === 50 && ab[0].amp.i === 12);
  ok('GA39 PNA0: gentamicin 4 mg/kg q24h; ampicillin q8h', ab[1].gen.d === 4 && ab[1].gen.i === 24 && ab[1].amp.i === 8);
  ok('GA28 PNA10 (PMA 29,4): gentamicin 4 q36h; ampicillin 75 q12h', ab[2].gen.d === 4 && ab[2].gen.i === 36 && ab[2].amp.d === 75 && ab[2].amp.i === 12, JSON.stringify(ab[2]));
  ok('GA34 PNA8 (PMA 35,1): gentamicin 4 q24h; ampicillin 75 q12h', ab[3].gen.i === 24 && ab[3].amp.d === 75);
  ok('GA26 PNA30 (PMA 30,3): vancomycin q8h; cefotaxime q8h', ab[4].vanc.i === 8 && ab[4].cefo.i === 8, JSON.stringify(ab[4]));
  const fl = await page.evaluate(() => [neoFluids(1.2, 28, 0), neoFluids(3.2, 39, 2), neoFluids(0.8, 25, 10), neoFluids(2, 34, 4)]);
  ok('Dịch: 1,2 kg non tháng ngày 1 = 70–90', fl[0].lo === 70 && fl[0].hi === 90);
  ok('Dịch: đủ tháng ngày 3 = 60–80', fl[1].lo === 60 && fl[1].hi === 80);
  ok('Dịch: <1000 g ngày ≥5 = 160–180', fl[2].lo === 160 && fl[2].hi === 180);
  ok('Dịch: >1500 g non tháng ngày 5 = 140–160', fl[3].lo === 140 && fl[3].hi === 160);
  const mf = await page.evaluate(() => [maintenanceFluids(10).daily, maintenanceFluids(20).daily, maintenanceFluids(30).daily]);
  ok('Holliday–Segar 10/20/30 kg = 1000/1500/1700 mL', mf.join() === '1000,1500,1700', mf.join());

  console.log('3. Sơ sinh – catheter rốn');
  await page.evaluate(() => showModule('neo'));
  await set('n-wt', 1.5); await set('n-ga', 32); await set('n-dol', 0); await run('calcNeo');
  let t = await text('neo-result');
  ok('UVC 1,5 kg = 7,8 cm (1,5×CN+5,5)', /UVC[^\n]*\t7\.8 cm/.test(t), t.match(/UVC[^\n]*/)?.[0]);
  ok('UAC cao = 13,5 cm', /13\.5 cm/.test(t));
  ok('UAC thấp = 8,5 cm', /8\.5 cm/.test(t));
  ok('Fentanyl 1 mL/h = 1 mcg/kg/giờ (75 mcg/50 mL)', /Pha 75 mcg\/50 mL/.test(t));
  await set('n-wt', ''); await run('calcNeo');
  t = await text('neo-result'); ok('n-wt rỗng → dùng mặc định, không NaN', !bad(t));
  await set('n-wt', 0.1); await run('calcNeo');
  t = await text('neo-result'); ok('n-wt 0,1 kg → cảnh báo phạm vi', t.includes('ngoài phạm vi'));

  console.log('4. Nhi – tuổi 0 không bị thay bằng 6');
  await page.evaluate(() => showModule('paed'));
  await set('p-age', 0); await set('p-wt', 3.5); await run('calcPaed');
  t = await text('paed-result');
  ok('Tuổi 0, 3,5 kg → ETT không cuff 3,5 mm', /ETT không cuff\n?\s*3\.5 mm/.test(t), t.slice(0, 200));
  await set('p-age', 6); await run('estimateWeight');
  const w6 = await page.evaluate(() => document.getElementById('p-wt').value);
  ok('APLS 6 tuổi = 25 kg (3×6+7)', w6 === '25', w6);
  await set('p-age', 0.5); await run('estimateWeight');
  const w05 = await page.evaluate(() => document.getElementById('p-wt').value);
  ok('APLS 6 tháng = 7 kg (0,5×6+4)', w05 === '7', w05);
  await set('p-age', 10); await set('p-wt', 100); await run('calcPaed');
  t = await text('paed-result');
  ok('100 kg: adrenaline tối đa 1 mg; khử rung ≤200 J', /1 mg = 10 mL/.test(t) && /200 J/.test(t));
  ok('Adenosine liều 3 tối đa 12 mg', /Adenosine liều 3\t12 mg/.test(t), t.match(/Adenosine liều 3[^\n]*/)?.[0]);

  console.log('5. DKA – Na⁺ hiệu chỉnh theo glucose');
  await page.evaluate(() => showModule('dka'));
  await set('d-wt', 30); await set('d-na', 135); await set('d-glu', 25); await set('d-ph', 7.05); await run('calcDKA');
  t = await text('dka-result');
  ok('Na hiệu chỉnh = 141,9 (135 + 2×(25−5,6)/5,6)', t.includes('141.9 mmol/L'), t.match(/Na⁺ hiệu chỉnh[^\n]*/)?.[0]);
  ok('pH 7,05 → DKA nặng', t.includes('DKA NẶNG'));
  ok('Insulin 1 IU/mL → 1,5–3 mL/h (30 kg)', t.includes('Tốc độ 1.5–3 mL/giờ'));
  ok('Mannitol 30 kg = 75–150 mL', t.includes('75–150 mL'));

  console.log('6. Hen – MgSO₄ 50% đúng thể tích');
  await page.evaluate(() => showModule('asthma'));
  await set('a-wt', 25); await page.evaluate(() => { document.getElementById('a-sev').value = 'severe'; }); await run('calcAsthma');
  t = await text('asthma-result');
  ok('MgSO₄ 1000 mg = 2 mL dung dịch 50%', t.includes('1000 mg') && t.includes('= 2 mL MgSO₄ 50%'), t.match(/= [\d.]+ mL MgSO₄/)?.[0]);
  await set('a-wt', 80); await run('calcAsthma');
  t = await text('asthma-result'); ok('80 kg: MgSO₄ tối đa 2000 mg; hydrocortisone tối đa 100 mg', t.includes('2000 mg') && t.includes('Hydrocortisone 100 mg'));

  console.log('7. Tăng kali – nhãn đơn vị');
  await page.evaluate(() => showModule('hyperk'));
  await set('k-wt', 20); await set('k-val', 7.2); await page.evaluate(() => { document.getElementById('k-type').value = 'paed'; }); await run('calcHyperk');
  t = await text('hyperk-result');
  ok('Calci gluconat 20 kg = 10 mL', t.includes('10 mL IV trong 5–10 phút'));
  ok('Insulin 2 IU + D10% 100 mL', t.includes('2 IU') && t.includes('100 mL'));

  console.log('8. Bilirubin – phân loại theo ngưỡng nhập');
  await page.evaluate(() => showModule('bili'));
  await set('bl-ga', 39); await set('bl-age', 48); await set('bl-photo', 17); await set('bl-exch', 24);
  await set('bl-val', 12); await run('calcBili'); t = await text('bili-result'); ok('TSB 12 < 15 → theo dõi', t.includes('Dưới ngưỡng chiếu đèn ≥2'));
  await set('bl-val', 16); await run('calcBili'); t = await text('bili-result'); ok('TSB 16 (≤2 dưới ngưỡng) → cân nhắc', t.includes('Dưới ngưỡng chiếu đèn <2'));
  await set('bl-val', 18); await run('calcBili'); t = await text('bili-result'); ok('TSB 18 → chiếu đèn', t.includes('CHỈ ĐỊNH CHIẾU ĐÈN'));
  await set('bl-val', 22.5); await run('calcBili'); t = await text('bili-result'); ok('TSB 22,5 → leo thang điều trị', t.includes('LEO THANG'));
  await set('bl-val', 24); await run('calcBili'); t = await text('bili-result'); ok('TSB 24 → thay máu', t.includes('THAY MÁU'));
  await set('bl-photo', ''); await set('bl-exch', ''); await run('calcBili'); t = await text('bili-result'); ok('Chưa nhập ngưỡng → nhắc tra biểu đồ', t.includes('Nhập ngưỡng'));
  await set('bl-ga', 34); await run('calcBili'); t = await text('bili-result'); ok('GA 34 → ngoài phạm vi AAP 2022', t.includes('≥35 tuần'));

  console.log('9. Hạ glucose máu – GIR');
  await page.evaluate(() => showModule('hypo'));
  await set('hy-wt', 3); await set('hy-gluc', 1.8); await run('calcHypo');
  t = await text('hypo-result');
  ok('3 kg: GIR 6 = 10,8 mL/h D10%', t.includes('GIR 6 = 10.8 mL/h'));
  ok('Bolus 6 mL (2 mL/kg)', t.includes('6 mL Dextrose 10%'));

  console.log('10. Chấn thương đầu – PECARN');
  await page.evaluate(() => showModule('head'));
  await set('h-age', 36); await page.evaluate(() => { document.getElementById('h-gcs').value = '15'; }); await run('calcHead');
  t = await text('head-result'); ok('Không yếu tố → nguy cơ rất thấp', t.includes('Nguy cơ rất thấp'));
  await page.evaluate(() => { const c = document.querySelector('#head-checklist input[data-tier="mid"]'); c.checked = true; updateHeadRisk(); });
  t = await text('head-result'); ok('1 yếu tố trung bình → theo dõi hoặc CT', t.includes('Nguy cơ trung bình'));
  await page.evaluate(() => { document.getElementById('h-gcs').value = '14'; calcHead(); });
  t = await text('head-result'); ok('GCS 14 → nguy cơ cao', t.includes('Nguy cơ cao'));
  await set('h-age', 12); await page.evaluate(() => { document.getElementById('h-gcs').value = '15'; calcHead(); });
  const labels = await text('head-checklist'); ok('<2 tuổi hiện "Sờ thấy vỡ xương sọ"', labels.includes('Sờ thấy vỡ xương sọ'));

  console.log('11. Pha dịch');
  await page.evaluate(() => showModule('adhoc'));
  await set('ah-nacl', 0.45); await set('ah-vol', 100); await set('ah-gluc', 15); await run('calcAdhoc');
  t = await text('adhoc-result');
  ok('NaCl 0,45% = 77 mmol/L', t.includes('77 mmol/L'));
  ok('D15% từ D10%+D50%: 87,5→88 mL + 12,5→13 mL', t.includes('88 mL D10%') && t.includes('13 mL D50%'));
  ok('D15% → bắt buộc TM trung tâm', t.includes('TM trung tâm'));

  console.log('12. EOS – đối chiếu phương trình Kaiser');
  await page.evaluate(() => showModule('eos'));
  const expected = (() => {
    const tF = 37.0 * 9 / 5 + 32, ga = 39, rom = 6;
    const x = 40.5656 + 0.8680 * tF - 6.9325 * ga + 0.0877 * ga * ga + 1.2256 * Math.pow(rom + 0.05, 0.2);
    const p = 1 / (1 + Math.exp(-x)); const odds = p / (1 - p) * 0.41;
    return { birth: p * 1000, post: odds / (1 + odds) * 1000 };
  })();
  await page.evaluate(() => {
    const s = (id, v) => document.getElementById(id).value = v;
    s('eos-ga', 39); s('eos-temp', 37.0); s('eos-rom', 6); s('eos-gbs', 'negative'); s('eos-abx', 'none'); s('eos-clin', 'well'); s('eos-inc', '0.5');
    calcEOS();
  });
  const m = await page.evaluate(() => eosModel({ ga: 39, gbs: 'negative', rom: 6, tempC: 37, abx: 'none', clin: 'well', inc: '0.5' }));
  ok('Nguy cơ lúc sinh khớp phương trình (' + expected.birth.toFixed(3) + '/1000)', near(m.birth, expected.birth, 1e-9));
  ok('Nguy cơ sau khám (LR 0,41) khớp (' + expected.post.toFixed(3) + '/1000)', near(m.post, expected.post, 1e-9));
  ok('Ca chuẩn (GBS−, sốt không, ROM 6h) <1/1000 → thường quy', (await text('eos-result')).includes('CHĂM SÓC THƯỜNG QUY'));
  const hi = await page.evaluate(() => eosModel({ ga: 39, gbs: 'positive', rom: 24, tempC: 38.9, abx: 'none', clin: 'well', inc: '0.5' }));
  const hiEq = await page.evaluate(() => eosModel({ ga: 39, gbs: 'positive', rom: 24, tempC: 38.9, abx: 'none', clin: 'equivocal', inc: '0.5' }));
  ok('Sốt 38,9 °C + GBS+ + ROM 24h: nguy cơ lúc sinh tăng (' + hi.birth.toFixed(2) + ')', hi.birth > m.birth * 10);
  const odds = r => (r / 1000) / (1 - r / 1000);
  ok('Equivocal: odds sau = odds lúc sinh × 5,0 (Escobar 2014)', near(odds(hiEq.post) / odds(hi.birth), 5, 1e-9), (odds(hiEq.post) / odds(hi.birth)).toFixed(4));
  const abxB = await page.evaluate(() => eosModel({ ga: 39, gbs: 'positive', rom: 24, tempC: 38.9, abx: 'broad4', clin: 'well', inc: '0.5' }));
  ok('KS phổ rộng ≥4h làm giảm nguy cơ', abxB.birth < hi.birth);
  const inc3 = await page.evaluate(() => eosModel({ ga: 39, gbs: 'negative', rom: 6, tempC: 37, abx: 'none', clin: 'well', inc: '0.3' }));
  ok('Tỷ lệ nền 0,3 vs 0,5 → nguy cơ giảm ≈ 0,6 lần', near(inc3.birth / m.birth, 0.6, 0.01), (inc3.birth / m.birth).toFixed(3));
  await page.evaluate(() => { document.getElementById('eos-ga').value = 33; calcEOS(); });
  ok('GA 33 → ngoài phạm vi', (await text('eos-result')).includes('34–43'));

  console.log('13. TPN – thể tích túi & Ca×P');
  await page.evaluate(() => { showModule('tpn'); document.getElementById('tpn-type').value = 'vlbw'; applyDefaults(); });
  const d = await page.evaluate(() => _tpnData);
  // VLBW mặc định: 1,2 kg, TF 120, lipid 2 g/kg → lipid 12 mL + Vitalipid 4,8 mL; túi nước = 144 − 16,8 = 127,2 mL
  ok('Thể tích túi nước 24h = 127,2 mL', near(d.aqVol, 127.2), d.aqVol);
  ok('Tốc độ túi nước = 5,3 mL/h', near(d.bagRate, 5.3, 0.01), d.bagRate);
  ok('Glucose % = GIR8×1,44×1,2/127,2 = 10,87%', near(d.glucPct, 10.87, 0.01), d.glucPct);
  ok('K⁺ từ KH₂PO₄ = 1,8 mmol; KCl chỉ bù phần còn lại', near(d.kFromP, 1.8) && near(d.kVol, 0.3 * 127.2 / 127.2 * (Math.max(100, 127.2) / 127.2), 0.06), d.kVol);
  ok('Ca×P theo nồng độ (mEq/L × mmol/L) có giá trị hợp lý', d.caProd > 50 && d.caProd < 600, d.caProd);
  ok('Áp lực thẩm thấu ước tính > 0 và hữu hạn', d.osmTotal > 300 && d.osmTotal < 3000, d.osmTotal);
  const tt = await text('tpn-result'); ok('TPN không NaN/undefined', !bad(tt));
  ok('Prompt AI không chứa họ tên/MRN', !(await page.evaluate(() => runAIAnalysis.toString())).includes('d.mrn'));

  console.log('14. Lỗi runtime trên trang');
  ok('Không có pageerror', errors.length === 0, errors.join(' | '));

  await browser.close();
  console.log(`\nKẾT QUẢ: ${pass} đạt / ${fail} không đạt`);
  process.exit(fail ? 1 : 0);
})();
