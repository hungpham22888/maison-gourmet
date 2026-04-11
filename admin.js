document.addEventListener('DOMContentLoaded', () => {
  const syncBtn = document.getElementById('sync-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const lastSyncEl = document.getElementById('last-sync-time');

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

  // Data Loading
  async function loadDashboardData() {
    try {
      // Small delay to simulate network
      const response = await fetch('data_sync.json');
      if (!response.ok) throw new Error('Sync file not found');
      
      const data = await response.json();
      renderDashboard(data);
      if (lastSyncEl) lastSyncEl.textContent = `Cập nhật: ${data.last_sync}`;
    } catch (error) {
      console.error('Error loading admin data:', error);
      // Show error state in placeholders if needed
    }
  }

  function renderDashboard(data) {
    // 1. Stats Cards
    const stats = data.stats;
    document.getElementById('total-revenue').innerText = (stats.total_revenue || 0).toLocaleString('vi-VN') + 'đ';
    document.getElementById('total-orders').innerText = stats.total_orders || 0;
    document.getElementById('total-customers').innerText = stats.total_customers || 0;
    document.getElementById('pending-orders').innerText = stats.pending_orders || 0;

    // 2. Orders Table
    const tableBody = document.getElementById('orders-table-body');
    if (tableBody) {
      tableBody.innerHTML = '';
      const recentOrders = data.orders.slice(0, 10); // Show max 10
      
      if (recentOrders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px;">Chưa có đơn hàng nào</td></tr>';
      } else {
        recentOrders.forEach(order => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>#${order.order_code}</td>
            <td class="customer-name">${order.customer_name}</td>
            <td>${order.product_name}</td>
            <td>${order.amount.toLocaleString('vi-VN')}đ</td>
            <td><span class="badge badge-${order.status}">${translateStatus(order.status)}</span></td>
          `;
          tableBody.appendChild(row);
        });
      }
    }

    // 3. Activity List (Products/Customers)
    const productList = document.getElementById('recent-products');
    if (productList) {
      productList.innerHTML = '';
      data.products.slice(0, 5).forEach(product => {
        const item = document.createElement('li');
        item.className = 'activity-item';
        item.innerHTML = `
          <img src="${product.image || 'product_set.png'}" alt="" class="activity-img">
          <div class="activity-info">
            <h4>${product.name}</h4>
            <p>${product.price.toLocaleString('vi-VN')}đ • Tồn kho: ${product.quantity}</p>
          </div>
        `;
        productList.appendChild(item);
      });
    }

    // 4. Activity Chart
    renderChart(data.orders);
  }

  function translateStatus(status) {
    const statuses = {
      'pending': 'Đang chờ',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã hủy'
    };
    return statuses[status.toLowerCase()] || status;
  }

  function renderChart(orders) {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;

    // Group revenue by date (last 7 days)
    const dailyData = {};
    const labels = [];
    const values = [];

    // Simple grouping logic
    orders.forEach(o => {
      const date = o.order_date.split(' ')[0];
      dailyData[date] = (dailyData[date] || 0) + o.amount;
    });

    const dates = Object.keys(dailyData).sort().slice(-7);
    dates.forEach(d => {
      labels.push(d);
      values.push(dailyData[d]);
    });

    // Chart.js config
    new Chart(ctx, {
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
          fill: true,
          pointBackgroundColor: '#9c27b0',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  // Sync animation
  syncBtn.addEventListener('click', () => {
    syncBtn.classList.add('loading');
    // Note: In this static env, syncBtn won't actually trigger sync_admin.py 
    // unless the user runs it. We just simulate visual feedback.
    setTimeout(() => {
      loadDashboardData();
      syncBtn.classList.remove('loading');
    }, 1000);
  });

  // Initial load
  loadDashboardData();
});
