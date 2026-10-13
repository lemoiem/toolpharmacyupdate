<p align="center"><img src="assets/logo-neoped.svg" width="96" alt="NeoPed CDSS"></p>

# NeoPed CDSS

**Hỗ trợ quyết định lâm sàng Nhi – Sơ sinh** (*Neonatal & Paediatric Clinical Decision Support System*): tính liều theo cân nặng và phân tầng nguy cơ cho cấp cứu nhi khoa, sơ sinh và nuôi dưỡng tĩnh mạch, dựa trên các hướng dẫn điều trị quốc tế.

- 🌐 **Web app:** <https://lemoiem.github.io/toolpharmacyupdate/>
- 🏥 **Đơn vị:** Bệnh viện Phương Nam – Tập đoàn Y tế Phương Châu
- 👤 **Tác giả:** DSCKI. Lê Mới Em – Dược sĩ lâm sàng
- 🔖 **Phiên bản:** 1.9 (10/2026)

> [!WARNING]
> **Đây là công cụ HỖ TRỢ quyết định, không thay thế phán đoán lâm sàng.** Mọi liều và chỉ định phải được bác sĩ/dược sĩ lâm sàng kiểm tra và phê duyệt trước khi dùng cho người bệnh. Các khối dữ liệu gắn nhãn **"chưa kiểm chứng"** cần một dược sĩ hoặc bác sĩ thứ hai đối chiếu với nguồn gốc trước khi áp dụng lâm sàng.

---

## Danh mục module

Có 17 module lâm sàng, chia thành 4 nhóm. Nhóm Cấp cứu nhi khoa được xếp theo tiếp cận **ABCDE** (APLS/PALS).

### 🟢 Hồi sức
| Module | Hướng dẫn | Phạm vi |
|---|---|---|
| Hồi sức sơ sinh tại phòng sinh | NLS · ANZCOR 2023 / ILCOR | 0,3–6 kg |
| Liều cấp cứu nhi theo cân nặng | PALS 2020 / APLS | 3–150 kg |

### 🟣 Sơ sinh
| Module | Hướng dẫn | Phạm vi |
|---|---|---|
| Thuốc và thủ thuật sơ sinh (NICU) | ETT · UVC/UAC · kháng sinh theo PMA/PNA · truyền liên tục | 0,3–6 kg |
| Nguy cơ nhiễm khuẩn huyết sơ sinh sớm (EOS) | Kaiser Permanente 2024 (có mô hình 2017 để so sánh) | 34–43 tuần |
| Tăng bilirubin máu sơ sinh | AAP 2022 – ngưỡng chiếu đèn/thay máu tra từ biểu đồ | ≥35 tuần |
| Hạ glucose máu sơ sinh | AAP 2011 / BAPM 2017 · GIR | 0,3–6 kg |
| Hạ thân nhiệt điều trị – Bệnh não thiếu oxy thiếu máu cục bộ (HIE) | Phân độ Sarnat · TOBY / NICHD | ≥36 tuần, ≥1800 g |

### 🔵 Cấp cứu nhi khoa (ABCDE)
| | Module | Hướng dẫn | Phạm vi |
|---|---|---|---|
| **B** | Cơn hen phế quản cấp nặng | GINA 2024 · BTS/SIGN · NAC | 3–150 kg |
| **C** | Nhiễm khuẩn huyết và sốc nhiễm khuẩn – kháng sinh kinh nghiệm | SSC Pediatric 2020 · EOS/LOS sơ sinh | 0,3–150 kg |
| **C** | Nhịp nhanh kịch phát trên thất (SVT) | PALS 2020 | 0,4–150 kg |
| **C** | Tăng kali máu | APLS · BNFc · Cochrane 2012 | 0,3–150 kg |
| **D** | Trạng thái động kinh co giật | AES 2016 · ESETT 2019 | 2–150 kg |
| **D** | Chấn thương sọ não nhẹ ở trẻ em | Quy tắc PECARN · PREDICT 2021 | 0–18 tuổi |
| **E** | Nhiễm toan ceton do đái tháo đường (DKA) | ISPAD 2022 | 3–150 kg |
| **E** | Bỏng – hồi sức dịch | Parkland · ABA · Lund–Browder | 0,4–150 kg |

### 🟠 Dịch truyền & dinh dưỡng
| Module | Hướng dẫn | Phạm vi |
|---|---|---|
| Nuôi dưỡng tĩnh mạch (PN) | ESPGHAN/ESPEN 2018 · ASPEN | 0,3–10 kg |
| Pha dung dịch truyền | Dextrose · NaCl theo nồng độ đích | – |

