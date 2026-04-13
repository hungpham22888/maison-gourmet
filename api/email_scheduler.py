import threading
import time
import os
import markdown

try:
    from api.resend_service import send_email
except ImportError:
    from resend_service import send_email

def parse_email_sequence():
    """Reads email_sequence.md and extracts subject and bodies as HTML."""
    seq_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'email_sequence.md')
    if not os.path.exists(seq_path):
        print(f"⚠️ File không tồn tại: {seq_path}")
        return []
    
    with open(seq_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Tương thích với format sử dụng '---' để phân thân
    parts = content.split('---')
    emails = []
    
    for part in parts:
        if 'Email' in part and 'Chủ đề:' in part:
            lines = part.strip().split('\n')
            subject = "Maison Gourmet"
            body_lines = []
            capture_body = False
            for line in lines:
                if line.startswith('**Chủ đề:**'):
                    subject = line.replace('**Chủ đề:**', '').strip()
                    capture_body = True
                elif capture_body:
                    body_lines.append(line)
                    
            body_md = '\n'.join(body_lines).strip()
            html_body = markdown.markdown(body_md)
            emails.append({'subject': subject, 'html': html_body})
            
    return emails

def schedule_waitlist_emails(to_email, test_mode=False):
    emails = parse_email_sequence()
    if not emails:
        print("❌ Không tìm thấy mẫu email (email_sequence.md) hoặc không đúng format.")
        return

    def send_sequence():
        # Clean +test from email to pass Resend's strict same-email limitation
        actual_email = to_email
        if "+" in actual_email and "@" in actual_email:
            base, domain = actual_email.split('@')
            actual_email = base.split('+')[0] + '@' + domain

        if test_mode:
            print(f"[TEST MODE] Gửi toàn bộ {len(emails)} emails ngay lập tức cho: {actual_email}")
            for i, em in enumerate(emails):
                prefix = f"[Test Email {i+1}] "
                # Dùng layout HTML cơ bản bọc ngoài
                full_html = f"<div style='font-family:sans-serif; line-height:1.6; color:#333'>{em['html']}</div>"
                send_email(actual_email, prefix + em['subject'], full_html)
                time.sleep(2) # Sleep nhẹ tránh spam api
        else:
            if len(emails) > 0:
                print(f"Gui Email 1 cho: {actual_email}")
                full_html = f"<div style='font-family:sans-serif; line-height:1.6; color:#333'>{emails[0]['html']}</div>"
                send_email(actual_email, emails[0]['subject'], full_html)
            
            if len(emails) > 1:
                def send_email_2():
                    print(f"Gui Email 2 cho: {actual_email}")
                    full_html2 = f"<div style='font-family:sans-serif; line-height:1.6; color:#333'>{emails[1]['html']}</div>"
                    send_email(actual_email, emails[1]['subject'], full_html2)
                    
                    if len(emails) > 2:
                        def send_email_3():
                            print(f"Gui Email 3 cho: {actual_email}")
                            full_html3 = f"<div style='font-family:sans-serif; line-height:1.6; color:#333'>{emails[2]['html']}</div>"
                            send_email(actual_email, emails[2]['subject'], full_html3)
                        
                        # 1 ngày sau (86400s) gửi email 3
                        threading.Timer(86400, send_email_3).start()
                
                # 2 ngày sau (172800s) gửi email 2
                threading.Timer(172800, send_email_2).start()

    # Bắt đầu trình độ phân luồng nền
    t = threading.Thread(target=send_sequence)
    t.start()
