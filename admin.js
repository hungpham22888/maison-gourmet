document.addEventListener('DOMContentLoaded', () => {
  const syncBtn = document.getElementById('sync-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const lastSyncEl = document.getElementById('last-sync-time');
  const navLinks = document.querySelectorAll('.nav-link[data-tab]');
  const tabContents = document.querySelectorAll('.tab-content');
  const adminModal = document.getElementById('admin-modal');
  const adminForm = document.getElementById('admin-form');
  const modalTitle = document.getElementById('modal-title');

  let globalData = null;
  let currentModalType = '';
  let editingId = null; 
  const API_BASE = '/api'; // Use relative path for Vercel deployment

  // Theme Management
  const currentTheme = localStorage.getItem('admin_theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon(currentTheme);

  themeToggle.addEventListener('click', () => {
    const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('admin_theme', theme);
    updateThemeIcon(theme);
  });

  function updateThemeIcon(theme) {
    themeToggle.innerHTML = theme === 'light' 
      ? '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
      : '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
  }

  // Tab Switching
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = link.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  function switchTab(tabId) {
    navLinks.forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
    if (activeLink) activeLink.classList.add('active');

    tabContents.forEach(c => c.classList.add('hidden'));
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) activeTab.classList.remove('hidden');

    if (globalData) {
      if (tabId === 'orders') renderFullOrders(globalData);
      if (tabId === 'customers') renderFullCustomers(globalData);
      if (tabId === 'products') renderFullProducts(globalData);
    }
  }

  // Data Loading
  async function loadDashboardData() {
    try {
      // Priority 1: Fetch live data from Cloud API
      const t = new Date().getTime();
      const [productsRes, customersRes, ordersRes] = await Promise.all([
          fetch(`${API_BASE}/products?t=${t}`),
          fetch(`${API_BASE}/customers?t=${t}`),
          fetch(`${API_BASE}/orders?t=${t}`)
      ]);
      
      if (productsRes.ok && customersRes.ok && ordersRes.ok) {
        const [products, customers, orders] = await Promise.all([
            productsRes.json(),
            customersRes.json(),
            ordersRes.json()
        ]);
        
        // Calculate stats on the fly since we moved away from local sync script
        const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        
        globalData = {
          products,
          customers,
          orders,
          stats: {
            total_revenue: totalRevenue,
            total_orders: orders.length,
            total_customers: customers.length,
            pending_orders: pendingOrders
          },
          last_sync: new Date().toLocaleString('vi-VN') + " (Live Cloud)"
        };
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.innerText = "☁️ Kết nối Cloud: OK";
            statusEl.className = "status-badge success";
        }
        console.log("✅ Data loaded from Cloud API");
      } else {
        const errorMsg = `LỖI API: Products:${productsRes.status}, Customers:${customersRes.status}, Orders:${ordersRes.status}`;
        console.error("🛑 STOP: API FAILED!", errorMsg);
        
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.innerText = "⚠️ Mất kết nối Cloud - Đang xem dữ liệu cũ";
            statusEl.className = "status-badge error";
        }

        // Fallback: Static sync file
        const response = await fetch('data_sync.json?t=' + new Date().getTime());
        globalData = await response.json();
        globalData.last_sync += " (Dữ liệu cũ/Offline)";
      }
      
      renderDashboard(globalData);
      if (lastSyncEl) lastSyncEl.textContent = `Live: ${globalData.last_sync}`;
      
      const activeTabLink = document.querySelector('.nav-link.active');
      if (activeTabLink) {
        const tabId = activeTabLink.getAttribute('data-tab');
        if (tabId === 'orders') renderFullOrders(globalData);
        if (tabId === 'customers') renderFullCustomers(globalData);
        if (tabId === 'products') renderFullProducts(globalData);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  }

  // CRUD MODAL LOGIC
  window.openModal = (type, id = null) => {
    currentModalType = type;
    editingId = id;
    adminModal.classList.remove('hidden');
    adminForm.innerHTML = '';
    
    let record = null;
    if (id && globalData) {
        const listType = type === 'product' ? 'products' : type === 'customer' ? 'customers' : 'orders';
        record = globalData[listType].find(item => item.id === id);
    }

    if (type === 'order') {
        modalTitle.innerText = id ? 'Chỉnh sửa đơn hàng' : 'Thêm đơn hàng thủ công';
        adminForm.innerHTML = `
            <div class="form-group"><label>Tên khách hàng</label><input type="text" name="customer_name" value="${record ? record.customer_name : ''}" required></div>
            <div class="form-group"><label>Email khách hàng</label><input type="email" name="customer_email" placeholder="Để gửi email xác nhận" value=""></div>
            <div class="form-group"><label>Sản phẩm</label><input type="text" name="product_name" value="${record ? record.product_name : ''}" required></div>
            <div class="form-group"><label>Số tiền (VNĐ)</label><input type="number" name="amount" value="${record ? record.amount : ''}" required></div>
            <div class="form-group"><label>Trạng thái</label>
                <select name="status">
                    <option value="pending" ${record && record.status === 'pending' ? 'selected' : ''}>Đang chờ</option>
                    <option value="completed" ${record && record.status === 'completed' ? 'selected' : ''}>Hoàn thành</option>
                    <option value="cancelled" ${record && record.status === 'cancelled' ? 'selected' : ''}>Đã hủy</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:10px;">${id ? 'Cập nhật' : 'Lưu đơn hàng'}</button>
        `;
    } else if (type === 'customer') {
        modalTitle.innerText = id ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới';
        adminForm.innerHTML = `
            <div class="form-group"><label>Họ và tên</label><input type="text" name="name" value="${record ? record.name : ''}" required></div>
            <div class="form-group"><label>Số điện thoại</label><input type="text" name="phone" value="${record ? record.phone : ''}"></div>
            <div class="form-group"><label>Email</label><input type="email" name="email" value="${record ? (record.email || '') : ''}"></div>
            <div class="form-group"><label>Địa chỉ</label><input type="text" name="address" value="${record ? (record.address || '') : ''}"></div>
            <button type="submit" class="btn btn-primary" style="margin-top:10px;">${id ? 'Cập nhật' : 'Lưu khách hàng'}</button>
        `;
    } else if (type === 'product') {
        modalTitle.innerText = id ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới';
        adminForm.innerHTML = `
            <div class="form-group"><label>Tên sản phẩm</label><input type="text" name="name" value="${record ? record.name : ''}" required></div>
            <div class="form-group"><label>Hạng mục</label>
                <select name="category">
                    <option value="classic" ${record && record.category === 'classic' ? 'selected' : ''}>Cổ Điển</option>
                    <option value="premium" ${record && record.category === 'premium' ? 'selected' : ''}>Premium</option>
                    <option value="corp" ${record && record.category === 'corp' ? 'selected' : ''}>Doanh nghiệp</option>
                </select>
            </div>
            <div class="form-group"><label>Giá (VNĐ)</label><input type="number" name="price" value="${record ? record.price : ''}" required></div>
            <div class="form-group"><label>Số lượng tồn</label><input type="number" name="quantity" value="${record ? record.quantity : ''}" required></div>
            <button type="submit" class="btn btn-primary" style="margin-top:10px;">${id ? 'Cập nhật' : 'Lưu sản phẩm'}</button>
        `;
    }
  };

  window.closeModal = () => {
    adminModal.classList.add('hidden');
    editingId = null;
  };

  adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(adminForm);
    const data = Object.fromEntries(formData.entries());
    
    const submitBtn = adminForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Đang lưu...';

    try {
      const isEdit = editingId !== null;
      const endpoint = isEdit 
        ? `${API_BASE}/${currentModalType}s/${editingId}`
        : `${API_BASE}/${currentModalType}s`;
      
      const response = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        console.log(`Record saved successfully`);
        closeModal();
        loadDashboardData();
      } else {
        const err = await response.json();
        console.error(`Failed to save record: ${err.error || response.statusText}`);
        alert('Lỗi: ' + (err.error || 'Không rõ lỗi'));
      }
    } catch (error) {
      console.error('Network error while saving record:', error);
      alert('Lỗi kết nối API!');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Lưu';
    }
  });

  // Rendering functions
  function renderDashboard(data) {
    const stats = data.stats;
    document.getElementById('total-revenue').innerText = (stats.total_revenue || 0).toLocaleString('vi-VN') + 'đ';
    document.getElementById('total-orders').innerText = stats.total_orders || 0;
    document.getElementById('total-customers').innerText = stats.total_customers || 0;
    document.getElementById('pending-orders').innerText = stats.pending_orders || 0;

    const tableBody = document.getElementById('dashboard-orders-table');
    if (tableBody) {
      tableBody.innerHTML = '';
      data.orders.slice(0, 5).forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>#${order.order_code}</td><td class="customer-name">${order.customer_name}</td><td>${order.product_name}</td><td>${order.amount.toLocaleString('vi-VN')}đ</td><td><span class="badge badge-${order.status}">${translateStatus(order.status)}</span></td>`;
        tableBody.appendChild(row);
      });
    }

    const productList = document.getElementById('recent-products');
    if (productList) {
      productList.innerHTML = '';
      data.products.slice(0, 5).forEach(product => {
        const item = document.createElement('li');
        item.className = 'activity-item';
        item.innerHTML = `<img src="${product.image || 'product_set.png'}" alt="" class="activity-img"><div class="activity-info"><h4>${product.name}</h4><p>${product.price.toLocaleString('vi-VN')}đ • Tồn kho: ${product.quantity}</p></div>`;
        productList.appendChild(item);
      });
    }
    renderChart(data.orders);
  }

  function renderFullOrders(data) {
    const tableBody = document.getElementById('all-orders-table');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    data.orders.forEach(order => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${order.order_date}</td>
        <td>#${order.order_code}</td>
        <td class="customer-name">${order.customer_name}</td>
        <td>${order.product_name}</td>
        <td>${order.amount.toLocaleString('vi-VN')}đ</td>
        <td><span class="badge badge-${order.status}">${translateStatus(order.status)}</span></td>
        <td><button class="btn-sync" onclick="openModal('order', ${order.id})" title="Chỉnh sửa"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button></td>
      `;
      tableBody.appendChild(row);
    });
  }

  function renderFullCustomers(data) {
    const tableBody = document.getElementById('customers-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    data.customers.forEach(cust => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="customer-name">${cust.name}</td>
        <td>${cust.phone || 'N/A'}</td>
        <td>${cust.email || 'N/A'}</td>
        <td>${cust.address || ''}</td>
        <td><span class="badge badge-completed">${cust.source || 'website'}</span></td>
        <td>${cust.registered_at.split(' ')[0]}</td>
        <td><button class="btn-sync" onclick="openModal('customer', ${cust.id})" title="Chỉnh sửa"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button></td>
      `;
      tableBody.appendChild(row);
    });
  }

  function renderFullProducts(data) {
    const tableBody = document.getElementById('products-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    data.products.forEach(p => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><div style="display:flex; align-items:center; gap:10px;"><img src="${p.image}" style="width:30px; border-radius:5px;"><span>${p.name}</span></div></td>
        <td>${p.category}</td>
        <td>${p.price.toLocaleString('vi-VN')}đ</td>
        <td>${p.quantity}</td>
        <td><span class="badge badge-completed">${p.status}</span></td>
        <td><button class="btn-sync" onclick="openModal('product', ${p.id})" title="Chỉnh sửa"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button></td>
      `;
      tableBody.appendChild(row);
    });
  }

  function translateStatus(status) {
    const statuses = { 'pending': 'Đang chờ', 'completed': 'Hoàn thành', 'cancelled': 'Đã hủy' };
    return statuses[status.toLowerCase()] || status;
  }

  function renderChart(orders) {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;
    const dailyData = {};
    orders.forEach(o => {
      const date = o.order_date.split(' ')[0];
      dailyData[date] = (dailyData[date] || 0) + o.amount;
    });
    const dates = Object.keys(dailyData).sort().slice(-7);
    const labels = dates;
    const values = dates.map(d => dailyData[d]);
    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Chưa có dữ liệu'],
        datasets: [{
          label: 'Doanh thu (VNĐ)',
          data: values.length ? values : [0],
          borderColor: '#9c27b0',
          backgroundColor: 'rgba(156, 39, 176, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  syncBtn.addEventListener('click', () => {
    syncBtn.classList.add('loading');
    setTimeout(() => {
      loadDashboardData();
      syncBtn.classList.remove('loading');
    }, 800);
  });

  loadDashboardData();
  
  // Auto-refresh every 30 seconds to show new orders immediately
  setInterval(loadDashboardData, 30000);
});
