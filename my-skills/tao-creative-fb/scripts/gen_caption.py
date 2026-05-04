#!/usr/bin/env python3
"""
gen_caption.py — Viết caption/ad copy cho Facebook theo brand voice Maison Gourmet
Usage:
    # Organic post
    python gen_caption.py --mode organic --idea "quà tết cho sếp" --output assets/caption.txt

    # Creative ads
    python gen_caption.py --mode ads --angle pain --idea "chọn quà doanh nghiệp" --output assets/copy.txt

DRY_RUN=true → không gọi API, in template mẫu ra console
"""

import argparse
import io
import logging
import os
import sys

# Fix Windows UTF-8 encoding cho terminal tiếng Việt
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding and sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
import time
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI, APIError, APITimeoutError, RateLimitError


def _load_env() -> None:
    """
    Tìm và load .env từ nhiều vị trí:
    skill_dir → scripts_dir → cwd → root_project → home
    """
    if os.getenv("OPENAI_API_KEY"):
        return  # Key đã có trong OS env, không cần load file

    _script_dir = Path(__file__).resolve().parent
    _skill_dir  = _script_dir.parent
    _root_dir   = _skill_dir.parent.parent
    _cwd        = Path.cwd()

    for p in [_skill_dir / ".env", _script_dir / ".env",
              _cwd / ".env", _root_dir / ".env", Path.home() / ".env"]:
        if p.exists():
            load_dotenv(p, override=False)
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
log = logging.getLogger("gen_caption")

if _PENDING_ENV_LOG.get("path"):
    log.info(f"[ENV] Loaded .env từ: {_PENDING_ENV_LOG['path']}")
elif not os.getenv("OPENAI_API_KEY"):
    log.warning("[ENV] Không tìm thấy file .env ở bất kỳ đường dẫn nào!")

# ─── Brand Voice Context (từ brain.db + context files) ─────────────────────────
BRAND_VOICE = """
# Maison Gourmet — Brand Voice

## Về thương hiệu
Maison Gourmet là thương hiệu quà tặng cao cấp (premium) tại Việt Nam.
Sản phẩm: hộp quà tặng tinh xảo gồm rượu vang, thực phẩm cao cấp, quà biếu doanh nghiệp.
Định vị: sự an tâm, sự chỉn chu và đẳng cấp — dành cho cả cá nhân lẫn B2B.

## Đối tượng mục tiêu
Người đi làm 25-55 tuổi, đặc biệt là HR/Admin các doanh nghiệp có nhu cầu mua quà biếu tặng.

## Tone giọng
- Gần gũi, vui vẻ, ngắn gọn, hài hước nhẹ nhàng
- Thẳng thắn, trực diện — không vòng vo
- Tiếng Việt tự nhiên, đời thường

## Từ ngữ & Phong cách
- Câu văn ngắn gọn, trực diện
- Được phép: hài hước nhẹ, ví von thực tế
- TRÁNH: synergy, leverage, "tối ưu hóa trải nghiệm", "cộng hưởng", từ corporate
- TRÁNH: văn hoa, bay bổng, sáo rỗng, robot-like

## Ví dụ tone đúng
- "Bố vợ mà biếu Maison là tết này ăn ngon ngủ yên."
- "HR ơi, đau đầu chọn quà cuối năm thì liên hệ em cho nhẹ đầu."
- "Đặt sớm chiết khấu cao, hỗ trợ in logo doanh nghiệp."
- "Không cần drama, cứ Maison là xong."

## Ví dụ tone SAI (không được làm)
- "Chúng tôi cam kết mang đến trải nghiệm quà tặng tuyệt vời nhất."
- "Với sứ mệnh kết nối những giá trị tinh tế..."
- "Leverage các nguồn lực để tối ưu hóa..."
"""

ORGANIC_SYSTEM_PROMPT = f"""{BRAND_VOICE}

## Nhiệm vụ của bạn
Viết 1 caption Facebook cho bài đăng organic (không phải quảng cáo trả phí).
Caption phải:
- Dài 80-150 từ (không dài hơn, không ngắn hơn)
- Cấu trúc: Hook (1-2 câu bắt mắt) → Body (nội dung chính, thực tế) → Soft CTA (1 câu mời nhẹ)
- Hook KHÔNG được bắt đầu bằng "Bạn có biết", "Hãy cùng khám phá", "Chào mừng bạn"
- Soft CTA ví dụ: "Nhắn tin hỏi em nhé 👋", "Link bio để xem thêm", "Comment 'quà' để em tư vấn"
- Dùng 1-2 emoji phù hợp, không spam emoji
- Hashtag cuối bài: 3-5 hashtag ngắn gọn liên quan

Chỉ trả về caption hoàn chỉnh, không thêm giải thích hay chú thích.
"""

