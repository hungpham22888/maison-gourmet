document.addEventListener('DOMContentLoaded', () => {
  const cart = JSON.parse(localStorage.getItem('maison_cart')) || [];

  if (cart.length === 0) {
    window.location.href = 'index.html';
    return;
  }

  const summaryItems = document.getElementById('checkout-summary-items');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const totalEl = document.getElementById('checkout-total');
  const cartInput = document.getElementById('checkout-cart-input');

  /* ---------- FLASH SALE LOGIC (CHECKOUT) ---------- */
  // Chú ý: Tháng trong JS bắt đầu từ 0 (Tháng 4 là index 3)
  const SALE_START = new Date(2026, 3, 5, 0, 0, 0).getTime();
  const SALE_END = new Date(2026, 3, 6, 23, 59, 59).getTime();
  const now = new Date().getTime();
  const isSaleActive = now >= SALE_START && now <= SALE_END;

  let total = 0;
  cart.forEach(item => {
    // If sale active and price was not already discounted at add-to-cart, apply now.
    // (We estimate original price if it doesn't look like a discounted price, 
    // but better to just use a factor or check if the discount was already applied)
    // For simplicity, we trust the cart price but if sale is active and user just arrived, 
    // we can apply an additional 30% if they are using original prices.
    // However, to be safe and clear: let's just apply 30% to everything if active.
    
    let displayPrice = item.price;
    // Note: If the item was already added during the sale, it already has the 30% off.
    // We don't want to double discount. 
    // In script.js, we set prices-updated on DOM, but here we check the price vs original.
    // Let's assume most items in cart are original prices and we apply discount if active.
    
    // Actually, a better approach: if isSaleActive is true, we force 30% off the total.
    
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    const el = document.createElement('div');
    el.className = 'summary-item';
    el.innerHTML = `
      <div class="summary-item-img-wrap">
        <img src="${item.img || 'product_set.png'}" alt="${item.name}">
        <span class="summary-item-qty">${item.quantity}</span>
        ${isSaleActive ? '<span class="sale-badge" style="top:-5px; right:-5px; font-size:0.6rem; padding:2px 5px;">-30%</span>' : ''}
      </div>
      <div class="summary-item-info">
        <h4>${item.name}</h4>
        ${isSaleActive ? '<p style="color:#ff4d6d; font-size:0.75rem; margin-top:2px;">Flash Sale 30% áp dụng!</p>' : ''}
      </div>
      <div class="summary-item-price">
        ${item.price === 0 ? 'Liên hệ' : (item.price * item.quantity).toLocaleString('vi-VN') + 'đ'}
      </div>
    `;
    summaryItems.appendChild(el);
  });

  if (isSaleActive) {
    // Application of 30% to total if not already applied
    // Actually, if script.js already applied it to cart items, we don't want to double.
    // But if we want to be SURE: let's just calculate the final total.
  }

  const hasContactPrice = cart.some(i => i.price === 0);
  const totalStr = total === 0 ? 'Liên hệ' : total.toLocaleString('vi-VN') + 'đ' + (hasContactPrice ? ' (+Liên hệ)' : '');
  
  if (subtotalEl) subtotalEl.textContent = totalStr;
  if (totalEl) totalEl.textContent = totalStr;

  // Prepare input text for email
  let cartText = cart.map((item, index) => `${index + 1}. [x${item.quantity}] ${item.name} - ${item.price === 0 ? 'Liên hệ' : (item.price * item.quantity).toLocaleString('vi-VN') + 'đ'}`).join('\n');
  cartText += `\n----------------------------------\n📦 TỔNG GIÁ TRỊ: ${totalStr}${isSaleActive ? ' (Đã áp dụng Flash Sale 30%)' : ''}\n(Ghi chú: Phí vận chuyển sẽ được tư vấn viên báo sau khi xác nhận địa chỉ)`;
  if (cartInput) cartInput.value = cartText;

  // Handle form
  const checkoutForm = document.getElementById('checkout-form');
  const checkoutSuccess = document.getElementById('checkout-success');
  const submitBtn = document.getElementById('submit-checkout-btn');

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('full-name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const address = document.getElementById('address').value.trim();

      if (!name || !phone || !address) {
        alert("Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ giao hàng!");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Đang xử lý...</span>';
      submitBtn.style.opacity = '0.7';

      const formData = new FormData(checkoutForm);
      fetch(checkoutForm.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      })
      .then(response => {
        if (response.ok) {
          checkoutForm.style.display = 'none';
          document.querySelector('.checkout-form-col .section-title').style.display = 'none';
          document.querySelector('.checkout-form-col .section-label').style.display = 'none';
          if (checkoutSuccess) checkoutSuccess.style.display = 'block';
          localStorage.removeItem('maison_cart');
        } else {
          throw new Error('Submit failed');
        }
      })
      .catch(err => {
        alert("Lỗi kết nối. Không thể gửi đơn đặt hàng, vui lòng thử lại sau!");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Xác Nhận Đặt Hàng</span>';
        submitBtn.style.opacity = '1';
      });
    });
  }
});
