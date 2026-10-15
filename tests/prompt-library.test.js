// Kiểm thử Thư viện prompt Khoa Dược (prompt/index.html)
// Chạy: node tests/prompt-library.test.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs');
const vm = require('vm');
const path = require('path').resolve(__dirname + '/../prompt/index.html');
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };

const html = fs.readFileSync(path, 'utf8');
const ctx = {};
vm.runInNewContext(html.match(/<script id="prompt-core">([\s\S]*?)<\/script>/)[1], { globalThis: ctx });
const C = ctx.PromptCore;
const DATA = JSON.parse(html.match(/id="data-prompts">([\s\S]*?)<\/script>/)[1]);

console.log('1. Dữ liệu');
ok('21 bản ghi (20 prompt + kiểm định chéo)', DATA.records.length === 21);
ok('id không trùng', new Set(DATA.records.map(r => r.id)).size === 21);
ok('mọi prompt có văn bản và nhóm hợp lệ', DATA.records.every(r => r.text.length > 300 && DATA.groups.some(g => g.id === r.group)));
const md = fs.readFileSync(__dirname + '/../docs/bo-prompt-khoa-duoc.md', 'utf8');
ok('văn bản prompt trùng nguyên văn với tệp Markdown', DATA.records.every(r => md.includes(r.text)));

console.log('2. Hàm thuần');
const t = '- Cân nặng: [CẦN ĐIỀN]\n- C1 = [CẦN ĐIỀN] mg/L; C2 = [CẦN ĐIỀN] mg/L\n- Vi sinh: [CẦN ĐIỀN hoặc "chưa có"]';
const f = C.extractFields(t);
ok('tách đủ 4 ô, kể cả 2 ô trên cùng một dòng', f.length === 4);
ok('nhãn ô 2 và 3 phân biệt được', f[1].label === 'C1 = ▢ mg/L; C2 = … mg/L' && f[2].label === 'C1 = … mg/L; C2 = ▢ mg/L', f[1].label + ' / ' + f[2].label);
ok('gợi ý lấy từ trong ngoặc', f[3].hint === 'hoặc "chưa có"', f[3].hint);
ok('điền đúng vị trí, ô trống giữ nguyên', C.fillPrompt(t, ['', '12,5', '6,1']) === '- Cân nặng: [CẦN ĐIỀN]\n- C1 = 12,5 mg/L; C2 = 6,1 mg/L\n- Vi sinh: [CẦN ĐIỀN hoặc "chưa có"]');
ok('giá trị chỉ có khoảng trắng coi như trống', C.fillPrompt('[CẦN ĐIỀN]', ['   ']) === '[CẦN ĐIỀN]');
ok('giá trị chứa ký tự đặc biệt $& không bị thay thế sai', C.fillPrompt('a [CẦN ĐIỀN] b', ['$& $1']) === 'a $& $1 b');
ok('không điền gì: prompt giữ nguyên', DATA.records.every(r => C.fillPrompt(r.text, []) === r.text));
ok('ô dán của prompt kiểm định chéo được nhận', C.extractFields(DATA.records.find(r => r.id === 'verify').text).some(x => x.paste));
ok('tìm kiếm không phân biệt dấu', C.norm('Đánh giá ADR') === 'danh gia adr');

console.log('3. Cảnh báo dữ liệu định danh');
ok('mã BHYT', C.detectPHI('the DN4010123456789').length === 1);
ok('CCCD 12 số', C.detectPHI('cccd 079123456789').length === 1);
ok('số điện thoại', C.detectPHI('lh 0912345678').length === 1);
ok('ngày sinh đầy đủ', C.detectPHI('sinh 03/04/1950').length === 1);
ok('từ khóa họ tên / số giường', C.detectPHI('Họ tên: X, số giường 12').length === 1);
ok('dữ liệu lâm sàng bình thường không bị cảnh báo', C.detectPHI('Nam 72 tuổi, 60 kg, creatinin 150 µmol/L, CrCl 35 mL/phút, vancomycin 1000 mg q12h').length === 0);

