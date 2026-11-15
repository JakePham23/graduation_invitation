#!/usr/bin/env python3
"""
Tool chuyển đổi và nén toàn bộ ảnh trong thư mục nguồn sang định dạng JPEG nhẹ cho web.
Hỗ trợ JPG/JPEG, PNG, WEBP, BMP, TIFF, và HEIC (nếu có cài đặt `pillow-heif`).

Ví dụ:
  python3 scripts/convert-images-to-jpeg.py
  python3 scripts/convert-images-to-jpeg.py --input public/personal_image --output public/images --max-size 1600 --quality 80
  python3 scripts/convert-images-to-jpeg.py --in-place
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from PIL import Image, ImageOps

try:
    import pillow_heif  # type: ignore

    pillow_heif.register_heif_opener()
    HEIF_SUPPORTED = True
except ImportError:
    HEIF_SUPPORTED = False

SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif", ".heic", ".heif"}


def format_mb(num_bytes: int) -> str:
    return f"{num_bytes / (1024 * 1024):.2f} MB"


def convert_image(
    src_path: Path,
    dst_path: Path,
    max_size: int,
    quality: int,
) -> tuple[int, int]:
    orig_size = src_path.stat().st_size

    with Image.open(src_path) as img:
        img = ImageOps.exif_transpose(img)

        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            background = Image.new("RGB", img.size, (255, 255, 255))
            alpha_img = img.convert("RGBA")
            background.paste(alpha_img, mask=alpha_img.split()[3])
            img = background
        elif img.mode != "RGB":
            img = img.convert("RGB")

        if max_size > 0 and max(img.size) > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        dst_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(
            dst_path,
            format="JPEG",
            quality=quality,
            optimize=True,
            progressive=True,
        )

    new_size = dst_path.stat().st_size
    return orig_size, new_size


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Chuyển đổi và nén ảnh sang JPEG nhẹ cho web."
    )
    parser.add_argument(
        "--input",
        default="public/personal_image",
        help="Thư mục chứa ảnh gốc (mặc định: public/personal_image)",
    )
    parser.add_argument(
        "--output",
        default="public/personal_image_jpeg",
        help="Thư mục lưu ảnh JPEG đầu ra (mặc định: public/personal_image_jpeg)",
    )
    parser.add_argument(
        "--max-size",
        type=int,
        default=1600,
        help="Kích thước cạnh dài tối đa theo px (mặc định: 1600, 0 = giữ nguyên)",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=82,
        help="Chất lượng JPEG từ 1-95 (mặc định: 82)",
    )
    parser.add_argument(
        "--in-place",
        action="store_true",
        help="Ghi đè trực tiếp vào thư mục --input và xóa file gốc khác đuôi .jpeg",
    )

    args = parser.parse_args()
    input_dir = Path(args.input).resolve()
    output_dir = input_dir if args.in_place else Path(args.output).resolve()

    if not input_dir.exists() or not input_dir.is_dir():
        print(f"Không tìm thấy thư mục nguồn: {input_dir}", file=sys.stderr)
        return 1

    files = sorted(
        p for p in input_dir.iterdir()
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTS
    )

    if not files:
        print(f"Không có file ảnh nào được hỗ trợ trong: {input_dir}")
        return 0

    total_orig = 0
    total_new = 0
    converted = 0
    skipped_heic: list[str] = []
    failed: list[tuple[str, str]] = []

    for src in files:
        ext = src.suffix.lower()
        if ext in (".heic", ".heif") and not HEIF_SUPPORTED:
            skipped_heic.append(src.name)
            continue

        dst = output_dir / f"{src.stem}.jpeg"
        try:
            if args.in_place and dst == src:
                tmp_dst = output_dir / f"{src.stem}.__tmp__.jpeg"
                orig_sz, new_sz = convert_image(src, tmp_dst, args.max_size, args.quality)
                tmp_dst.replace(dst)
            else:
                orig_sz, new_sz = convert_image(src, dst, args.max_size, args.quality)
                if args.in_place and src.exists() and src != dst:
                    src.unlink()

            total_orig += orig_sz
            total_new += new_sz
            converted += 1
            ratio = ((orig_sz - new_sz) / orig_sz * 100) if orig_sz > 0 else 0
            print(
                f"✓ {src.name} -> {dst.name} "
                f"({format_mb(orig_sz)} -> {format_mb(new_sz)}, giảm {ratio:.1f}%)"
            )
        except Exception as exc:
            failed.append((src.name, str(exc)))
            print(f"✗ Lỗi {src.name}: {exc}", file=sys.stderr)

    print("\n--- TỔNG KẾT ---")
    print(f"Thư mục nguồn : {input_dir}")
    print(f"Thư mục đích  : {output_dir}")
    print(f"Đã chuyển     : {converted}/{len(files)} ảnh")
    if total_orig > 0:
        saved_pct = (total_orig - total_new) / total_orig * 100
        print(
            f"Dung lượng    : {format_mb(total_orig)} -> {format_mb(total_new)} "
            f"(giảm {saved_pct:.1f}%)"
        )

    if skipped_heic:
        print(
            f"\n⚠️ Bỏ qua {len(skipped_heic)} file HEIC vì chưa cài `pillow-heif`: "
            + ", ".join(skipped_heic)
        )
        print("   Cài thêm bằng: pip install pillow-heif")

    if failed:
        print(f"\n⚠️ Có {len(failed)} file lỗi.")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
