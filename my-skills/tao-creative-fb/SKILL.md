---
name: tao-creative-fb
version: "1.0"
description: |
  Skill này tạo RA CẢ ẢNH VÀ VĂN BẢN (full content) cho Facebook Page của Maison Gourmet.
  KHÔNG bao giờ chỉ tạo ảnh hoặc chỉ viết caption — output luôn là 1 cặp hoàn chỉnh.

  **What it does:**
  - Mode 1 (Organic): Gợi ý 3 ý tưởng → user chọn → gen 1 ảnh + 1 caption hoàn chỉnh → preview → đăng lên FB Page
  - Mode 2 (Ads): Tự động gen 3 bộ creative, mỗi bộ gồm 1 ảnh ads + 1 ad copy → trả về để user dùng Ads Manager

  **When to use it:**
  - Khi cần bài đăng organic hằng ngày cho Page → dùng Mode 1
  - Khi cần creative cho chiến dịch quảng cáo → dùng Mode 2

  **Trigger phrases — Mode 1 (Organic):**
  - "tạo content cho ngày mai"
  - "gen bài Page"
  - "content free"
  - "content organic"
  - "đăng bài hôm nay"

  **Trigger phrases — Mode 2 (Ads):**
  - "tạo creative ads"
  - "gen ads"
  - "cần creative cho chiến dịch"
  - "làm bộ quảng cáo"

author: goClaw Agent (Maison Gourmet)
brand: Maison Gourmet
tags: [facebook, content, image, caption, ads, organic]
requires:
  - python: ">=3.10"
  - pip: [openai, requests, python-dotenv]
  - env: [OPENAI_API_KEY, FB_PAGE_ID, FB_PAGE_TOKEN]
scripts:
  gen_image: scripts/gen_image.py
  gen_caption: scripts/gen_caption.py
  post_facebook: scripts/post_facebook.py
assets:
  image_prompts: assets/image-prompt-templates.md
  caption_templates: assets/caption-templates.md
---

# Skill: tao-creative-fb

> **Nguyên tắc cốt lõi:** Mỗi output phải gồm CẢ ẢNH VÀ VĂN BẢN.
> - Một bài đăng FB hoàn chỉnh = **1 ảnh** + **1 caption**
> - Một creative ads hoàn chỉnh = **1 ảnh ads** + **1 ad copy**

---

## MODE 1 — CONTENT FREE (Organic, auto-post hằng ngày)

**Trigger:** "tạo content cho ngày mai", "gen bài Page", "content free", "content organic"

### Quy trình 4 bước:

**Bước A — Gen ý tưởng:**
- Gợi ý 3 ý tưởng bài đăng cho user chọn
- Mỗi ý gồm: tiêu đề ngắn + angle 1 câu
- Ví dụ format:
  ```
  1. [Tết gần rồi] — Angle: nhắc nhở mua quà sớm, tone nhẹ nhàng hài hước
  2. [Quà cho sếp] — Angle: giải quyết nỗi đau "không biết biếu gì", tone thân thiện
  3. [Hộp quà Maison] — Angle: showcase sản phẩm mới, tone tự hào premium
  ```

**Bước B — Gen full content (sau khi user chọn):**
```bash
# Gen ảnh (quality low cho tiết kiệm chi phí)
python scripts/gen_image.py \
  --prompt "[IMAGE_PROMPT từ assets/image-prompt-templates.md]" \
  --quality low \
  --output assets/temp_image.png

# Gen caption
python scripts/gen_caption.py \
  --mode organic \
  --idea "[Ý tưởng user đã chọn]" \
  --output assets/temp_caption.txt
```

**Bước C — Preview:**
- Hiển thị ảnh đã gen (hoặc đường dẫn file local)
- Hiển thị caption đầy đủ
- Hỏi: "Đăng luôn không anh? ảnh OK không?"

**Bước D — Đăng bài (sau khi user xác nhận):**
```bash
python scripts/post_facebook.py \
  --image assets/temp_image.png \
  --caption assets/temp_caption.txt
```

> ⚠️ **TUYỆT ĐỐI không chạy Bước D nếu chưa có xác nhận từ anh Hùng**

---

## MODE 2 — CREATIVE ADS (Gen thủ công, không auto-post)

**Trigger:** "tạo creative ads", "gen ads", "cần creative cho chiến dịch"

### Quy trình:

Tự động gen **3 bộ creative**, mỗi bộ theo 1 angle khác nhau:

| Bộ | Angle | Image prompt style | Copy style |
|----|-------|-------------------|------------|
| 1 | Pain Point | Cảnh chọn quà khó khăn, bối rối | Hook mạnh vào nỗi đau |
| 2 | Solution | Hộp Maison Gourmet là câu trả lời | USP nổi bật, giải quyết vấn đề |
| 3 | Social Proof | Nhiều hộp quà, bối cảnh doanh nghiệp | Bằng chứng xã hội, trust |

```bash
# Ví dụ lệnh gen bộ 1 (Pain Point)
python scripts/gen_image.py --prompt "[pain prompt]" --quality medium --output assets/ads_1_pain.png
python scripts/gen_caption.py --mode ads --angle pain --idea "[context]" --output assets/ads_1_copy.txt

# Bộ 2 (Solution)
python scripts/gen_image.py --prompt "[solution prompt]" --quality medium --output assets/ads_2_solution.png
python scripts/gen_caption.py --mode ads --angle solution --idea "[context]" --output assets/ads_2_copy.txt

# Bộ 3 (Social Proof)
python scripts/gen_image.py --prompt "[proof prompt]" --quality medium --output assets/ads_3_proof.png
python scripts/gen_caption.py --mode ads --angle proof --idea "[context]" --output assets/ads_3_copy.txt
```

**Output cuối cùng:**
- Trả về 3 cặp (ảnh + copy) để user paste vào Facebook Ads Manager
- **KHÔNG tự đăng** — Mode 2 chỉ gen, không post

---

## Cài đặt & Cấu hình

### 1. Cài dependencies
```bash
pip install openai requests python-dotenv
```

### 2. Tạo file .env
Copy từ `scripts/env.example` và điền key thật:
```bash
cp scripts/env.example .env
```

### 3. Test với DRY_RUN
```bash
# Test toàn bộ flow mà không gọi API thật
DRY_RUN=true python scripts/gen_image.py --prompt "test" --quality low --output assets/test.png
DRY_RUN=true python scripts/gen_caption.py --mode organic --idea "quà tết" --output assets/test.txt
DRY_RUN=true python scripts/post_facebook.py --image assets/test.png --caption assets/test.txt
```

---

## Ghi chú kỹ thuật

- `gpt-image-1` trả về `b64_json` — script tự decode thành file PNG
- Upload FB dùng `multipart/form-data` với `source=binary` (không dùng `url=` vì ảnh là local)
- Retry 1 lần nếu OpenAI API fail
- FB API fail → không retry, log lỗi rõ ràng để fix thủ công
- Tham chiếu `assets/image-prompt-templates.md` để lấy prompt chuẩn theo brand
- Tham chiếu `assets/caption-templates.md` để giữ đúng tone Maison Gourmet
