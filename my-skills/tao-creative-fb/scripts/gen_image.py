#!/usr/bin/env python3
"""
gen_image.py — Tạo ảnh cho Facebook content bằng OpenAI gpt-image-1 API
Usage:
    python gen_image.py --prompt "mô tả ảnh" --quality low --output assets/image.png
DRY_RUN=true → không gọi API, chỉ in thông tin ra console
"""

import argparse
import base64
import logging
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI, APIError, APITimeoutError, RateLimitError


def _load_env() -> None:
    """
    Tìm và load file .env từ nhiều vị trí theo ưu tiên:
    1. Biến môi trường đã sẵn (OS / agent inject — ưu tiên cao nhất)
    2. Thư mục của skill (tao-creative-fb/.env)
    3. Thư mục scripts/ (cạnh file này)
    4. Cứ working directory hiện tại (cwd/.env)
    5. Thư mục gốc project (maison-gourmet/.env)
    6. Home directory (~/.env) — fallback cuối cùng
    """
    # Nếu key đã có trong OS env — không cần load file
    if os.getenv("OPENAI_API_KEY"):
        return

    _script_dir = Path(__file__).resolve().parent   # scripts/
    _skill_dir  = _script_dir.parent                 # tao-creative-fb/
    _root_dir   = _skill_dir.parent.parent           # maison-gourmet/
    _cwd        = Path.cwd()

    candidates = [
        _skill_dir  / ".env",
        _script_dir / ".env",
        _cwd        / ".env",
        _root_dir   / ".env",
        Path.home() / ".env",
    ]

    for p in candidates:
        if p.exists():
            load_dotenv(p, override=False)
            # Log sau khi basicConfig được gọi
            _PENDING_ENV_LOG["path"] = str(p)
            return

    _PENDING_ENV_LOG["path"] = None


_PENDING_ENV_LOG: dict = {}
_load_env()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("gen_image")

# Log kết quả load .env sau khi basicConfig đã sẵn sàng
if _PENDING_ENV_LOG.get("path"):
    log.info(f"[ENV] Loaded .env từ: {_PENDING_ENV_LOG['path']}")
elif not os.getenv("OPENAI_API_KEY"):
    log.warning("[ENV] Không tìm thấy file .env ở bất kỳ đường dẫn nào!")

SUPPORTED_QUALITIES = {"low", "medium", "high", "auto"}


def parse_args():
    parser = argparse.ArgumentParser(description="Gen ảnh bằng OpenAI gpt-image-1")
    parser.add_argument("--prompt", required=True, help="Mô tả ảnh cần gen")
    parser.add_argument(
        "--quality",
        default="low",
        choices=["low", "medium", "high", "auto"],
        help="Chất lượng ảnh (low=rẻ cho organic, medium cho ads)",
    )
    parser.add_argument(
        "--output",
        default="assets/temp_image.png",
        help="Đường dẫn lưu file PNG output",
    )
    parser.add_argument(
        "--size",
        default="1024x1024",
        choices=["1024x1024", "1792x1024", "1024x1792"],
        help="Kích thước ảnh",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=os.getenv("DRY_RUN", "").lower() in ("true", "1", "yes"),
        help="Chế độ test: không gọi API thật",
    )
    return parser.parse_args()


def gen_image(prompt: str, quality: str, size: str, client: OpenAI, dry_run: bool) -> bytes:
    """
    Gọi OpenAI API gen ảnh. Retry 1 lần nếu fail.
    Trả về bytes của ảnh PNG.
    """
    if dry_run:
        log.info("[DRY RUN] Sẽ gọi API với:")
        log.info(f"  model  : gpt-image-1")
        log.info(f"  quality: {quality}")
        log.info(f"  size   : {size}")
        log.info(f"  prompt : {prompt}")
        # Tạo ảnh giả 1x1 pixel PNG để test pipeline
        import struct, zlib
        def make_dummy_png():
            def chunk(t, d):
                c = zlib.crc32(t + d) & 0xFFFFFFFF
                return struct.pack(">I", len(d)) + t + d + struct.pack(">I", c)
            sig = b'\x89PNG\r\n\x1a\n'
            ihdr = chunk(b'IHDR', struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
            idat = chunk(b'IDAT', zlib.compress(b'\x00\xFF\xFF\xFF'))
            iend = chunk(b'IEND', b'')
            return sig + ihdr + idat + iend
        log.info("[DRY RUN] Tạo ảnh placeholder 1x1 pixel")
        return make_dummy_png()

    for attempt in range(1, 3):  # Thử tối đa 2 lần
        try:
            log.info(f"[API] Đang gen ảnh (attempt {attempt}/2)...")
            response = client.images.generate(
                model="gpt-image-1",
                prompt=prompt,
                size=size,
                quality=quality,
                n=1,
                response_format="b64_json",
            )
            b64_data = response.data[0].b64_json
            if not b64_data:
                raise ValueError("API trả về b64_json rỗng")
            image_bytes = base64.b64decode(b64_data)
            log.info(f"[API] Gen ảnh thành công ({len(image_bytes):,} bytes)")
            return image_bytes

        except RateLimitError as e:
            log.error(f"[API] Rate limit hit: {e}")
            if attempt < 2:
                log.info("Chờ 10 giây rồi thử lại...")
                time.sleep(10)
            else:
                log.error("Vẫn lỗi sau khi retry. Kiểm tra quota OpenAI.")
                sys.exit(1)

        except APITimeoutError as e:
            log.error(f"[API] Timeout: {e}")
            if attempt < 2:
                log.info("Chờ 5 giây rồi thử lại...")
                time.sleep(5)
            else:
                log.error("Timeout sau 2 lần thử. Kiểm tra kết nối mạng.")
                sys.exit(1)

        except APIError as e:
            log.error(f"[API] Lỗi OpenAI API (attempt {attempt}): {e}")
            if attempt < 2:
                log.info("Thử lại sau 3 giây...")
                time.sleep(3)
            else:
                log.error("Vẫn lỗi sau khi retry. Chi tiết lỗi ở trên.")
                sys.exit(1)

        except Exception as e:
            log.error(f"[ERROR] Lỗi không xác định: {e}")
            sys.exit(1)


def save_image(image_bytes: bytes, output_path: str) -> Path:
    """Lưu bytes ảnh ra file PNG."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(image_bytes)
    log.info(f"[SAVED] Ảnh đã lưu tại: {out.resolve()}")
    return out


def main():
    args = parse_args()

    # Validate API key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key and not args.dry_run:
        log.error("OPENAI_API_KEY chưa được set. Kiểm tra file .env")
        sys.exit(1)

    client = OpenAI(api_key=api_key) if api_key else None

    if args.dry_run:
        log.info("=== CHẾ ĐỘ DRY RUN — Không gọi API thật ===")

    # Gen ảnh
    image_bytes = gen_image(
        prompt=args.prompt,
        quality=args.quality,
        size=args.size,
        client=client,
        dry_run=args.dry_run,
    )

    # Lưu file
    output_file = save_image(image_bytes, args.output)

    # Print path để script khác có thể capture
    print(str(output_file.resolve()))


if __name__ == "__main__":
    main()
