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
  ok('UVC 1,5 kg = 7,8 cm (1,5×CN+5,5)', /UVC[^\n]*\t7,8 cm/.test(t), t.match(/UVC[^\n]*/)?.[0]);
  ok('UAC cao = 13,5 cm', /13,5 cm/.test(t));
  ok('UAC thấp = 8,5 cm', /8,5 cm/.test(t));
  ok('Fentanyl 1 mL/h = 1 mcg/kg/giờ (75 mcg/50 mL)', /Pha 75 mcg\/50 mL/.test(t));
  await set('n-wt', ''); await run('calcNeo');
  t = await text('neo-result'); ok('n-wt rỗng → dùng mặc định, không NaN', !bad(t));
  await set('n-wt', 0.1); await run('calcNeo');
  t = await text('neo-result'); ok('n-wt 0,1 kg → cảnh báo phạm vi', t.includes('ngoài phạm vi'));

  console.log('4. Nhi – tuổi 0 không bị thay bằng 6');
  await page.evaluate(() => showModule('paed'));
  await set('p-age', 0); await set('p-wt', 3.5); await run('calcPaed');
  t = await text('paed-result');
  ok('Tuổi 0, 3,5 kg → ETT không cuff 3,5 mm', /ETT không cuff\n?\s*3,5 mm/.test(t), t.slice(0, 200));
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
  ok('Na hiệu chỉnh = 141,9 (135 + 2×(25−5,6)/5,6)', t.includes('141,9 mmol/L'), t.match(/Na⁺ hiệu chỉnh[^\n]*/)?.[0]);
  ok('pH 7,05 → DKA nặng', t.includes('DKA NẶNG'));
  ok('Insulin 1 IU/mL → 1,5–3 mL/h (30 kg)', t.includes('Tốc độ 1,5–3 mL/giờ'));
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
  ok('3 kg: GIR 6 = 10,8 mL/h D10%', t.includes('GIR 6 = 10,8 mL/h'));
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

  console.log('12. EOS – đối chiếu phương trình Kaiser 2024 và 2017 (hệ số công bố gõ độc lập trong test)');
  await page.evaluate(() => showModule('eos'));
  const kaiser = (M, p) => {
    const tF = p.tempC * 9 / 5 + 32, romT = Math.pow(p.rom + 0.05, 0.2);
    const a1 = (p.abx === 'gbs2' || p.abx === 'broad2') ? 1 : 0, a2 = p.abx === 'broad4' ? 1 : 0;
    const x = M.b0 + M.t * tF + M.ga * p.ga + M.ga2 * p.ga * p.ga + M.rom * romT + M.a1 * a1 + M.a2 * a2 + M.gp * (p.gbs === 'positive') + M.gu * (p.gbs === 'unknown');
    const pr = 1 / (1 + Math.exp(-x)); const o = pr / (1 - pr) * M.lr[p.clin];
    return { birth: pr * 1000, post: o / (1 + o) * 1000 };
  };
  // Puopolo 2024 (Bảng 2) / Kaiser 2024 Model Update FAQ
  const K24 = { b0: 57.29929499, t: 0.85194656, ga: -7.72247124, ga2: 0.09842383, rom: 0.86770862, a1: -2.13142945, a2: -2.33985917, gp: 1.02265353, gu: 1.13710111, lr: { well: 0.36, equivocal: 3.65, ill: 14.5 } };
  // Kaiser EMR FAQ (mô hình gốc, tỷ lệ nền 0,5/1000)
  const K17 = { b0: 40.5656, t: 0.8680, ga: -6.9325, ga2: 0.0877, rom: 1.2256, a1: -1.0488, a2: -1.1861, gp: 0.5771, gu: 0.0427, lr: { well: 0.41, equivocal: 5.0, ill: 21.2 } };
  const cases = [
    { ga: 39, gbs: 'negative', rom: 6, tempC: 37, abx: 'none', clin: 'well', inc: '0.5' },
    { ga: 39, gbs: 'positive', rom: 24, tempC: 38.9, abx: 'none', clin: 'equivocal', inc: '0.5' },
    { ga: 36, gbs: 'unknown', rom: 18, tempC: 38.2, abx: 'gbs2', clin: 'well', inc: '0.5' },
    { ga: 41, gbs: 'positive', rom: 30, tempC: 39.4, abx: 'broad4', clin: 'ill', inc: '0.5' },
  ];
  for (const [i, c] of cases.entries()) {
    const e24 = kaiser(K24, c), e17 = kaiser(K17, c);
    const g24 = await page.evaluate(c => eosModel({ ...c, model: 'kp2024' }), c);
    const g17 = await page.evaluate(c => eosModel({ ...c, model: 'kp2017' }), c);
    ok(`Ca ${i + 1} – 2024: lúc sinh ${e24.birth.toFixed(3)}, sau khám ${e24.post.toFixed(3)}/1000`, near(g24.birth, e24.birth, 1e-9) && near(g24.post, e24.post, 1e-9), JSON.stringify([g24.birth, g24.post]));
    ok(`Ca ${i + 1} – 2017: lúc sinh ${e17.birth.toFixed(3)}, sau khám ${e17.post.toFixed(3)}/1000`, near(g17.birth, e17.birth, 1e-9) && near(g17.post, e17.post, 1e-9));
  }
  const ui = await page.evaluate(() => ({ model: document.getElementById('eos-model').value, incDis: document.getElementById('eos-inc').disabled }));
  ok('Giao diện: mặc định mô hình 2024, ô tỷ lệ nền bị khóa', ui.model === 'kp2024' && ui.incDis);
  await page.evaluate(() => { const s = (id, v) => document.getElementById(id).value = v; s('eos-ga', 39); s('eos-temp', 37); s('eos-rom', 6); s('eos-gbs', 'negative'); s('eos-abx', 'none'); s('eos-clin', 'well'); calcEOS(); });
  let et = await text('eos-result');
  ok('Ca chuẩn 2024 <1/1000 → chăm sóc thường quy; hiển thị so sánh 2017', et.includes('CHĂM SÓC THƯỜNG QUY') && et.includes('mô hình 2017'));
  ok('Hiển thị LR 2024 (0,36 / 3,65 / 14,5) và β0 57,29929499 (dấu phẩy thập phân)', et.includes('3,65') && et.includes('14,5') && et.includes('57,29929499'));
  ok('Nhãn dữ liệu eos-models "CHƯA KIỂM CHỨNG"', et.includes('eos-models') && et.includes('CHƯA KIỂM CHỨNG'));
  await page.evaluate(() => { document.getElementById('eos-model').value = 'kp2017'; eosModelChanged(); });
  ok('Chuyển 2017 → mở khóa tỷ lệ nền', !(await page.evaluate(() => document.getElementById('eos-inc').disabled)));
  const i3 = await page.evaluate(() => [eosModel({ model: 'kp2017', ga: 39, gbs: 'negative', rom: 6, tempC: 37, abx: 'none', clin: 'well', inc: '0.3' }).birth, eosModel({ model: 'kp2017', ga: 39, gbs: 'negative', rom: 6, tempC: 37, abx: 'none', clin: 'well', inc: '0.5' }).birth]);
  ok('2017: tỷ lệ nền 0,3 vs 0,5 → nguy cơ ≈ 0,6 lần', near(i3[0] / i3[1], 0.6, 0.01));
  await page.evaluate(() => { document.getElementById('eos-model').value = 'kp2024'; document.getElementById('eos-ga').value = 34.5; eosModelChanged(); });
  ok('2024, GA 34,5: cảnh báo ngoài quần thể phát triển (≥35 tuần)', (await text('eos-result')).includes('≥35 tuần'));
  await page.evaluate(() => { document.getElementById('eos-ga').value = 33; calcEOS(); });
  ok('GA 33 → ngoài phạm vi', (await text('eos-result')).includes('34–43'));
  await page.evaluate(() => { document.getElementById('eos-ga').value = 39; calcEOS(); });

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

  console.log('15. Dữ liệu JSON – một nguồn sự thật');
  const dj = await page.evaluate(() => ({ err: DATA_ERR, keys: Object.keys(DATA), vers: Object.values(DATA).map(t => t.version + '|' + t.updated), n: DATA['drug-doses'].records.filter(r => r.type !== 'ref_row').length }));
  ok('5 khối dữ liệu tải được, không lỗi', dj.err.length === 0 && ['eos-models', 'neo-abx', 'neo-fluids', 'drug-doses', 'tpn-products'].every(k => dj.keys.includes(k)), JSON.stringify(dj));
  ok('Mọi khối có version x.y.z và updated yyyy-mm-dd', dj.vers.every(v => /^\d+\.\d+\.\d+\|\d{4}-\d{2}-\d{2}$/.test(v)));
  const caps = await page.evaluate(() => [dz('p_atropine', 2), dz('p_atropine', 40), dz('p_mgso4', 80), dml('p_mgso4', 25), dz('p_midazolam_im', 10), dz('p_midazolam_im', 20), dz('p_midazolam_im', 50), dzr('p_morphine', 150), dlab('p_adenosine1')]);
  ok('Atropine: tối thiểu 0,1 mg (2 kg), tối đa 0,5 mg (40 kg)', caps[0] === 0.1 && caps[1] === 0.5, caps.slice(0, 2));
  ok('MgSO₄: tối đa 2000 mg; 25 kg = 2 mL dung dịch 50%', caps[2] === 2000 && caps[3] === 2);
  ok('Midazolam IM theo dải cân nặng: 10 kg 2 mg; 20 kg 5 mg; 50 kg 10 mg', caps[4] === 2 && caps[5] === 5 && caps[6] === 10, caps.slice(4, 7));
  ok('Morphine 150 kg: trần 5–10 mg', caps[7] === '5–10', caps[7]);
  ok('Nhãn tự sinh từ dữ liệu: "0,1 mg/kg, tối đa 6 mg"', caps[8] === '0,1 mg/kg, tối đa 6 mg', caps[8]);
  // Sửa JSON → kết quả đổi theo (không còn hằng số trong code)
  await page.evaluate(() => { showModule('asthma'); document.getElementById('a-wt').value = 80; document.getElementById('a-sev').value = 'severe'; rec('drug-doses', 'p_mgso4').max = 1500; calcAsthma(); });
  ok('Đổi max MgSO₄ trong dữ liệu → module Hen hiển thị 1500 mg', (await text('asthma-result')).includes('1500 mg'));
  await page.evaluate(() => { rec('drug-doses', 'p_mgso4').max = 2000; });
  await page.evaluate(() => { const r = DATA['neo-abx'].records.find(x => x.id === 'gen-6'); r.interval_h = 36; });
  const g6 = await page.evaluate(() => neoAbx(39, 0).gen.i);
  ok('Đổi luật gentamicin trong data-neo-abx → neoAbx đổi theo', g6 === 36);
  await page.evaluate(() => { DATA['neo-abx'].records.find(x => x.id === 'gen-6').interval_h = 24; });
  // Thiếu bản ghi → báo lỗi an toàn trong module, không làm hỏng trang
  await page.evaluate(() => { const t = DATA['drug-doses']; window.__bk = t.records; t.records = t.records.filter(r => r.id !== 'p_lorazepam'); showModule('seizure'); });
  ok('Thiếu bản ghi liều → hiện cảnh báo "Lỗi dữ liệu" trong module', (await text('seizure')).includes('Lỗi dữ liệu'));
  await page.evaluate(() => { DATA['drug-doses'].records = window.__bk; showModule('seizure'); });
  await page.evaluate(() => showModule('refs'));
  const reg = await text('data-registry');
  ok('Sổ dữ liệu liệt kê 5 bảng và bản ghi liều', ['data-eos-models', 'data-neo-abx', 'data-neo-fluids', 'data-drug-doses', 'data-tpn-products'].every(k => reg.includes(k)) && reg.includes('Xem ' + dj.n + ' bản ghi'));
  await set('n-wt', 1.5);
  for (const m of ['resus', 'neo', 'paed', 'burns', 'sepsis', 'dka', 'seizure', 'asthma', 'svt', 'hyperk', 'hypo']) {
    await page.evaluate(m => showModule(m), m);
    const tx = await page.evaluate(m => document.getElementById(m).innerText, m);
    if (!tx.includes('Dữ liệu drug-doses')) ok(m + ' có nhãn phiên bản dữ liệu', false);
  }
  ok('11 module dùng liều đều hiện nhãn phiên bản dữ liệu', true);

  console.log('17. TPN đọc từ data-tpn-products');
  const fs = require('fs');
  const raw = fs.readFileSync(path, 'utf8');
  const tsrc = await page.evaluate(() => calcTPN.toString() + applyDefaults.toString() + printTPNReport.toString() + runAIAnalysis.toString());
  const hard = ['23.4', '0.46', 'Peditrace', 'Soluvit', 'Vitalipid', 'TPN_DEFAULTS', 'Primene', 'SMOFlipid', '/4*f', '/2*f'].filter(x => tsrc.includes(x));
  ok('Mã TPN (tính, in, AI) không còn tên chế phẩm/nồng độ ghi cứng', hard.length === 0, hard.join(', '));
  const sel = await page.evaluate(() => ({ t: [...document.querySelectorAll('#tpn-type option')].map(o => o.value), a: document.querySelectorAll('#tpn-aa option').length, l: document.querySelectorAll('#tpn-lipid-src option').length, tv: document.getElementById('tpn-type').value }));
  ok('Danh sách chọn TPN sinh từ dữ liệu (5 phác đồ, 4 acid amin, 4 lipid)', sel.t.length === 5 && sel.a === 4 && sel.l === 4, JSON.stringify(sel));
  await page.evaluate(() => { showModule('tpn'); document.getElementById('tpn-type').value = 'vlbw'; applyDefaults(); });
  const base = await page.evaluate(() => ({ na: _tpnData.naVol, vl: _tpnData.vitLipVol, aq: _tpnData.aqVol, gp: _tpnData.glucPct }));
  ok('Kết quả TPN mặc định VLBW không đổi so với v1.3 (túi nước 127,2 mL; glucose 10,87%)', near(base.aq, 127.2) && near(base.gp, 10.87, 0.01), JSON.stringify(base));
  await page.evaluate(() => { TPP('nacl234').conc = 3.42; TPP('vitalipid').ml_per_kg = 2; calcTPN(); });
  const chg = await page.evaluate(() => ({ na: _tpnData.naVol, vl: _tpnData.vitLipVol, txt: document.getElementById('tpn-result').innerText }));
  ok('Đổi nồng độ NaCl gốc trong dữ liệu → thể tích NaCl đổi theo', chg.na > base.na, base.na + '→' + chg.na);
  ok('Đổi liều Vitalipid trong dữ liệu → thể tích vitamin tan trong dầu đổi (4,8 → 2,4 mL)', near(chg.vl, 2.4), chg.vl);
  ok('Tên dung dịch gốc hiển thị theo dữ liệu (3,42 mmol/mL)', chg.txt.includes('3,42 mmol/mL'));
  await page.evaluate(() => { TPP('nacl234').conc = 4; TPP('vitalipid').ml_per_kg = 4; TPP('gir_max').value = 10; document.getElementById('tpn-gir').value = 11; calcTPN(); });
  ok('Đổi ngưỡng GIR tối đa trong dữ liệu → cảnh báo xuất hiện ở GIR 11', (await text('tpn-result')).includes('GIR 11 mg/kg/phút >10'));
  await page.evaluate(() => { TPP('gir_max').value = 12; applyDefaults(); });
  ok('Module TPN có nhãn phiên bản tpn-products', (await text('tpn-result')).includes('tpn-products'));

  console.log('18. Bảng liều tham khảo sinh từ data-drug-doses');
  ok('HTML nguồn không còn bảng liều tĩnh cũ', !raw.includes('Liều 3: 0.3 mg/kg (max 12 mg)') && !raw.includes('<!-- RESUS DRUGS -->') && raw.includes('id="dose-reference"'));
  const ref = await page.evaluate(() => { const el = document.getElementById('dose-reference'); return { secs: el.querySelectorAll('.ref-sec').length, rows: el.querySelectorAll('tbody tr').length, n: DATA['drug-doses'].records.filter(r => r.type === 'ref_row').length, txt: el.innerText }; });
  ok(`Đủ ${ref.n} dòng trong 7 nhóm`, ref.secs === 7 && ref.rows === ref.n, JSON.stringify({ secs: ref.secs, rows: ref.rows }));
  ok('Không lỗi dữ liệu bảng liều', !ref.txt.includes('Lỗi dữ liệu'));
  ok('Adenosine hiển thị đúng nhãn sinh từ dữ liệu', ref.txt.includes('Liều 1: 0,1 mg/kg, tối đa 6 mg') && ref.txt.includes('Liều 3: 0,3 mg/kg, tối đa 12 mg'));
  ok('Gentamicin sơ sinh sinh từ luật data-neo-abx', ref.txt.includes('PMA <30 tuần, PNA <8 ngày: 5 mg/kg mỗi 48 giờ') && ref.txt.includes('PMA ≥35 tuần: 4 mg/kg mỗi 24 giờ'), ref.txt.match(/PMA <30 tuần[^\n]*/)?.[0]);
  ok('Midazolam IM theo dải cân nặng hiển thị từ dữ liệu', ref.txt.includes('IM: <13 kg: 0,2 mg/kg; 13–40 kg: 5 mg; >40 kg: 10 mg'));
  ok('Liều truyền hiển thị đơn vị theo giờ/phút (per_unit)', ref.txt.includes('2–20 mcg/kg/phút') && ref.txt.includes('6 mg/kg pha đủ 50 mL → 1 mL/h = 2 mcg/kg/phút'));
  await page.evaluate(() => { rec('drug-doses', 'p_mgso4').max = 1800; renderDoseReference(); });
  ok('Đổi max MgSO₄ trong dữ liệu → bảng tham khảo đổi theo', (await page.evaluate(() => document.getElementById('dose-reference').innerText)).includes('40 mg/kg, tối đa 1800 mg'));
  await page.evaluate(() => { rec('drug-doses', 'p_mgso4').max = 2000; renderDoseReference(); });
  const consist = await page.evaluate(() => { showModule('asthma'); document.getElementById('a-wt').value = 80; document.getElementById('a-sev').value = 'severe'; calcAsthma(); return [document.getElementById('asthma-result').innerText.includes('40 mg/kg, tối đa 2000 mg'), document.getElementById('dose-reference').innerText.includes('40 mg/kg, tối đa 2000 mg')]; });
  ok('Module Hen và bảng tham khảo hiển thị cùng một nhãn liều MgSO₄', consist[0] && consist[1], JSON.stringify(consist));

  console.log('16. Điện thoại – không tràn ngang (390 px và 320 px)');
  for (const W of [390, 320]) {
    const mp = await browser.newPage({ viewport: { width: W, height: 800 } });
    await mp.goto('file://' + path);
    const over = [];
    for (const m of ['home', 'resus', 'neo', 'paed', 'burns', 'sepsis', 'dka', 'seizure', 'asthma', 'svt', 'hyperk', 'bili', 'hypo', 'cool', 'head', 'adhoc', 'eos', 'tpn', 'guide', 'refs']) {
      await mp.evaluate(m => showModule(m), m);
      const sw = await mp.evaluate(() => document.documentElement.scrollWidth);
      if (sw > W) over.push(m + ':' + sw);
    }
    const nav = await mp.evaluate(() => { const s = document.querySelector('.sidebar'); const ic = s.querySelector('.nav-icon'); return { w: s.getBoundingClientRect().width, icon: getComputedStyle(ic).display !== 'none' }; });
    ok(`${W} px: 20 trang không tràn ngang`, over.length === 0, over.join(' '));
    ok(`${W} px: thanh điều hướng ngang toàn chiều rộng, icon hiển thị`, Math.round(nav.w) === W && nav.icon, JSON.stringify(nav));
    await mp.close();
  }

  console.log('19. Giao diện mặc định Ease + nút chuyển');
  {
    const tp = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await tp.goto('file://' + path);
    const t0 = await tp.evaluate(() => ({ ease: document.body.classList.contains('theme-ease'), btn: document.getElementById('theme-fab').textContent, bg: getComputedStyle(document.body).backgroundColor }));
    ok('Mặc định bật giao diện Ease (nền kem #faf8f2)', t0.ease && t0.bg === 'rgb(250, 248, 242)', JSON.stringify(t0));
    await tp.evaluate(() => toggleTheme());
    const t1 = await tp.evaluate(() => ({ ease: document.body.classList.contains('theme-ease'), btn: document.getElementById('theme-fab').textContent }));
    ok('Bấm nút → về giao diện cũ, nhãn nút đổi', !t1.ease && t1.btn.includes('Giao diện mới'), JSON.stringify(t1));
    await tp.reload();
    ok('Lựa chọn giao diện cũ được nhớ sau khi tải lại', !(await tp.evaluate(() => document.body.classList.contains('theme-ease'))));
    await tp.goto('file://' + path + '?theme=ease');
    ok('?theme=ease ghi đè lựa chọn đã lưu', await tp.evaluate(() => document.body.classList.contains('theme-ease')));
    await tp.close();
  }

  console.log('20. Cấu trúc module (data-modules): nhóm, tên, thứ tự, icon 3D');
  {
    const st = await page.evaluate(() => {
      showModule('home');
      const MD = DATA['modules'];
      const ids = MD.records.map(r => r.id);
      const nav = [...document.querySelectorAll('nav.sidebar .nav-item')].map(n => (n.getAttribute('onclick').match(/'([^']+)'/) || [])[1]);
      const cards = [...document.querySelectorAll('#home-groups .home-card')].map(n => (n.getAttribute('onclick').match(/'([^']+)'/) || [])[1]);
      const titles = MD.records.filter(r => document.getElementById(r.id)).map(r => [r.id, document.querySelector('#' + r.id + ' .module-title').textContent.trim() === r.title]);
      const icon = getComputedStyle(document.querySelector('#home-groups .home-ico .i3d')).backgroundImage;
      const paed = MD.records.filter(r => r.group === 'paedem').sort((a, b) => a.order - b.order).map(r => r.abcde).join('');
      const modsDom = [...document.querySelectorAll('.module')].map(m => m.id);
      return { ids, nav, cards, titles, icon, paed, modsDom, groups: document.querySelectorAll('#home-groups .home-group').length, ov: document.querySelectorAll('#module-overview tbody tr').length };
    });
    ok('Điều hướng = Trang chủ + đủ 19 module theo đúng thứ tự dữ liệu', JSON.stringify(st.nav) === JSON.stringify(['home', ...st.ids]), st.nav.join(','));
    ok('Trang chủ: 5 nhóm, mỗi module đúng 1 thẻ (không trùng EOS)', st.groups === 5 && st.cards.length === st.ids.length && new Set(st.cards).size === st.cards.length, st.cards.join(','));
    ok('Mọi module trong dữ liệu đều có màn hình tương ứng', st.ids.every(i => st.modsDom.includes(i)), st.ids.filter(i => !st.modsDom.includes(i)).join(','));
    ok('Tiêu đề từng module lấy từ dữ liệu', st.titles.every(t => t[1]), st.titles.filter(t => !t[1]).map(t => t[0]).join(','));
    ok('Nhóm Cấp cứu nhi khoa xếp theo ABCDE (B→C→D→E)', st.paed === [...st.paed].sort().join('') && st.paed.startsWith('B'), st.paed);
    ok('Icon 3D nhúng (data:image/webp) hiển thị', st.icon.startsWith('url("data:image/webp'), st.icon.slice(0, 40));
    ok('Bảng tổng quan trang Hướng dẫn liệt kê 20 module lâm sàng', st.ov === 20, st.ov);
  }

  console.log('21. Icon 3D tiêu đề thẻ + đánh số bước');
  {
    const steps = async sev => page.evaluate(sev => { showModule('asthma'); document.getElementById('a-wt').value = 25; document.getElementById('a-sev').value = sev; calcAsthma(); return [...document.querySelectorAll('#asthma-result .step-num')].map(x => x.textContent).join(','); }, sev);
    ok('Hen mức vừa: bước 1,2,3 liên tục', (await steps('moderate')) === '1,2,3', await steps('moderate'));
    ok('Hen nguy kịch: bước 1→7 liên tục', (await steps('critical')) === '1,2,3,4,5,6,7', await steps('critical'));
    await page.waitForTimeout(100);
    const ic = await page.evaluate(() => {
      const out = {};
      for (const m of ['resus', 'neo', 'paed', 'tpn', 'eos', 'guide']) { showModule(m); }
      return out;
    });
    await page.waitForTimeout(200);
    const cov = await page.evaluate(() => {
      const t = [...document.querySelectorAll('.card-title')];
      const withIcon = t.filter(x => x.querySelector(':scope > .i3d')).length;
      const leftEmoji = t.filter(x => !x.querySelector(':scope > .i3d') && /^\s*\p{Extended_Pictographic}/u.test(x.textContent)).map(x => x.textContent.trim().slice(0, 25));
      return { total: t.length, withIcon, leftEmoji };
    });
    ok(`Tiêu đề thẻ có icon 3D (${cov.withIcon}/${cov.total})`, cov.withIcon > 40, JSON.stringify(cov));
    ok('Chỉ còn emoji không có bản 3D (cờ 🇻🇳) hoặc không còn', cov.leftEmoji.every(x => /🇻🇳/u.test(x)), cov.leftEmoji.join(' | '));
    await page.evaluate(() => { showModule('asthma'); calcAsthma(); });
    await page.waitForTimeout(150);
    ok('Thẻ sinh lại khi tính toán vẫn được gắn icon 3D', await page.evaluate(() => !!document.querySelector('#asthma-result .card-title > .i3d-lungs')));
  }

  console.log('22. Màu hành động theme Ease: thương hiệu NeoPed ở trang chủ, màu nhóm trong module – không còn hồng Phương Nam');
  {
    await page.goto('file://' + path + '?theme=ease'); await page.waitForTimeout(300);
    const pinkish = c => (c.match(/\d+/g) || []).length >= 3 && (([r, g, b]) => r > g + 50 && b > g + 15 && r > b)(c.match(/\d+/g).map(Number));
    const home = await page.evaluate(() => ({ btn: getComputedStyle(document.querySelector('#home .print-bar-btn')).backgroundColor, nav: getComputedStyle(document.querySelector('.nav-item.active')).color }));
    ok('Nút "In trang chủ" màu thương hiệu (#115e59)', home.btn === 'rgb(17, 94, 89)', home.btn);
    ok('Mục "Trang chủ" đang chọn không còn hồng', !pinkish(home.nav), home.nav);
    await page.evaluate(() => showModule('eos')); await page.waitForTimeout(400);
    const eos = await page.evaluate(() => ({ btn: getComputedStyle(document.querySelector('#eos .print-bar-btn')).backgroundColor, nav: getComputedStyle(document.querySelector('.nav-item.active')).color }));
    ok('Nút In trong module Sơ sinh theo màu nhóm (#6d28d9)', eos.btn === 'rgb(109, 40, 217)', eos.btn);
    ok('Mục đang chọn trong nav theo màu nhóm', eos.nav === 'rgb(109, 40, 217)', eos.nav);
    const left = await page.evaluate(() => { const out = []; for (const id of [...document.querySelectorAll('.module')].map(m => m.id)) { showModule(id); const root = document.getElementById(id);
      for (const el of root.querySelectorAll('*')) { if (!el.getClientRects().length) continue; const s = getComputedStyle(el); for (const k of ['color', 'backgroundColor', 'backgroundImage']) { const m = (s[k].match(/rgb\(\d+, \d+, \d+/g) || []); if (m.some(x => { const [r, g, b] = x.match(/\d+/g).map(Number); return r > g + 50 && b > g + 15 && r > b; })) out.push(id + ':' + (el.className || el.tagName)); } } } return out; });
    ok('Không còn màu hồng trên màn hình theme Ease (mọi module)', left.length === 0, left.slice(0, 8).join(' | '));
    await page.evaluate(() => showModule('home'));
  }

  console.log('23. Chế độ hiển thị Sáng · Ấm · Tối');
  {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const dp = await ctx.newPage(); const derr = []; dp.on('pageerror', e => derr.push(e.message));
    await dp.goto('file://' + path); await dp.waitForTimeout(300);
    const st = () => dp.evaluate(() => { const on = [...document.querySelectorAll('#mode-switch .mode-opt[aria-checked="true"]')]; return { dark: document.body.classList.contains('mode-dark'), warm: document.body.classList.contains('mode-warm'), aria: on.length === 1 ? on[0].dataset.mode : on.length, bg: getComputedStyle(document.body).backgroundColor, label: document.querySelector('#mode-switch .mode-label').textContent }; });
    let s = await st();
    ok('Lần đầu: theo hệ điều hành (prefers-color-scheme: dark)', s.dark && s.aria === 'dark' && s.label === 'Tối', JSON.stringify(s));
    ok('Nền tối thật sự (#0e1716)', s.bg === 'rgb(14, 23, 22)', s.bg);
    await dp.click('#mode-switch .mode-opt[data-mode="light"]'); await dp.waitForTimeout(150); s = await st();
    ok('Bấm nút Sáng → sáng, chỉ một nút aria-checked', !s.dark && !s.warm && s.aria === 'light' && s.label === 'Sáng', JSON.stringify(s));
    await dp.click('#mode-switch .mode-opt[data-mode="warm"]'); await dp.waitForTimeout(150); s = await st();
    ok('Bấm nút Ấm → nền giấy ngà #f5ecdc', s.warm && !s.dark && s.aria === 'warm' && s.label === 'Ấm' && s.bg === 'rgb(245, 236, 220)', JSON.stringify(s));
    await dp.click('#mode-switch .mode-opt[data-mode="light"]'); await dp.waitForTimeout(100);
    await dp.reload(); await dp.waitForTimeout(300); s = await st();
    ok('Lựa chọn được nhớ sau khi tải lại (ưu tiên hơn hệ điều hành)', !s.dark, JSON.stringify(s));
    await dp.focus('#mode-switch .mode-opt[aria-checked="true"]'); await dp.keyboard.press('ArrowRight'); await dp.waitForTimeout(100); s = await st();
    const foc = await dp.evaluate(() => document.activeElement.dataset.mode);
    ok('Bàn phím: → từ Sáng sang Ấm, focus đi theo', s.warm && foc === 'warm', JSON.stringify(s) + ' focus=' + foc);
    await dp.keyboard.press('ArrowRight'); await dp.waitForTimeout(100); s = await st();
    ok('Bàn phím: → từ Ấm sang Tối', s.dark && s.aria === 'dark', JSON.stringify(s));
    // màu inline: đảo độ sáng nhưng giữ sắc độ, có bản gốc để in
    await dp.evaluate(() => { showModule('home'); const d = document.createElement('div'); d.id = 'dk-probe'; d.setAttribute('style', 'background:#ffebee;color:#c62828;border:1px solid #ef9a9a'); d.textContent = 'x'; document.getElementById('home').appendChild(d); });
    await dp.waitForTimeout(100);
    const pr = await dp.evaluate(() => { const d = document.getElementById('dk-probe'), s = getComputedStyle(d); return { bg: s.backgroundColor, fg: s.color, light: d.dataset.lightStyle }; });
    const rgb = c => c.match(/\d+/g).map(Number), lum = c => { const [r, g, b] = rgb(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
    ok('Nền inline sáng (#ffebee) → tối, vẫn ngả đỏ', lum(pr.bg) < 0.25 && rgb(pr.bg)[0] > rgb(pr.bg)[1], pr.bg);
    ok('Chữ inline đỏ đậm (#c62828) → đỏ sáng đọc được trên nền tối', lum(pr.fg) > 0.5 && rgb(pr.fg)[0] > rgb(pr.fg)[1] + 40, pr.fg);
    ok('Lưu bản gốc để in (data-light-style)', /#ffebee/.test(pr.light || ''), pr.light);
    await dp.evaluate(() => window.dispatchEvent(new Event('beforeprint'))); await dp.waitForTimeout(100);
    ok('Trước khi in: trả về màu gốc (nền trắng)', await dp.evaluate(() => getComputedStyle(document.getElementById('dk-probe')).backgroundColor === 'rgb(255, 235, 238)'));
    await dp.evaluate(() => window.dispatchEvent(new Event('afterprint'))); await dp.waitForTimeout(100);
    ok('Sau khi in: quay lại màu tối', await dp.evaluate(() => getComputedStyle(document.getElementById('dk-probe')).backgroundColor !== 'rgb(255, 235, 238)'));
    await dp.evaluate(() => toggleMode()); await dp.waitForTimeout(100);
    ok('Chuyển về sáng: khôi phục đúng style gốc', await dp.evaluate(() => document.getElementById('dk-probe').getAttribute('style') === 'background:#ffebee;color:#c62828;border:1px solid #ef9a9a'));
    await dp.evaluate(() => { const d = document.getElementById('dk-probe'); d.setAttribute('style', 'background:#ffffff;color:#c62828'); applyMode('warm'); });
    const wp = await dp.evaluate(() => { const s = getComputedStyle(document.getElementById('dk-probe')); return [s.backgroundColor, s.color]; });
    ok('Ấm: nền inline trắng → ngà, chữ giữ nguyên', wp[0] === 'rgb(253, 248, 238)' && wp[1] === 'rgb(198, 40, 40)', wp.join(' / '));
    await dp.evaluate(() => applyMode('dark')); await dp.waitForTimeout(50);
    ok('Ấm → Tối: chuyển từ màu GỐC (không chồng hai lần)', await dp.evaluate(() => { const d = document.getElementById('dk-probe'); return d.dataset.lightStyle === 'background:#ffffff;color:#c62828' && d.dataset.adMode === 'dark'; }));
    await dp.evaluate(() => { applyMode('light'); document.getElementById('dk-probe').remove(); });
    // tương phản chữ/nền ở chế độ tối trên mọi module (sau khi tính toán)
    for (const md of ['dark', 'warm']) {
    await dp.goto('file://' + path + '?mode=' + md); await dp.waitForTimeout(300);
    // bấm tính toán trước, đo ở lượt sau (MutationObserver chuyển màu ở microtask, trước khi trình duyệt vẽ)
    const ids = await dp.evaluate(() => [...document.querySelectorAll('.module')].map(m => m.id)); const bad = [];
    for (const id of ids) {
      await dp.evaluate(id => { showModule(id); document.getElementById(id).querySelectorAll('button.btn').forEach(b => { const oc = b.getAttribute('onclick') || ''; if (/calc|compute|update|apply|estimate/i.test(oc) && !/AI|print/i.test(oc)) try { b.click(); } catch (e) { } }); }, id);
      await dp.waitForTimeout(60);
      bad.push(...await dp.evaluate(id => {
      const P = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,\/]+/).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] == null ? 1 : v[3] }; };
      const L = ({ r, g, b }) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
      const bgOf = el => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage !== 'none') { const m = s.backgroundImage.match(/rgba?\([^)]+\)/); if (m) return P(m[0]); } const c = P(s.backgroundColor); if (c && c.a > .5) return c; } return { r: 14, g: 23, b: 22 }; };
      const out = [];
      { const root = document.getElementById(id);
        for (const el of root.querySelectorAll('*')) {
          if (!el.getClientRects().length || el.closest('.comp-bar')) continue;
          if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
          const s = getComputedStyle(el); const fg = P(s.color), bg = bgOf(el); const a = L(fg), b = L(bg);
          const cr = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
          if (cr < 4) out.push(id + ':' + (el.className || el.tagName) + ' ' + cr.toFixed(1));
        }
      }
      return out;
    }, id));
    }
    await dp.evaluate(() => showModule('home'));
    ok(`Chế độ ${md === 'dark' ? 'Tối' : 'Ấm'}: mọi chữ đạt tương phản ≥4:1 (mọi module, sau khi tính toán)`, bad.length === 0, bad.slice(0, 8).join(' | '));
    }
    const mob = await ctx.newPage(); await mob.setViewportSize({ width: 320, height: 640 }); await mob.goto('file://' + path + '?mode=dark'); await mob.waitForTimeout(300);
    const mv = await mob.evaluate(() => { const r = document.getElementById('mode-switch').getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, vis: r.width > 0 && r.right <= innerWidth && r.top < 80 }; });
    ok('Điện thoại 320 px: nhóm 3 nút hiển thị trên header, không tràn ngang', mv.vis && mv.sw <= 320, JSON.stringify(mv));
    ok('Không có lỗi runtime ở chế độ tối', derr.length === 0, derr.join(' | '));
    await ctx.close();
  }

  console.log('24. Nhóm Sơ sinh v2.0 – RDS, truyền chế phẩm máu, nuôi ăn đường tiêu hóa (giá trị kỳ vọng tính tay độc lập)');
  {
    await page.goto('file://' + path); await page.waitForTimeout(300);
    const t = await page.evaluate(() => ({
      nav: [...document.querySelectorAll('.nav-item')].map(n => (n.getAttribute('onclick') || '').match(/'(\w+)'/)?.[1]).filter(Boolean),
      neoNav: DATA.modules.records.filter(r => r.group === 'neo').sort((a, b) => a.order - b.order).map(r => r.id).join(','),
      err: DATA_ERR.slice(),
      // RDS
      oi: oxyIndex(10, 60, 50), oiKpa: Math.round(oxyIndex(12, 80, pao2ToMmHg(8, 'kpa')) * 10) / 10,
      osi: oxySatIndex(10, 50, 90),
      por: surfactantDose('poractant', 1.2), ber: surfactantDose('beractant', 1.2), cal: surfactantDose('calfactant', 1.2),
      por07: surfactantDose('poractant', 0.7),
      // Truyền máu
      th: [rbcThreshold(3, true).thr, rbcThreshold(3, false).thr, rbcThreshold(10, true).thr, rbcThreshold(10, false).thr, rbcThreshold(20, true).thr, rbcThreshold(20, false).thr],
      thEdge: [rbcThreshold(6, false).week, rbcThreshold(7, false).week, rbcThreshold(13, false).week, rbcThreshold(14, false).week],
      hb: [hbToGdl(95, 'gl'), hbToGdl(9.5, 'gdl')],
      hct: Math.round(rbcVolumeByHct(1, 28, 0.25, 0.35, 0.6).ml * 10) / 10, hctTerm: Math.round(rbcVolumeByHct(3, 39, 0.30, 0.40, 0.6).ml * 10) / 10,
      plt: ['none', 'minor', 'major'].map(k => pltThreshold(k).thr),
      // Nuôi ăn
      step: [enteralStep(0.75), enteralStep(0.999), enteralStep(1.0), enteralStep(2)],
      plan: enteralPlan(1.2, 40, 30, 160, 8, 'ebm', 'auto'),
      planNoF: enteralPlan(1.2, 100, 30, 160, 8, 'ebm', 'no'),
      planPTF: enteralPlan(1.0, 150, 20, 160, 12, 'ptf', 'auto'),
    }));
    ok('Không lỗi dữ liệu khi nạp 3 khối mới', t.err.length === 0, t.err.join(' | '));
    ok('Thứ tự nhóm Sơ sinh: NICU → RDS → EOS → bilirubin → glucose → nuôi ăn → truyền máu → HIE', t.neoNav === 'neo,rds,eos,bili,hypo,enteral,transfuse,cool', t.neoNav);
    ok('3 module mới có trên thanh điều hướng', ['rds', 'transfuse', 'enteral'].every(x => t.nav.includes(x)), t.nav.join(','));
    // RDS – OI = MAP × FiO2 / PaO2: 10×60/50 = 12; 8 kPa = 60,005 mmHg → 12×80/60,005 = 16,0
    ok('OI = 10 × 60 / 50 = 12', t.oi === 12, t.oi);
    ok('OI với PaO₂ 8 kPa (= 60,0 mmHg): 12 × 80 / 60,0 = 16,0', t.oiKpa === 16, t.oiKpa);
    ok('OSI = 10 × 50 / 90 = 5,56', Math.abs(t.osi - 5.556) < 0.01, t.osi);
    // Poractant 200 mg/kg × 1,2 kg = 240 mg = 3 mL (80 mg/mL) → 1 lọ 3 mL; nhắc 100 mg/kg = 120 mg = 1,5 mL
    ok('Poractant 1,2 kg: liều đầu 240 mg = 3 mL, 1 lọ 3 mL', t.por.first_mg === 240 && t.por.first_ml === 3 && /^1 lọ 3 mL/.test(t.por.vials), JSON.stringify(t.por));
    ok('Poractant 1,2 kg: liều nhắc 120 mg = 1,5 mL; tổng tối đa 480 mg', t.por.rep_mg === 120 && t.por.rep_ml === 1.5 && t.por.max_total_mg === 480);
    ok('Beractant 1,2 kg: 100 mg/kg = 120 mg = 4,8 mL (25 mg/mL)', t.ber.first_mg === 120 && t.ber.first_ml === 4.8);
    ok('Calfactant 1,2 kg: 105 mg/kg = 126 mg = 3,6 mL (35 mg/mL)', t.cal.first_mg === 126 && t.cal.first_ml === 3.6);
    ok('Poractant 0,7 kg: 140 mg = 1,75 mL → 1 lọ 3 mL (ít hao phí hơn 2 lọ 1,5 mL? cùng 3 mL → chọn ít lọ)', t.por07.first_ml === 1.75 && /^1 lọ 3 mL/.test(t.por07.vials), t.por07.vials);
    // TOP ngưỡng thấp (g/dL): tuần 1 11/10, tuần 2 10/8,5, tuần ≥3 8,5/7
    ok('Ngưỡng Hb TOP (thấp): 11/10 · 10/8,5 · 8,5/7 g/dL', JSON.stringify(t.th) === JSON.stringify([11, 10, 10, 8.5, 8.5, 7]), JSON.stringify(t.th));
    ok('Ranh giới tuần: ngày 6 → tuần 1; ngày 7 → tuần 2; ngày 13 → tuần 2; ngày 14 → tuần 3', JSON.stringify(t.thEdge) === '[1,2,2,3]', JSON.stringify(t.thEdge));
    ok('Quy đổi Hb: 95 g/L = 9,5 g/dL; g/dL giữ nguyên', t.hb[0] === 9.5 && t.hb[1] === 9.5);
    // V = CN × EBV × ΔHct / Hct túi: 1 × 90 × 0,10 / 0,6 = 15 mL; đủ tháng 3 × 85 × 0,10 / 0,6 = 42,5 mL
    ok('Thể tích theo Hct (non tháng, EBV 90): 15,0 mL', t.hct === 15, t.hct);
    ok('Thể tích theo Hct (đủ tháng, EBV 85): 42,5 mL', t.hctTerm === 42.5, t.hctTerm);
    ok('Ngưỡng tiểu cầu: 25 / 50 / 100 ×10⁹/L', JSON.stringify(t.plt) === '[25,50,100]', JSON.stringify(t.plt));
    // Nuôi ăn: 1,2 kg, 40 → +30/ngày → 160; mL/cữ = mL/kg × CN / 8
    ok('Bước tăng: <1000 g → 20; ≥1000 g → 30 mL/kg/ngày (ranh giới 1,0 kg)', JSON.stringify(t.step) === '[20,20,30,30]', JSON.stringify(t.step));
    ok('Lịch 1,2 kg: 40 → 70 → 100 → 130 → 160 mL/kg/ngày', t.plan.map(r => r.mlkg).join(',') === '40,70,100,130,160', t.plan.map(r => r.mlkg).join(','));
    ok('mL mỗi cữ (8 cữ): 6 · 10,5 · 15 · 19,5 · 24 mL', t.plan.map(r => r.mlfeed).join(',') === '6,10.5,15,19.5,24', t.plan.map(r => r.mlfeed).join(','));
    ok('Tăng cường sữa mẹ bắt đầu ở 100 mL/kg/ngày', t.plan.map(r => r.fortified ? 1 : 0).join('') === '00111', t.plan.map(r => r.fortified ? 1 : 0).join(''));
    ok('160 mL/kg sữa mẹ + HMF: 160 × 82/100 = 131,2 kcal/kg; 160 × 2,4/100 = 3,84 g/kg', t.plan[4].kcal === 131.2 && t.plan[4].prot === 3.84, t.plan[4].kcal + ' / ' + t.plan[4].prot);
    ok('Không tăng cường: 160 × 67/100 = 107,2 kcal/kg; 2,08 g/kg (dưới đích)', t.planNoF.at(-1).kcal === 107.2 && t.planNoF.at(-1).prot === 2.08, t.planNoF.at(-1).kcal + ' / ' + t.planNoF.at(-1).prot);
    ok('Sữa công thức sinh non không bị cộng HMF; 12 cữ: 160 × 1,0 / 12 = 13,3 mL', t.planPTF.at(-1).fortified === false && t.planPTF.at(-1).mlfeed === 13.3 && t.planPTF.at(-1).kcal === 128, JSON.stringify(t.planPTF.at(-1)));
    // Giao diện + ca biên
    const ui = await page.evaluate(() => {
      const o = {};
      showModule('rds'); ['s1', 's2', 's3', 's4', 's5'].forEach((k, i) => document.getElementById('rds-' + k).value = [2, 2, 1, 1, 2][i]);
      document.getElementById('rds-cpap').value = 5; document.getElementById('rds-fio2').value = 40; calcRDS();
      o.rds1 = document.getElementById('rds-result').innerText;
      document.getElementById('rds-cpap').value = 7; document.getElementById('rds-fio2').value = 30; calcRDS();
      o.rds2 = document.getElementById('rds-result').innerText;
      document.getElementById('rds-fio2').value = 15; calcRDS(); o.rds3 = document.getElementById('rds-result').innerText;
      document.getElementById('rds-fio2').value = 35; document.getElementById('rds-map').value = 10; document.getElementById('rds-pao2').value = 6; document.getElementById('rds-pao2u').value = 'kpa'; calcRDS();
      o.rds4 = document.getElementById('rds-result').innerText;
      showModule('transfuse'); document.getElementById('tf-hbu').value = 'gl'; document.getElementById('tf-hb').value = 95; calcTransfuse(); o.tf1 = document.getElementById('transfuse-result').innerText;
      document.getElementById('tf-hbu').value = 'gdl'; document.getElementById('tf-hb').value = 95; calcTransfuse(); o.tf2 = document.getElementById('transfuse-result').innerText;
      document.getElementById('tf-hb').value = 9.5; document.getElementById('tf-wt').value = 2.5; document.getElementById('tf-ga').value = 35; calcTransfuse(); o.tf3 = document.getElementById('transfuse-result').innerText;
      document.getElementById('tf-hct').value = 20; document.getElementById('tf-hctt').value = 45; calcTransfuse(); o.tf4 = document.getElementById('transfuse-result').innerText;
      document.getElementById('tf-wt').value = 0.9; document.getElementById('tf-ga').value = 26; document.getElementById('tf-hct').value = ''; document.getElementById('tf-hctt').value = '';
      document.getElementById('tf-plt').value = 30; document.getElementById('tf-bleed').value = 'none'; calcTransfuse(); o.tf5 = document.getElementById('transfuse-result').innerText;
      document.getElementById('tf-bleed').value = 'minor'; calcTransfuse(); o.tf6 = document.getElementById('transfuse-result').innerText;
      showModule('enteral'); document.getElementById('en-step').value = 40; calcEnteral(); o.en1 = document.getElementById('enteral-result').innerText;
      document.getElementById('en-step').value = ''; document.getElementById('en-milk').value = 'ptf'; calcEnteral(); o.en2 = document.getElementById('enteral-result').innerText;
      document.getElementById('en-milk').value = 'ebm'; document.getElementById('en-wt').value = 1.3; document.getElementById('en-cur').value = 90; calcEnteral(); applyEnteralToTPN();
      o.tpn = { active: document.getElementById('tpn').classList.contains('active'), wt: document.getElementById('tpn-wt').value, en: document.getElementById('tpn-enteral').value, note: !!document.getElementById('en-sync-note') };
      applyEnteralToTPN(); o.notes = document.querySelectorAll('#en-sync-note').length;
      return o;
    });
    ok('RDS: Silverman 2+2+1+1+2 = 8 → suy hô hấp nặng', /8\/10/.test(ui.rds1) && /nặng/.test(ui.rds1));
    ok('RDS: FiO₂ 40% khi CPAP 5 → khuyên tăng CPAP trước, chưa kết luận đủ tiêu chí', /tăng CPAP/.test(ui.rds1) && !/ĐỦ TIÊU CHÍ/.test(ui.rds1));
    ok('RDS: FiO₂ đúng 30% (không >30%) → chưa đến ngưỡng surfactant', /Chưa đến ngưỡng/.test(ui.rds2));
    ok('RDS: FiO₂ 15% (ngoài 21–100) → cảnh báo nhập liệu', /FiO₂ 21–100%/.test(ui.rds3));
    ok('RDS: OI với PaO₂ 6 kPa (45 mmHg): 10 × 35 / 45 = 7,8', /OI = 10 × 35 \/ 45 mmHg = 7.8/.test(ui.rds4), ui.rds4.match(/OI =[^\n]*/)?.[0]);
    ok('Truyền máu: Hb 95 g/L đọc đúng = 9,5 g/dL < 10 → có chỉ định', /Hb 9.5 g\/dL/.test(ui.tf1) && /CÓ chỉ định truyền hồng cầu/.test(ui.tf1));
    ok('Truyền máu: nhập 95 nhưng chọn g/dL → chặn (ngoài khoảng sinh lý)', /ngoài khoảng sinh lý/.test(ui.tf2));
    ok('Truyền máu: trẻ 35 tuần, 2,5 kg → cảnh báo ngoài quần thể TOP', /Ngoài quần thể nghiên cứu TOP/.test(ui.tf3));
    ok('Truyền máu: Hct 20→45% ở 2,5 kg, 35 tuần (non tháng, 90 mL/kg) = 93,8 mL = 37,5 mL/kg → cảnh báo vượt 20 mL/kg, giới hạn 50 mL', /93.8 mL/.test(ui.tf4) && /giới hạn 50 mL/.test(ui.tf4) && /vượt 20 mL\/kg/.test(ui.tf4), ui.tf4.match(/Theo Hct[^\n]*/)?.[0]);
    ok('Tiểu cầu 30, không chảy máu (ngưỡng 25) → chưa truyền', /Tiểu cầu 30 ≥ 25/.test(ui.tf5));
    ok('Tiểu cầu 30, chảy máu nhẹ (ngưỡng 50) → truyền 15 mL/kg = 13,5 mL', /Tiểu cầu 30 < 50/.test(ui.tf6) && /13.5 mL/.test(ui.tf6));
    ok('Nuôi ăn: bước 40 mL/kg/ngày → 2 cảnh báo (trên mặc định, vượt SIFT)', /cao hơn mặc định/.test(ui.en1) && /vượt mức đã thử nghiệm trong SIFT/.test(ui.en1));
    ok('Nuôi ăn: sữa công thức sinh non + "tự tăng cường" → nhắc không pha HMF', /không pha chất tăng cường/.test(ui.en2));
    ok('Nút chuyển sang PN: mở module PN, điền 1,3 kg và 90 mL/kg/ngày, có ghi chú', ui.tpn.active && ui.tpn.wt === '1.3' && ui.tpn.en === '90' && ui.tpn.note, JSON.stringify(ui.tpn));
    ok('Bấm chuyển lần 2 không nhân đôi ghi chú', ui.notes === 1, ui.notes);
    await page.evaluate(() => showModule('home'));
  }

  console.log('25. P0 v2.1 – an toàn liều, dấu thập phân, bảo mật');
  {
    const ctx = await browser.newContext(); const pg = await ctx.newPage();
    const perr = [], csp = [], net = [];
    pg.on('pageerror', e => perr.push(e.message));
    pg.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text()); });
    pg.on('request', r => { if (!/^(file|data|about|blob):/.test(r.url()) && !/fonts\.(googleapis|gstatic)\.com/.test(r.url())) net.push(r.url()); });
    await pg.goto('file://' + path); await pg.waitForTimeout(300);
    // Diazepam IV theo AES 2016: 0,15–0,2 mg/kg, tối đa 10 mg
    const dia = await pg.evaluate(() => ({ r20: dzr('p_diazepam_iv', 20), r80: dzr('p_diazepam_iv', 80), lab: dlab('p_diazepam_iv'), ver: DATA['drug-doses'].version }));
    ok('Diazepam IV 20 kg = 3–4 mg (0,15–0,2 mg/kg)', dia.r20 === '3–4', dia.r20);
    ok('Diazepam IV 80 kg = 10 mg (chạm liều tối đa)', dia.r80 === '10', dia.r80);
    ok('Nhãn diazepam hiển thị "0,15–0,2 mg/kg, tối đa 10 mg"', dia.lab === '0,15–0,2 mg/kg, tối đa 10 mg', dia.lab);
    ok('data-drug-doses tăng phiên bản 1.2.0', dia.ver === '1.2.0', dia.ver);
    // Thuốc NICU: bicarbonat/calci không nằm trong bảng thuốc hồi sức
    const neo = await pg.evaluate(() => { showModule('neo'); const cards = [...document.querySelectorAll('#neo-result .card')];
      const res = cards.find(c => /Thuốc Hồi Sức Sơ Sinh/.test(c.querySelector('.card-title').textContent)), sp = cards.find(c => /KHÔNG thuộc phác đồ hồi sức/.test(c.querySelector('.card-title').textContent));
      return { res: res && res.innerText, sp: sp && sp.innerText }; });
    ok('Bảng "Thuốc hồi sức sơ sinh" chỉ có adrenaline + bù thể tích, không bicarbonat/calci', neo.res && /Adrenaline/.test(neo.res) && /NaCl 0,9%/.test(neo.res) && !/bicarbonat|Calci gluconat/i.test(neo.res));
    ok('Bicarbonat và calci nằm ở bảng "chỉ định đặc hiệu" kèm cảnh báo ILCOR/NRP 2020', neo.sp && /bicarbonat/i.test(neo.sp) && /Calci gluconat/.test(neo.sp) && /ILCOR 2020/.test(neo.sp));
    // Dấu thập phân kiểu Việt Nam ở mọi module sau khi tính
    const ids = await pg.evaluate(() => [...document.querySelectorAll('.module')].map(m => m.id).filter(x => !['guide', 'refs'].includes(x)));
    const dots = [];
    for (const id of ids) {
      await pg.evaluate(id => { showModule(id); document.getElementById(id).querySelectorAll('button.btn').forEach(b => { const oc = b.getAttribute('onclick') || ''; if (/calc|compute|update|apply|estimate/i.test(oc) && !/AI|print|TPN\(\)$/i.test(oc)) try { b.click(); } catch (e) { } }); }, id);
      await pg.waitForTimeout(40);
      dots.push(...await pg.evaluate(id => { const out = []; const m = document.getElementById(id); if (!m.classList.contains('active')) return out;
        const w = document.createTreeWalker(m, NodeFilter.SHOW_TEXT); let n;
        while ((n = w.nextNode())) { const p = n.parentElement; if (!p || p.closest('script,style,code,pre,.module-print-hdr,.data-tag,.no-vn,.home-badge,.ver-badge')) continue;
          if (!p.getClientRects().length) continue; const x = n.nodeValue.match(/(^|[^\w.,:/])\d+\.\d+(?![\d.])/); if (x) out.push(id + ': «' + n.nodeValue.trim().slice(0, 40) + '»'); }
        return out; }, id));
    }
    ok('Không còn số thập phân dạng dấu chấm trong các module (sau khi tính toán)', dots.length === 0, dots.slice(0, 6).join(' | '));
    const keep = await pg.evaluate(() => { showModule('resus'); return { ratio: /1:10\.000/.test(document.getElementById('resus-result').textContent), badge: document.querySelector('.ver-badge').textContent }; });
    ok('Giữ nguyên "1:10.000" (dấu chấm hàng nghìn) và số phiên bản trên header', keep.ratio && /\d\.\d/.test(keep.badge), JSON.stringify(keep));
    ok('vnDecText: "9.5 g/dL" → "9,5"; "v2.0", "1:10.000", "1.1.0" giữ nguyên', await pg.evaluate(() => vnDecText('Hb 9.5 g/dL; 0.36–14.5') === 'Hb 9,5 g/dL; 0,36–14,5' && vnDecText('v2.0') === 'v2.0' && vnDecText('1:10.000') === '1:10.000' && vnDecText('bản 1.1.0') === 'bản 1.1.0'));
    // AI tắt, không gửi dữ liệu ra ngoài
    await pg.evaluate(async () => { showModule('tpn'); await runAIAnalysis(); }); await pg.waitForTimeout(150);
    const ai = await pg.evaluate(() => ({ on: AI_ENABLED, txt: document.getElementById('tpn-ai-content').innerText }));
    ok('Phân tích AI tắt mặc định, hiện thông báo bảo vệ dữ liệu', ai.on === false && /đang tắt/.test(ai.txt), ai.txt.slice(0, 80));
    // Thoát HTML tên bệnh nhân (chống XSS) và không điền sẵn dữ liệu giống thật
    const x = await pg.evaluate(() => { const nm = document.getElementById('tpn-name'), mrn = document.getElementById('tpn-mrn');
      const def = { name: nm.value, mrn: mrn.value }; nm.value = '<img src=x onerror="window.__xss=1">'; calcTPN();
      return { def, esc: _tpnData.ptName, xss: !!window.__xss, eh: escHTML('<b>"a"&\'</b>') }; });
    ok('Ô tên/mã hồ sơ TPN để trống mặc định', x.def.name === '' && x.def.mrn === '', JSON.stringify(x.def));
    ok('Tên bệnh nhân được thoát ký tự HTML trước khi in', x.esc.startsWith('&lt;img') && !x.xss, x.esc);
    ok('escHTML thoát đủ & < > " \'', x.eh === '&lt;b&gt;&quot;a&quot;&amp;&#39;&lt;/b&gt;', x.eh);
    // CSP, referrer, bản in
    const meta = await pg.evaluate(() => ({ csp: (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || '', ref: (document.querySelector('meta[name="referrer"]') || {}).content, jci: [...document.querySelectorAll('.module-print-hdr')].some(h => /JCI|RTAC/.test(h.textContent)), rev: [...document.querySelectorAll('#guide td')].find(td => td.textContent === 'Kiểm duyệt y khoa')?.nextElementSibling.textContent || '' }));
    ok('Có Content-Security-Policy chặn kết nối mạng (connect-src none)', /connect-src 'none'/.test(meta.csp) && /default-src 'none'/.test(meta.csp), meta.csp);
    ok('Referrer-Policy no-referrer', meta.ref === 'no-referrer');
    ok('Bản in không còn "JCI Accredited · RTAC"', !meta.jci);
    ok('Mục "Kiểm duyệt y khoa" ghi rõ chưa thẩm định độc lập', /Chưa thẩm định độc lập/.test(meta.rev), meta.rev.slice(0, 60));
    ok('Không có vi phạm CSP khi chạy toàn bộ module', csp.length === 0, csp.slice(0, 3).join(' | '));
    ok('Không có yêu cầu mạng nào ngoài font', net.length === 0, net.join(' | '));
    ok('Không lỗi runtime trong mục 25', perr.length === 0, perr.join(' | '));
    await ctx.close();
  }

  console.log('14. Lỗi runtime trên trang');
  ok('Không có pageerror', errors.length === 0, errors.join(' | '));

  await browser.close();
  console.log(`\nKẾT QUẢ: ${pass} đạt / ${fail} không đạt`);
  process.exit(fail ? 1 : 0);
})();