Ngoài ra còn hai trang thông tin: **Hướng dẫn sử dụng** và **Tài liệu tham khảo** (kèm sổ dữ liệu và bảng liều tham khảo sinh tự động).

---

## Kiến trúc

- **Một tệp duy nhất `index.html`** (HTML + CSS + JavaScript thuần), không cần máy chủ hay cơ sở dữ liệu, chạy được offline: tải tệp về và mở bằng trình duyệt.
- **Dữ liệu tách khỏi mã nguồn.** Mọi liều, luật kháng sinh, bảng dịch, hệ số mô hình và cấu trúc module nằm trong các khối `<script type="application/json" id="data-…">` ở đầu phần script. Mỗi khối có `version`, `updated`, `source` (trích dẫn kiểu Vancouver), `status` và `records`.
- **Một nguồn sự thật.** Module tính liều, bảng liều tham khảo, phiếu in và nhãn liều đều đọc cùng một bộ dữ liệu, nên không có chuyện hai nơi hiển thị hai con số khác nhau.

| Khối dữ liệu | Nội dung | Phiên bản | Trạng thái |
|---|---|---|---|
| `data-modules` | Nhóm, thứ tự, tên module, icon 3D, ánh xạ emoji → icon | 1.1.0 | Đã đối chiếu |
| `data-eos-models` | Hệ số mô hình Kaiser EOS 2024 và 2017, LR lâm sàng | 2.0.0 | ⚠️ Chưa kiểm chứng |
| `data-neo-abx` | 25 luật liều kháng sinh sơ sinh theo GA/PMA/PNA | 1.0.0 | ⚠️ Chưa kiểm chứng |
| `data-neo-fluids` | Dịch sơ sinh theo ngày tuổi (ESPGHAN 2018) | 1.0.0 | Đã đối chiếu |
| `data-drug-doses` | 190 bản ghi: liều theo cân nặng (tối thiểu, tối đa, dải cân nặng, nồng độ), tham số phác đồ, bố cục bảng liều tham khảo | 1.1.0 | ⚠️ Chưa kiểm chứng |
| `data-tpn-products` | Chế phẩm acid amin/lipid, dung dịch gốc, vi chất, phác đồ PN mặc định, ngưỡng an toàn | 1.0.0 | ⚠️ Chưa kiểm chứng |

Khối nào có trạng thái "chưa kiểm chứng" thì giao diện tự hiển thị nhãn cảnh báo ở cuối mỗi module có dùng khối đó.

---

## Cập nhật liều hoặc dữ liệu

1. Mở `index.html`, tìm khối `data-…` cần sửa (ví dụ `data-drug-doses`), rồi sửa bản ghi theo `id`.
2. Tăng `version` (ví dụ `1.1.0` → `1.1.1`), sửa `updated` (yyyy-mm-dd) và bổ sung `source` nếu đổi nguồn.
3. Khi đã có người thứ hai đối chiếu với nguồn gốc, đổi `status` từ `"unverified"` sang `"verified"`.
4. Chạy bộ kiểm thử (mục dưới) trước khi đẩy lên GitHub.

**Không sửa hằng số liều trực tiếp trong mã JavaScript.** Nhãn liều (ví dụ "0,1 mg/kg, tối đa 6 mg") được sinh tự động từ dữ liệu.

---

## Kiểm thử

Bộ kiểm thử `tests/cdss.test.js` chạy trang trong trình duyệt Chromium (Playwright). Nó gồm ca chuẩn và ca biên cho các công thức: catheter rốn, Na⁺ hiệu chỉnh trong DKA, MgSO₄, phương trình Kaiser EOS 2024/2017, TPN, bảng liều tham khảo, giao diện điện thoại, v.v.

```bash
npm install --no-save playwright
npx playwright install chromium
node tests/cdss.test.js            # mặc định kiểm thử ./index.html
```

Kết quả phiên bản 1.8: **142/142 ca đạt**.

---

## Giao diện

