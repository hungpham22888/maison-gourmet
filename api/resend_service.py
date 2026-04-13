import os
import resend

# Auto-load API key from resend_config.txt or Environment Variable
def get_resend_api_key():
    # Production (Vercel)
    if os.environ.get("RESEND_API_KEY"):
        return os.environ.get("RESEND_API_KEY")
    
    # Local fallback
    try:
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "resend_config.txt")
        with open(config_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception as e:
        print(f"Không tìm thấy resend_config.txt: {e}")
        return None

# Setup config
resend.api_key = get_resend_api_key()

def send_email(to_email, subject, html_content):
    if not resend.api_key:
        print("Loi: Chua cau hinh Resend API Key.")
        return False
        
    try:
        # Default testing domain: onboarding@resend.dev
        response = resend.Emails.send({
            "from": "Maison Gourmet <onboarding@resend.dev>",
            "to": to_email,
            "subject": subject,
            "html": html_content
        })
        print(f"Da gui email thanh cong toi {to_email}")
        return response
    except Exception as e:
        print(f"Loi khi gui email qua Resend: {e}")
        return None