ADS_SYSTEM_PROMPT_TEMPLATE = f"""{BRAND_VOICE}

## Nhiệm vụ của bạn
Viết 1 ad copy Facebook cho creative ads (quảng cáo trả phí).
Angle: {{angle_description}}

Ad copy phải:
- Dài 80-150 từ
- Cấu trúc: Hook mạnh (1 câu, bắt ngay vấn đề) → USP nổi bật (2-3 câu) → CTA rõ ràng (1 câu hành động)
- Hook PHẢI thẳng vào vấn đề/lợi ích, không vòng vo
- CTA ví dụ: "Nhắn tin ngay để nhận báo giá", "Đặt hàng hôm nay, giao trong ngày", "Inbox để tư vấn free"
- KHÔNG dùng: "Hãy", "Chúng tôi cam kết", "Trải nghiệm tuyệt vời"
- Dùng 0-1 emoji, tập trung vào nội dung

Chỉ trả về ad copy hoàn chỉnh, không thêm giải thích.
"""

ANGLE_DESCRIPTIONS = {
    "pain": "Pain Point — Khai thác nỗi đau/khó khăn khi chọn quà biếu. Người đọc phải gật đầu 'ừ đúng là khó thật'.",
    "solution": "Solution — Maison Gourmet là câu trả lời cho vấn đề đó. Tập trung vào USP: cao cấp, tinh tế, có in logo, giao nhanh.",
    "proof": "Social Proof — Dùng bằng chứng xã hội: khách hàng hài lòng, doanh nghiệp tin tưởng, số lượng đơn hàng, năm kinh nghiệm.",
}

DRY_RUN_SAMPLES = {
    "organic": """Tết này chọn quà cho sếp mà không biết mua gì? 😅

Hộp quà Maison Gourmet có đủ combo: rượu vang Ý, thực phẩm nhập khẩu, hộp thiết kế riêng theo yêu cầu. Đặt sớm được chiết khấu, hỗ trợ in logo doanh nghiệp luôn — khỏi lo.

Nhắn tin hỏi em nhé, tư vấn free không phán xét ngân sách 👋

#MaisonGourmet #QuaTang #QuaTet #QuaDoanhNghiep #QuaCaoCapHCM""",
    "pain": """HR mua quà cuối năm cho 200 người — đau đầu không?

Chọn mãi không xong, mua rồi sợ không vừa ý, ngân sách lại có hạn. Quen rồi.

Maison Gourmet lo hết: hộp quà cao cấp từ 300k, in logo công ty, giao tận nơi, có hóa đơn VAT. Đặt 1 lần, xong việc cả năm.

Inbox ngay để nhận báo giá theo ngân sách của bạn.""",
    "solution": """Quà biếu cao cấp — không cần tốn thời gian chọn nữa.

Maison Gourmet chuyên hộp quà tặng premium: rượu vang Ý, thực phẩm nhập khẩu, set quà thiết kế riêng. Hỗ trợ in logo, giao nhanh trong ngày, có hóa đơn đỏ cho doanh nghiệp.

Đã có 500+ đơn B2B tin tưởng. Bạn tiếp theo là ai?

Nhắn tin ngay để được tư vấn miễn phí.""",
    "proof": """500+ doanh nghiệp đã chọn Maison Gourmet cho quà cuối năm.

Từ startup 10 người đến tập đoàn 1000 nhân viên — đều chọn mình vì: giá tốt theo ngân sách, hộp đẹp không cần bao thêm, giao đúng hẹn không trễ.

Năm nay HR của bạn cũng nên thử một lần cho nhẹ đầu.

Đặt hàng hôm nay, ưu đãi đặc biệt cho đơn từ 50 hộp.""",
}


