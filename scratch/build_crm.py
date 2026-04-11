import sqlite3, sys, os
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = r'c:\Users\phamh\Desktop\AI Agent\maison-gourmet\brain.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=" * 60)
print("🚀 BUILDING CRM DATABASE")
print("=" * 60)

# ============================================
# 1. TABLE: products
# ============================================
print("\n📦 Creating table: products...")

cursor.execute('''
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        description TEXT,
        quantity INTEGER NOT NULL DEFAULT 0,
        category TEXT DEFAULT 'Quà tặng',
        image TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
''')

# Check if products already exist
cursor.execute("SELECT COUNT(*) FROM products")
product_count = cursor.fetchone()[0]

if product_count == 0:
    # Insert products from the website
    products = [
        (
            'Hộp Quà An Quý',
            648000,
            'Hộp quà cao cấp dành cho đối tác, gia đình. Thiết kế hộp thiếc sang trọng, nội dung tuyển chọn hài hòa.',
            100,
            'Quà tặng cao cấp',
            'product_set.png'
        ),
        (
            'Túi Quà Phú Quý',
            428000,
            'Túi quà thanh lịch, phù hợp tặng đồng nghiệp, bạn bè. Đóng gói cẩn thận, quà tặng ý nghĩa.',
            150,
            'Quà tặng trung cấp',
            'product1.png'
        ),
        (
            'Hộp Trà Sen Premium',
            368000,
            'Bộ trà sen cao cấp, nguyên liệu tự nhiên. Hương thơm thanh nhã, phù hợp làm quà biếu người lớn tuổi.',
            200,
            'Trà & Đồ uống',
            'product2.png'
        ),
        (
            'Set Quà Sức Khỏe',
            528000,
            'Combo quà tặng sức khỏe: yến sào, mật ong, hạt dinh dưỡng. Đóng hộp thiếc cao cấp, thích hợp tặng sếp và đối tác.',
            80,
            'Quà tặng sức khỏe',
            'product3.png'
        ),
        (
            'Set Quà Doanh Nghiệp (B2B)',
            0,
            'Combo quà tặng cho doanh nghiệp, số lượng từ 50 hộp. Hỗ trợ in logo, thiết kế riêng theo yêu cầu. Liên hệ để nhận báo giá.',
            999,
            'B2B / Doanh nghiệp',
            'product4.png'
        ),
    ]

    cursor.executemany('''
        INSERT INTO products (name, price, description, quantity, category, image)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', products)
    print(f"   ✅ Inserted {len(products)} products")
else:
    print(f"   ℹ️ Products table already has {product_count} records, skipping insert")

# ============================================
# 2. TABLE: customers
# ============================================
print("\n👥 Creating table: customers...")

cursor.execute('''
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        zalo TEXT,
        email TEXT,
        source TEXT DEFAULT 'website',
        notes TEXT,
        registered_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        UNIQUE(phone)
    )
''')

# Check if waitlist.json exists and import
# Search in multiple locations
waitlist_paths = [
    r'c:\Users\phamh\Desktop\AI Agent\maison-gourmet\waitlist.json',
    r'c:\Users\phamh\Desktop\AI Agent\maison-gourmet\data\waitlist.json',
    r'c:\Users\phamh\Desktop\AI Agent\my-brain\waitlist.json',
]

waitlist_imported = False
for wpath in waitlist_paths:
    if os.path.exists(wpath):
        print(f"   📥 Found waitlist at: {wpath}")
        try:
            import json
            with open(wpath, 'r', encoding='utf-8') as f:
                waitlist = json.load(f)
            
            imported = 0
            skipped = 0
            for entry in waitlist:
                name = entry.get('name', entry.get('ten', ''))
                phone = entry.get('phone', entry.get('sdt', entry.get('dien_thoai', '')))
                zalo = entry.get('zalo', phone)  # default zalo = phone
                email = entry.get('email', '')
                
                if not name and not phone:
                    skipped += 1
                    continue
                
                try:
                    cursor.execute('''
                        INSERT OR IGNORE INTO customers (name, phone, zalo, email, source)
                        VALUES (?, ?, ?, ?, 'waitlist')
                    ''', (name, phone, zalo, email))
                    if cursor.rowcount > 0:
                        imported += 1
                    else:
                        skipped += 1
                except sqlite3.IntegrityError:
                    skipped += 1
            
            print(f"   ✅ Imported {imported} customers from waitlist ({skipped} skipped/duplicates)")
            waitlist_imported = True
        except Exception as e:
            print(f"   ⚠️ Error importing waitlist: {e}")
        break

if not waitlist_imported:
    print("   ℹ️ No waitlist.json found — customers table created (empty)")
    print("   💡 You can add customers manually via admin panel later")

# ============================================
# 3. TABLE: orders
# ============================================
print("\n🛒 Creating table: orders...")

cursor.execute('''
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_code TEXT UNIQUE NOT NULL,
        customer_id INTEGER,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        product_id INTEGER,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        amount REAL NOT NULL DEFAULT 0,
        payment_method TEXT DEFAULT 'COD',
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        order_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )
''')

print("   ✅ Orders table created")

# ============================================
# COMMIT & VERIFY
# ============================================
conn.commit()

print("\n" + "=" * 60)
print("✅ CRM DATABASE BUILD COMPLETE!")
print("=" * 60)

# Verify all tables
print("\n📊 VERIFICATION:")
for table in ['products', 'customers', 'orders']:
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    cursor.execute(f"PRAGMA table_info({table})")
    cols = cursor.fetchall()
    col_names = [c[1] for c in cols]
    print(f"\n   Table: {table}")
    print(f"   Columns: {', '.join(col_names)}")
    print(f"   Records: {count}")
    
    if count > 0:
        cursor.execute(f"SELECT * FROM {table}")
        rows = cursor.fetchall()
        for row in rows:
            print(f"   → {row}")

conn.close()
print("\n🎉 Done! Database ready at:", DB_PATH)