(async () => {
  console.log('4. Giao diện');
  const browser = await chromium.launch();
  const ctxB = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctxB.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path);
  ok('danh sách hiện 21 mục', await page.locator('#list .item').count() === 21);
  await page.fill('#q', 'vancomycin auc');
  ok('tìm "vancomycin auc" ra prompt 6', (await page.locator('#list .item').allInnerTexts()).some(s => s.includes('TDM vancomycin')));
  await page.fill('#q', 'thai ky');
  ok('tìm không dấu "thai ky" ra prompt 11', (await page.locator('#list .item').allInnerTexts()).some(s => s.includes('phụ nữ có thai')));
  await page.fill('#q', '');
  await page.click('.chip:has-text("Liều & TDM")');
  ok('lọc nhóm Liều & TDM còn 6 mục', await page.locator('#list .item').count() === 6);
  await page.click('.chip:has-text("Tất cả")');

  await page.click('.item:has-text("TDM vancomycin")');
  ok('mở chi tiết và cập nhật hash', page.url().endsWith('#p06'));
  const tas = page.locator('#panel-form textarea');
  const n = await tas.count();
  ok('prompt 6 có 7 ô nhập', n === 7, 'n=' + n);
  await tas.nth(0).fill('Nam 65 tuổi, 70 kg, 170 cm');
  ok('đếm tiến độ 1/7', (await page.innerText('.progress')).includes('1/7'));
  ok('chưa có cảnh báo định danh', await page.locator('.phi').isHidden());
  await tas.nth(1).fill('Họ tên: Nguyễn Văn A');
  ok('hiện cảnh báo khi nhập họ tên', await page.locator('.phi').isVisible());
  await tas.nth(1).fill('Viêm phổi bệnh viện, MRSA, MIC 1 mg/L');
  await page.click('#copy-filled');
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  ok('sao chép chứa giá trị đã điền', clip.includes('Nam 65 tuổi, 70 kg, 170 cm') && clip.includes('MIC 1 mg/L'));
  ok('ô chưa điền vẫn giữ [CẦN ĐIỀN]', clip.includes('[CẦN ĐIỀN'));
  await page.click('#tab-view');
  ok('xem prompt: có 2 ô đã điền được tô', await page.locator('pre.preview mark.f').count() === 2);
  await page.click('.chip:has-text("Tất cả")');
  await page.click('.item:has-text("Thẩm định đơn kháng sinh")');
  await page.click('.item:has-text("TDM vancomycin")');
  ok('chuyển prompt rồi quay lại vẫn giữ dữ liệu trong tab', (await page.locator('#panel-form textarea').nth(0).inputValue()) === 'Nam 65 tuổi, 70 kg, 170 cm');
  await page.click('button:has-text("Xóa dữ liệu")');
  ok('Xóa dữ liệu làm trống ô', (await page.locator('#panel-form textarea').nth(0).inputValue()) === '');
  ok('không ghi gì vào localStorage', await page.evaluate(() => localStorage.length) === 0);

  console.log('5. Điện thoại (390 px)');
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto('file://' + path + '#p03');
  ok('mở thẳng bằng liên kết #p03, danh sách ẩn', await m.locator('.list-pane').isHidden() && (await m.innerText('.d-head h2')).includes('ADR'));
  ok('không cuộn ngang', await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await m.click('.back');
  ok('nút quay lại hiện danh sách', await m.locator('.list-pane').isVisible());
  await m.screenshot({ path: __dirname + '/../docs/prompt-library-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.click('#tab-view');
  await page.screenshot({ path: __dirname + '/../docs/prompt-library-desktop.png' });

  ok('không có lỗi JS', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(`\nKết quả: ${pass} đạt, ${fail} lỗi`);
  process.exit(fail ? 1 : 0);
})();
