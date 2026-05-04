#!/usr/bin/env python3
"""
post_facebook.py — Upload ảnh + caption lên Facebook Page bằng Graph API
Usage:
    python post_facebook.py --image assets/temp_image.png --caption assets/temp_caption.txt

DRY_RUN=true → không POST thật, chỉ in thông tin ra console và lưu preview JSON
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from datetime import datetime

import requests
from dotenv import load_dotenv


def _load_env() -> None:
    """
    Tìm và load .env từ nhiều vị trí:
    skill_dir → scripts_dir → cwd → root_project → home
    """
    if os.getenv("FB_PAGE_TOKEN"):  # Check FB token thay vì OpenAI
        return

    _script_dir = Path(__file__).resolve().parent
    _skill_dir  = _script_dir.parent
    _root_dir   = _skill_dir.parent.parent
    _cwd        = Path.cwd()

    for p in [_skill_dir / ".env", _script_dir / ".env",
              _cwd / ".env", _root_dir / ".env", Path.home() / ".env"]:
        if p.exists():
            load_dotenv(p, override=False)
            _PENDING_ENV_LOG["path"] = str(p)
            _PENDING_ENV_LOG["skill_dir"] = str(_skill_dir)
            return

    _PENDING_ENV_LOG["path"] = None
    _PENDING_ENV_LOG["skill_dir"] = str(Path(__file__).resolve().parent.parent)


_PENDING_ENV_LOG: dict = {}
_load_env()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("post_facebook")

if _PENDING_ENV_LOG.get("path"):
    log.info(f"[ENV] Loaded .env từ: {_PENDING_ENV_LOG['path']}")
elif not os.getenv("FB_PAGE_TOKEN"):
    log.warning("[ENV] Không tìm thấy file .env ở bất kỳ đường dẫn nào!")

# Skill dir được xác định sau khi load env
_SKILL_DIR = Path(_PENDING_ENV_LOG.get("skill_dir", Path(__file__).resolve().parent.parent))

FB_API_VERSION = "v21.0"
FB_API_BASE = f"https://graph.facebook.com/{FB_API_VERSION}"


def parse_args():
    parser = argparse.ArgumentParser(description="Post ảnh + caption lên Facebook Page")
    parser.add_argument("--image", required=True, help="Đường dẫn file ảnh PNG local")
    parser.add_argument("--caption", required=True, help="Đường dẫn file caption .txt")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=os.getenv("DRY_RUN", "").lower() in ("true", "1", "yes"),
        help="Chế độ test: không POST thật lên Facebook",
    )
    return parser.parse_args()


def load_caption(caption_path: str) -> str:
    """Đọc nội dung caption từ file txt."""
    p = Path(caption_path)
    if not p.exists():
        log.error(f"Không tìm thấy file caption: {caption_path}")
        sys.exit(1)
    caption = p.read_text(encoding="utf-8").strip()
    if not caption:
        log.error("File caption rỗng. Kiểm tra lại gen_caption.py")
        sys.exit(1)
    return caption


def load_image(image_path: str) -> bytes:
    """Đọc binary ảnh từ file."""
    p = Path(image_path)
    if not p.exists():
        log.error(f"Không tìm thấy file ảnh: {image_path}")
        sys.exit(1)
    image_bytes = p.read_bytes()
    if len(image_bytes) < 100:
        log.warning(f"File ảnh có vẻ quá nhỏ ({len(image_bytes)} bytes). Có thể là file test placeholder.")
    log.info(f"[FILE] Đọc ảnh: {p.name} ({len(image_bytes):,} bytes)")
    return image_bytes


def post_to_facebook(
    image_bytes: bytes,
    image_filename: str,
    caption: str,
    page_id: str,
    page_token: str,
    dry_run: bool,
) -> dict:
    """
    Upload ảnh + caption lên Facebook Page qua Graph API /photos endpoint.
    Dùng multipart/form-data với source=binary (không cần public URL).
    """
    endpoint = f"{FB_API_BASE}/{page_id}/photos"

    if dry_run:
        log.info("=== [DRY RUN] Preview POST request ===")
        log.info(f"  Endpoint : {endpoint}")
        log.info(f"  Page ID  : {page_id}")
        log.info(f"  Image    : {image_filename} ({len(image_bytes):,} bytes)")
        log.info(f"  Caption  :\n{'-'*40}\n{caption}\n{'-'*40}")
        log.info("[DRY RUN] Không POST thật. Lưu preview ra file local.")

        # Lưu preview JSON để kiểm tra
        preview_dir = _SKILL_DIR / "assets" / "dry_run_outputs"
        preview_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        preview_file = preview_dir / f"preview_{timestamp}.json"
        preview_data = {
            "dry_run": True,
            "timestamp": timestamp,
            "endpoint": endpoint,
            "page_id": page_id,
            "image_file": image_filename,
            "image_size_bytes": len(image_bytes),
            "caption": caption,
        }
        preview_file.write_text(json.dumps(preview_data, ensure_ascii=False, indent=2), encoding="utf-8")
        log.info(f"[DRY RUN] Preview đã lưu tại: {preview_file}")

        return {"dry_run": True, "preview_file": str(preview_file)}

    # ─── Real POST ────────────────────────────────────────────────────────────
    log.info(f"[FB] Đang upload lên Facebook Page {page_id}...")

    try:
        response = requests.post(
            endpoint,
            data={"caption": caption, "access_token": page_token},
            files={"source": (image_filename, image_bytes, "image/png")},
            timeout=60,
        )
    except requests.exceptions.ConnectionError:
        log.error("[FB] Lỗi kết nối. Kiểm tra internet hoặc Facebook đang down.")
        sys.exit(1)
    except requests.exceptions.Timeout:
        log.error("[FB] Request timeout sau 60 giây. Thử lại sau.")
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        log.error(f"[FB] Request error: {e}")
        sys.exit(1)

    # Xử lý response
    try:
        result = response.json()
    except json.JSONDecodeError:
        log.error(f"[FB] Không parse được response: {response.text[:500]}")
        sys.exit(1)

    if response.status_code == 200 and "id" in result:
        post_id = result.get("id", "")
        photo_id = result.get("post_id", post_id)
        log.info(f"[FB] ✅ Đăng bài thành công!")
        log.info(f"[FB] Post ID  : {post_id}")
        log.info(f"[FB] Xem bài  : https://www.facebook.com/{post_id}")
        return {
            "success": True,
            "post_id": post_id,
            "photo_id": photo_id,
            "url": f"https://www.facebook.com/{post_id}",
        }
    else:
        # Log lỗi FB API chi tiết
        error = result.get("error", {})
        error_code = error.get("code", "unknown")
        error_msg = error.get("message", str(result))
        error_type = error.get("type", "")
        fb_trace = error.get("fbtrace_id", "")

        log.error(f"[FB] ❌ Đăng bài thất bại!")
        log.error(f"[FB] HTTP Status : {response.status_code}")
        log.error(f"[FB] Error Code  : {error_code}")
        log.error(f"[FB] Error Type  : {error_type}")
        log.error(f"[FB] Message     : {error_msg}")
        if fb_trace:
            log.error(f"[FB] Trace ID    : {fb_trace} (dùng để debug với FB support)")

        # Gợi ý fix theo error code phổ biến
        if error_code == 190:
            log.error("[FB] ⚠️  Token hết hạn hoặc không hợp lệ. Cần lấy token mới từ Facebook Developer.")
        elif error_code == 200:
            log.error("[FB] ⚠️  Không đủ quyền. Cần permission: pages_manage_posts, pages_read_engagement.")
        elif error_code == 100:
            log.error("[FB] ⚠️  Page ID sai hoặc token không match với page này.")

        sys.exit(1)


def main():
    args = parse_args()

    # Validate credentials
    page_id = os.getenv("FB_PAGE_ID")
    page_token = os.getenv("FB_PAGE_TOKEN")

    if not args.dry_run:
        if not page_id:
            log.error("FB_PAGE_ID chưa được set. Kiểm tra file .env")
            sys.exit(1)
        if not page_token:
            log.error("FB_PAGE_TOKEN chưa được set. Kiểm tra file .env")
            sys.exit(1)
    else:
        # Dùng placeholder để dry run không bị lỗi
        page_id = page_id or "DRY_RUN_PAGE_ID"
        page_token = page_token or "DRY_RUN_TOKEN"

    if args.dry_run:
        log.info("=== CHẾ ĐỘ DRY RUN — Không POST thật lên Facebook ===")

    # Load files
    caption = load_caption(args.caption)
    image_bytes = load_image(args.image)
    image_filename = Path(args.image).name

    # Preview caption trước khi post
    log.info(f"[PREVIEW] Caption ({len(caption.split())} từ):")
    log.info(f"\n{caption}\n")

    # Post lên Facebook
    result = post_to_facebook(
        image_bytes=image_bytes,
        image_filename=image_filename,
        caption=caption,
        page_id=page_id,
        page_token=page_token,
        dry_run=args.dry_run,
    )

    # Output kết quả dạng JSON để agent có thể parse
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