- **Giao diện mặc định "Ease":** nền kem phân lớp, không bóng đổ. Mỗi nhóm lâm sàng có một màu riêng. Màu thương hiệu NeoPed (xanh ngọc đậm) chỉ dùng cho nút bấm và mục đang chọn ở trang chủ; trong module, nút In và mục đang chọn theo màu nhóm; đỏ, cam, xanh lá dành riêng cho cảnh báo mức độ nguy cơ.
- **Chế độ sáng/tối:** nút gạt ☀️/🌙 ở góc phải header (trên điện thoại nằm cạnh logo). Lần đầu mở, app theo cài đặt sáng/tối của hệ điều hành; sau khi bấm, lựa chọn được nhớ trên trình duyệt. Có thể ép bằng `?mode=dark` hoặc `?mode=light`. Nền tối xanh than (không đen tuyệt đối) để giảm chói khi trực đêm; màu cảnh báo đỏ/cam/xanh lá giữ nguyên ý nghĩa; bản in luôn nền trắng.
- **Giao diện cũ:** bấm nút "↩︎ Giao diện cũ" ở góc dưới bên phải, hoặc mở trang kèm `?theme=classic`.
- **Điện thoại:** điều hướng dạng dải ngang cuộn được, bảng cuộn trong thẻ, không tràn ngang ở màn hình 320–390 px.
- **In:** nút "In module này" cho từng module; phiếu pha chế TPN in riêng.

---

## Bảo mật và dữ liệu người bệnh

- Mọi phép tính chạy ngay trên trình duyệt. **Không gửi và không lưu thông tin người bệnh lên máy chủ.**
- Trình duyệt chỉ lưu lựa chọn giao diện (Ease/cũ) và chế độ sáng/tối.
- Họ tên và mã hồ sơ nhập ở module PN chỉ dùng để in phiếu pha chế; prompt gửi cho chức năng phân tích AI đã được ẩn danh.
- Chức năng **"Phân tích AI"** ở module PN gọi trực tiếp API từ trình duyệt và **sẽ không hoạt động** nếu không có máy chủ trung gian giữ khóa API. Phần tính toán PN vẫn đầy đủ khi không dùng AI.
- Dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm theo Nghị định 13/2023/NĐ-CP. Đơn vị triển khai chịu trách nhiệm pháp lý và nên tham vấn bộ phận pháp chế.

---

## Lịch sử phiên bản (tóm tắt)

| Phiên bản | Nội dung chính |
|---|---|
| 1.9 | Chế độ sáng/tối (nút gạt trên header, mặc định theo hệ điều hành), bản in luôn nền trắng |
| 1.8 | Đổi tên thành NeoPed CDSS; logo mới; bỏ khối thông tin bệnh viện khỏi header; màu hành động theo thương hiệu (trang chủ) và theo nhóm lâm sàng (module), bỏ màu hồng cũ |
| 1.7 | Icon 3D cho tiêu đề thẻ trong mọi module; đánh số bước liên tục ở module hen |
| 1.6 | Sắp xếp module theo 5 nhóm lâm sàng (ABCDE), đặt tên theo thuật ngữ y khoa, mã màu theo nhóm, icon 3D |
| 1.5 | Giao diện Ease làm mặc định |
| 1.4 | Khối `data-tpn-products`; bảng liều tham khảo sinh tự động từ `data-drug-doses` |
| 1.3 | Mô hình EOS Kaiser 2024; tách dữ liệu liều thành JSON; sửa tràn ngang trên điện thoại |
| 1.2 | Rà soát logic lâm sàng toàn bộ module (UVC/UAC, DKA, MgSO₄, kháng sinh sơ sinh theo PMA/PNA, PECARN, AAP 2022, TPN…) |

Lịch sử chi tiết xem ở trang **Tài liệu tham khảo → Lịch sử cập nhật** trong ứng dụng.

---

## Tài liệu tham khảo chính

ANZCOR Neonatal Guidelines 2023 · AHA PALS 2020 · APLS 7th ed. · AAP Red Book 2024–2027 · NeoFax · ESPGHAN/ESPEN/ESPR/CSPEN 2018 · ISPAD 2022 · Surviving Sepsis Campaign Pediatric 2020 · ASHP/IDSA/PIDS/SIDP 2020 (vancomycin) · IDSA Candidiasis 2016 · AES 2016 · ESETT 2019 · GINA 2024 · AAP Hyperbilirubinemia 2022 · Kuppermann (PECARN) 2009 · Puopolo 2011/2024 · Escobar 2014 · Kuzniewicz 2017.

Danh mục đầy đủ có trong ứng dụng (trang **Tài liệu tham khảo**).

---

## Ghi nhận

- Logo NeoPed CDSS (`assets/logo-neoped.svg`): bàn chân em bé (sơ sinh – nhi) với đường nhịp tim khoét trong lòng bàn chân (lâm sàng); nền gradient xanh lá ngọc → xanh chàm, có điểm sáng nổi khối.
- Icon 3D: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji), giấy phép MIT. Icon được nhúng dạng WebP để dùng offline.
- Font chữ: [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro), SIL Open Font License.
- Mã nguồn của ứng dụng: chưa công bố giấy phép sử dụng. Muốn dùng lại hoặc triển khai tại đơn vị khác, vui lòng liên hệ tác giả.