def parse_args():
    parser = argparse.ArgumentParser(description="Gen caption/ad copy theo brand voice Maison Gourmet")
    parser.add_argument(
        "--mode",
        required=True,
        choices=["organic", "ads"],
        help="Mode: organic (bài thường) hoặc ads (quảng cáo)",
    )
    parser.add_argument("--idea", required=True, help="Ý tưởng/chủ đề bài viết")
    parser.add_argument(
        "--angle",
        choices=["pain", "solution", "proof"],
        default="pain",
        help="Angle cho ads mode: pain/solution/proof",
    )
    parser.add_argument(
        "--output",
        default="assets/temp_caption.txt",
        help="Đường dẫn lưu file caption .txt",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=os.getenv("DRY_RUN", "").lower() in ("true", "1", "yes"),
        help="Chế độ test: không gọi API thật",
    )
    return parser.parse_args()


def call_openai(system_prompt: str, user_message: str, client: OpenAI) -> str:
    """Gọi GPT-4o-mini để gen caption. Retry 1 lần nếu fail."""
    for attempt in range(1, 3):
        try:
            log.info(f"[API] Đang gen caption (attempt {attempt}/2)...")
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.8,
                max_tokens=400,
            )
            caption = response.choices[0].message.content.strip()
            log.info(f"[API] Gen caption thành công ({len(caption)} ký tự)")
            return caption

        except RateLimitError as e:
            log.error(f"[API] Rate limit: {e}")
            if attempt < 2:
                log.info("Chờ 10 giây rồi thử lại...")
                time.sleep(10)
            else:
                sys.exit(1)

        except APITimeoutError as e:
            log.error(f"[API] Timeout: {e}")
            if attempt < 2:
                log.info("Chờ 5 giây rồi thử lại...")
                time.sleep(5)
            else:
                sys.exit(1)

        except APIError as e:
            log.error(f"[API] Lỗi OpenAI (attempt {attempt}): {e}")
            if attempt < 2:
                log.info("Thử lại sau 3 giây...")
                time.sleep(3)
            else:
                sys.exit(1)

        except Exception as e:
            log.error(f"[ERROR] Lỗi không xác định: {e}")
            sys.exit(1)


def gen_caption(mode: str, idea: str, angle: str, client: OpenAI, dry_run: bool) -> str:
    """Gen caption theo mode và idea."""
    if dry_run:
        log.info("[DRY RUN] Sẽ gọi API với:")
        log.info(f"  mode : {mode}")
        log.info(f"  idea : {idea}")
        if mode == "ads":
            log.info(f"  angle: {angle}")
        sample_key = angle if mode == "ads" else "organic"
        caption = DRY_RUN_SAMPLES.get(sample_key, DRY_RUN_SAMPLES["organic"])
        log.info("[DRY RUN] Trả về caption mẫu:")
        sys.stdout.write("\n" + "="*50 + "\n")
        sys.stdout.write(caption + "\n")
        sys.stdout.write("="*50 + "\n\n")
        sys.stdout.flush()
        return caption

    if mode == "organic":
        system_prompt = ORGANIC_SYSTEM_PROMPT
        user_message = (
            f"Viết caption Facebook organic cho chủ đề sau:\n"
            f"Ý tưởng: {idea}\n\n"
            f"Nhớ giữ đúng tone Maison Gourmet: gần gũi, ngắn gọn, hài hước nhẹ."
        )
    else:  # ads
        angle_desc = ANGLE_DESCRIPTIONS.get(angle, ANGLE_DESCRIPTIONS["pain"])
        system_prompt = ADS_SYSTEM_PROMPT_TEMPLATE.format(angle_description=angle_desc)
        user_message = (
            f"Viết ad copy Facebook cho chiến dịch sau:\n"
            f"Ý tưởng/context: {idea}\n"
            f"Angle: {angle} — {angle_desc}\n\n"
            f"Nhớ: hook mạnh, USP rõ, CTA hành động ngay."
        )

    return call_openai(system_prompt, user_message, client)


def save_caption(caption: str, output_path: str) -> Path:
    """Lưu caption ra file txt."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(caption, encoding="utf-8")
    log.info(f"[SAVED] Caption đã lưu tại: {out.resolve()}")
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

    # Gen caption
    caption = gen_caption(
        mode=args.mode,
        idea=args.idea,
        angle=args.angle,
        client=client,
        dry_run=args.dry_run,
    )

    # Lưu file
    output_file = save_caption(caption, args.output)

    # Print path để script khác có thể capture
    print(str(output_file.resolve()))


if __name__ == "__main__":
    main()
