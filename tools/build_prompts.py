#!/usr/bin/env python3
"""Sinh dữ liệu cho Thư viện prompt Khoa Dược từ docs/bo-prompt-khoa-duoc.md.

Nguồn duy nhất là tệp Markdown: sửa prompt ở đó rồi chạy
    python3 tools/build_prompts.py
Script ghi đè khối <script type="application/json" id="data-prompts"> trong prompt/index.html.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MD = ROOT / "docs" / "bo-prompt-khoa-duoc.md"
HTML = ROOT / "prompt" / "index.html"

# Nhóm hiển thị trên giao diện (khóa = số prompt)
GROUPS = {
    "lamsang": ("Lâm sàng", [1, 3, 4, 10, 11, 17]),
    "lieu": ("Liều & TDM", [5, 6, 12, 13, 14, 15]),
    "thongtin": ("EBM & thông tin thuốc", [2, 7, 8, 16]),
    "quanly": ("Quản lý & chất lượng", [9, 18, 19, 20]),
}


def group_of(num):
    for key, (_, nums) in GROUPS.items():
        if num in nums:
            return key
    raise SystemExit(f"Prompt {num} chưa được gán nhóm trong GROUPS")


def parse(md):
    # Bảng mục lục: | 1 | Tên | Dùng khi |
    usage = {int(m[1]): m[2].strip() for m in re.finditer(r"^\|\s*(\d+)\s*\|[^|]*\|([^|]*)\|\s*$", md, re.M)}
    version = re.search(r"Phiên bản ([\d.]+)", md)[1]
    records = []
    for m in re.finditer(r"^## (?:(\d+)\. )?(.+?)\n(.*?)(?=^## |\Z)", md, re.M | re.S):
        num, title, body = m[1], m[2].strip(), m[3]
        block = re.search(r"^````\n(.*?)\n^````$", body, re.M | re.S)
        if not block:
            continue
        if num:
            n = int(num)
            records.append({"id": f"p{n:02d}", "num": n, "title": title, "use": usage.get(n, ""),
                            "group": group_of(n), "text": block[1]})
        elif title.startswith("Prompt kiểm định chéo"):
            records.append({"id": "verify", "num": None, "title": "Prompt kiểm định chéo",
                            "use": "Dán vào một AI/phiên khác để đối chiếu đầu ra với nguồn gốc",
                            "group": "kiemdinh", "text": block[1]})
    nums = [r["num"] for r in records if r["num"]]
    if nums != list(range(1, len(nums) + 1)):
        raise SystemExit(f"Số thứ tự prompt không liên tục: {nums}")
    if len(nums) != sum(len(v[1]) for v in GROUPS.values()):
        raise SystemExit("Số prompt khác số đã gán nhóm trong GROUPS")
    return version, records


def main():
    md = MD.read_text(encoding="utf-8")
    version, records = parse(md)
    groups = [{"id": k, "name": v[0]} for k, v in GROUPS.items()] + [{"id": "kiemdinh", "name": "Kiểm định chéo"}]
    data = {
        "version": version + ".0" if version.count(".") == 1 else version,
        "updated": re.search(r"· (\d{2})/(\d{2})/(\d{4})", md).expand(r"\3-\2-\1"),
        "source": "1. Lê Mới Em. Bộ prompt chuẩn cho Khoa Dược lâm sàng. docs/bo-prompt-khoa-duoc.md; 2026.",
        "status": "unverified",
        "groups": groups,
        "records": records,
    }
    payload = json.dumps(data, ensure_ascii=False, indent=1).replace("</", "<\\/")
    html = HTML.read_text(encoding="utf-8")
    pat = re.compile(r'(<script type="application/json" id="data-prompts">)(.*?)(</script>)', re.S)
    if not pat.search(html):
        raise SystemExit("Không tìm thấy khối data-prompts trong prompt/index.html")
    HTML.write_text(pat.sub(lambda m: m[1] + "\n" + payload + "\n" + m[3], html, count=1), encoding="utf-8")
    print(f"Đã ghi {len(records)} prompt (v{data['version']}, {data['updated']}) vào {HTML.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
