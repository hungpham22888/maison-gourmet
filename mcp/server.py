import os
import sqlite3
import json
from datetime import datetime
from flask import Flask, request, jsonify
from mcp.server.fastmcp import FastMCP

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'brain.db')

# Khởi tạo FastMCP
mcp = FastMCP("Maison Gourmet Business Tools")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# --- TOOLS ---

@mcp.tool()
def view_orders_summary(period: str = "today") -> str:
    """Xem báo cáo tóm tắt đơn hàng (today, yesterday, this_week)."""
    conn = get_db()
    cur = conn.cursor()
    
    date_filter = "date(order_date) = date('now', 'localtime')"
    if period == "yesterday":
        date_filter = "date(order_date) = date('now', 'localtime', '-1 day')"
    elif period == "this_week":
        date_filter = "date(order_date) >= date('now', 'localtime', 'weekday 0', '-7 days')"
    
    cur.execute(f"SELECT status, COUNT(*) as count, SUM(amount) as total FROM orders WHERE {date_filter} GROUP BY status")
    rows = cur.fetchall()
    
    if not rows:
        return f"Không có đơn hàng nào trong khoảng thời gian: {period}."
    
    report = [f"BÁO CÁO ĐƠN HÀNG ({period.upper()}):"]
    grand_total = 0
    for r in rows:
        report.append(f"- {r['status'].capitalize()}: {r['count']} đơn | {int(r['total']):,} VND")
        grand_total += r['total']
    
    report.append(f"\nTỔNG DOANH THU: {int(grand_total):,} VND")
    conn.close()
    return "\n".join(report)

@mcp.tool()
def confirm_payment(order_code: str) -> str:
    """Xác nhận thanh toán cho mã đơn hàng (ví dụ: MGM-1234)."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT customer_name FROM orders WHERE order_code = ?", (order_code,))
    order = cur.fetchone()
    
    if not order:
        return f"Khong tim thay don {order_code}."
    
    cur.execute("UPDATE orders SET status = 'completed', updated_at = datetime('now', 'localtime') WHERE order_code = ?", (order_code,))
    conn.commit()
    conn.close()
    return f"Da xac nhan thanh toan don {order_code} ({order['customer_name']})."

@mcp.tool()
def update_stock(product_name: str, new_quantity: int) -> str:
    """Cập nhật kho sản phẩm."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM products WHERE name LIKE ? LIMIT 1", (f"%{product_name}%",))
    p = cur.fetchone()
    
    if not p:
        return f"Khong tim thay san pham '{product_name}'."
    
    cur.execute("UPDATE products SET quantity = ?, updated_at = datetime('now', 'localtime') WHERE id = ?", (new_quantity, p['id']))
    conn.commit()
    conn.close()
    return f"Da cap nhat kho {p['name']} thanh {new_quantity}."

# --- HTTP SERVER ---
app = Flask(__name__)

@app.route("/mcp", methods=["POST"])
def mcp_post():
    # Giả lập xử lý request MCP qua HTTP cho goClaw
    # Trong môi trường thực tế, goClaw sẽ gửi JSON-RPC
    return jsonify({"status": "success", "info": "MCP Tool call received"})

@app.route("/health")
def health():
    return "OK"

if __name__ == "__main__":
    # Dùng port 3001 cho MCP
    print("Maison Gourmet MCP Server starting on port 3001...")
    # Vì FastMCP mặc định dùng stdio, chúng ta sẽ bọc nó lại hoặc dùng thư viện tương thích
    # Để test đơn giản, em sẽ chạy Flask trước
    app.run(host="127.0.0.1", port=3001)
