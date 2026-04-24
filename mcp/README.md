# MCP Server - Maison Gourmet

Server cung cấp các công cụ (tools) cho AI Agent để tương tác trực tiếp với dữ liệu website.

## Cài đặt
```bash
pip install -r requirements.txt
```

## Chạy Server
```bash
python server.py
```

## Cấu hình Systemd (VPS)
Tạo file `/etc/systemd/system/mcp-server.service`:
```ini
[Unit]
Description=Maison Gourmet MCP Server
After=network.target

[Service]
User=root
WorkingDirectory=/opt/maison-gourmet/mcp
ExecStart=/opt/maison-gourmet/venv/bin/python server.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Tools Exposed
- `view_orders_summary(period)`
- `confirm_payment(order_code)`
- `update_stock(product_name, new_quantity)`
