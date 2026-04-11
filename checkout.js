document.addEventListener('DOMContentLoaded', () => {
  const cart = JSON.parse(localStorage.getItem('maison_cart')) || [];

  if (cart.length === 0) {
    window.location.href = 'index.html';
    return;
  }

  /* ============================================ */
  /* ===== DOM ELEMENTS ========================= */
  /* ============================================ */
  const summaryItems = document.getElementById('checkout-summary-items');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const totalEl = document.getElementById('checkout-total');
  const API_BASE = '/api'; 

  // Steps
  const stepForm = document.getElementById('checkout-step-form');
  const stepQR = document.getElementById('checkout-step-qr');
  const stepSuccess = document.getElementById('checkout-success');

  // Form
  const checkoutForm = document.getElementById('checkout-form');
  const submitBtn = document.getElementById('submit-checkout-btn');
  const paymentMethodSelect = document.getElementById('payment_method');

  // QR
  const timerEl = document.getElementById('payment-timer');

  // Status bar
  const orderStatusBar = document.getElementById('order-status-bar');

  /* ============================================ */
  /* ===== CART CALCULATION ===================== */
  /* ============================================ */
  const SALE_START = new Date(2026, 3, 5, 0, 0, 0).getTime();
  const SALE_END = new Date(2026, 3, 6, 23, 59, 59).getTime();
  const now = new Date().getTime();
  const isSaleActive = now >= SALE_START && now <= SALE_END;

  let total = 0;
  cart.forEach(item => {
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
        ${isSaleActive ? '<p style="color:#ff4d6d; font-size:0.75rem; margin-top:2px;">Flash Sale 30%!</p>' : ''}
      </div>
      <div class="summary-item-price">
        ${item.price === 0 ? 'Liên hệ' : (item.price * item.quantity).toLocaleString('vi-VN') + 'đ'}
      </div>
    `;
    summaryItems.appendChild(el);
  });

  const hasContactPrice = cart.some(i => i.price === 0);
  const totalStr = total === 0 ? 'Liên hệ' : total.toLocaleString('vi-VN') + 'đ' + (hasContactPrice ? ' (+Liên hệ)' : '');
  
  if (subtotalEl) subtotalEl.textContent = totalStr;
  if (totalEl) totalEl.textContent = totalStr;

  /* ============================================ */
  /* ===== SEPAY CONFIG ========================= */
  /* ============================================ */
  const SEPAY_BANK_ACCOUNT = '00002090706';
  const SEPAY_BANK_NAME = 'TPBank';

  // Generate unique order ID
  function generateOrderId() {
    const now = new Date();
    const datePart = String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const randPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return 'MG' + datePart + randPart;
  }

  const orderId = generateOrderId();

  // Build QR URL
  function buildQRUrl(amount, content) {
    let url = `https://qr.sepay.vn/img?acc=${SEPAY_BANK_ACCOUNT}&bank=${SEPAY_BANK_NAME}`;
    if (amount && amount > 0) url += `&amount=${amount}`;
    if (content) url += `&des=${encodeURIComponent(content)}`;
    return url;
  }

  // Prepare cart text for email
  function buildCartText(paymentMethod) {
    let cartText = cart.map((item, index) => 
      `${index + 1}. [x${item.quantity}] ${item.name} - ${item.price === 0 ? 'Liên hệ' : (item.price * item.quantity).toLocaleString('vi-VN') + 'đ'}`
    ).join('\n');
    
    cartText += `\n----------------------------------`;
    cartText += `\n📦 TỔNG GIÁ TRỊ: ${totalStr}`;
    if (isSaleActive) cartText += ` (Đã áp dụng Flash Sale 30%)`;
    cartText += `\n🆔 MÃ ĐƠN: ${orderId}`;
    cartText += `\n💳 THANH TOÁN: ${paymentMethod === 'Bank' ? 'Chuyển khoản ngân hàng (QR Sepay) — ĐẾN TỰ ĐỘNG' : 'COD - Tiền mặt khi nhận hàng'}`;
    cartText += `\n(Ghi chú: Phí vận chuyển sẽ được tư vấn viên báo sau khi xác nhận địa chỉ)`;
    
    return cartText;
  }

  // Send email via formsubmit.co
  function sendOrderEmail(formDataObj, paymentMethod) {
    const formData = new FormData();
    formData.append('_captcha', 'false');
    formData.append('_subject', `[MaisonGourmet] Đơn hàng mới #${orderId}${paymentMethod === 'Bank' ? ' — Đã thanh toán (Tự động)' : ' — COD'}`);
    formData.append('_template', 'table');
    formData.append('👤 Họ Tên Khách Hàng', formDataObj.fullName);
    formData.append('📞 Số Điện Thoại', formDataObj.phone);
    formData.append('📍 Địa Chỉ Giao Hàng', formDataObj.address);
    formData.append('🚚 Phương Thức Giao Hàng', formDataObj.shipping);
    formData.append('💳 Phương Thức Thanh Toán', paymentMethod === 'Bank' ? 'Chuyển khoản ngân hàng (Xác nhận tự động)' : 'COD - Tiền mặt khi nhận hàng');
    formData.append('🆔 Mã Đơn Hàng', orderId);
    formData.append('🛒 CHI TIẾT ĐƠN HÀNG', buildCartText(paymentMethod));
    if (formDataObj.message) {
      formData.append('📝 Ghi Chú Của Khách', formDataObj.message);
    }

    return fetch('https://formsubmit.co/ajax/maisoncakevn@gmail.com', {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    });
  }

  /* ============================================ */
  /* ===== AUTOMATED PAYMENT LOGIC ============== */
  /* ============================================ */
  let paymentTimer = null;
  let pollingInterval = null;

  function startPaymentTimer(durationSeconds) {
    let timer = durationSeconds;
    paymentTimer = setInterval(() => {
      const minutes = Math.floor(timer / 60);
      const seconds = timer % 60;
      
      timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      if (--timer < 0) {
        handlePaymentTimeout();
      }
    }, 1000);
  }

  function startPolling() {
    pollingInterval = setInterval(async () => {
      try {
        // Fetch live status from Cloud API instead of data_sync.json
        const response = await fetch(`${API_BASE}/orders`);
        const orders = await response.json();
        
        // Find current order in live data
        const currentOrder = orders.find(o => o.order_code === orderId);
        
        if (currentOrder && currentOrder.status === 'completed') {
          clearInterval(paymentTimer);
          clearInterval(pollingInterval);
          
          // Send final email notification before showing success screen
          sendOrderEmail(savedFormData, 'Bank').finally(() => {
            goToSuccess('Bank');
          });
        }
      } catch (e) {
        console.warn("Polling error:", e);
      }
    }, 5000); // Check every 5 seconds
  }

  function handlePaymentTimeout() {
    clearInterval(paymentTimer);
    clearInterval(pollingInterval);
    alert("Đã hết thời hạn thanh toán (5 phút). Đơn hàng của bạn sẽ bị hủy hoặc vui lòng thực hiện lại.");
    window.location.href = 'index.html';
  }

  /* ============================================ */
  /* ===== STEP TRANSITIONS ===================== */
  /* ============================================ */

  function showStep(step) {
    [stepForm, stepQR, stepSuccess].forEach(s => {
      if (s) s.style.display = 'none';
    });

    if (step) {
      step.style.display = 'block';
      step.style.opacity = '0';
      step.style.transform = 'translateY(15px)';
      requestAnimationFrame(() => {
        step.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        step.style.opacity = '1';
        step.style.transform = 'translateY(0)';
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateStatusBar(activeStep) {
    if (!orderStatusBar) return;
    orderStatusBar.style.display = 'flex';

    for (let i = 1; i <= 3; i++) {
      const step = document.getElementById(`status-step-${i}`);
      const line = document.getElementById(`status-line-${i}`);
      
      if (step) {
        step.classList.remove('active', 'completed');
        if (i < activeStep) step.classList.add('completed');
        if (i === activeStep) step.classList.add('active');
      }
      if (line) {
        line.classList.remove('completed');
        if (i < activeStep) line.classList.add('completed');
      }
    }
  }

  /* ============================================ */
  /* ===== STEP 1: FORM SUBMIT ================== */
  /* ============================================ */

  let savedFormData = null;

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const fullName = document.getElementById('full-name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const address = document.getElementById('address').value.trim();

      if (!fullName || !phone || !address) {
        alert("Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ giao hàng!");
        return;
      }

      savedFormData = {
        fullName,
        phone,
        address,
        shipping: document.getElementById('shipping_method').value,
        message: document.getElementById('message').value.trim()
      };

      const paymentMethod = paymentMethodSelect.value;

      if (paymentMethod === 'Bank') {
        goToQRStep();
      } else {
        goToCODSuccess();
      }
    });
  }

  /* ============================================ */
  /* ===== STEP 2: QR PAYMENT =================== */
  /* ============================================ */

  async function saveOrderToDB(paymentMethod = 'Bank') {
    try {
      const orderData = {
        order_code: orderId,
        customer_name: savedFormData.fullName,
        product_name: cart.length > 1 ? `${cart[0].name} và ${cart.length - 1} món khác` : cart[0].name,
        amount: total,
        status: 'pending',
        payment_method: paymentMethod
      };

      await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      console.log(`Order (${paymentMethod}) saved to DB successfully`);
    } catch (err) {
      console.error('Failed to save order to local DB:', err);
    }
  }

  function goToQRStep() {
    showStep(stepQR);
    updateStatusBar(2);
    
    // Save to DB immediately so it appears in Admin as 'pending'
    saveOrderToDB('Bank').then(() => {
        console.log("Order synced to Cloud Admin (Pending)");
    });

    const qrImg = document.getElementById('sepay-qr-img');
    const qrLoading = document.getElementById('qr-loading');
    const bankAmountEl = document.getElementById('bank-amount');
    const transferContentEl = document.getElementById('bank-transfer-content');

    if (bankAmountEl) {
      bankAmountEl.textContent = total > 0 ? total.toLocaleString('vi-VN') + 'đ' : 'Liên hệ';
    }
    if (transferContentEl) {
      transferContentEl.textContent = orderId;
    }

    if (qrLoading) qrLoading.style.display = 'flex';
    if (qrImg) {
      qrImg.style.opacity = '0';
      const qrUrl = buildQRUrl(total, orderId);
      qrImg.src = qrUrl;

      qrImg.onload = () => {
        if (qrLoading) qrLoading.style.display = 'none';
        qrImg.style.opacity = '1';
        
        // --- START AUTOMATION ---
        startPaymentTimer(300); // 5 minutes
        startPolling();
      };

      qrImg.onerror = () => {
        if (qrLoading) {
          qrLoading.innerHTML = '<span style="color:#e74c3c;">Lỗi tải mã QR.</span>';
        }
      };
    }
  }

  /* ============================================ */
  /* ===== COD SUCCESS ========================== */
  /* ============================================ */

  function goToCODSuccess() {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Đang xử lý...</span>';
    submitBtn.style.opacity = '0.7';

    // NEW: Save order to DB first so it appears in Admin as 'pending'
    saveOrderToDB('COD').finally(() => {
      sendOrderEmail(savedFormData, 'COD')
        .then(response => {
          if (response.ok) {
            goToSuccess('COD');
          } else {
            throw new Error('Email send failed');
          }
        })
        .catch(err => {
          console.error('Email error:', err);
          goToSuccess('COD');
        });
    });
  }

  /* ============================================ */
  /* ===== STEP 3: SUCCESS ====================== */
  /* ============================================ */

  function goToSuccess(paymentMethod) {
    showStep(stepSuccess);
    updateStatusBar(3);

    const successMsg = document.getElementById('success-message');
    const successOrderCode = document.getElementById('success-order-code');

    if (successOrderCode) successOrderCode.textContent = orderId;

    if (successMsg) {
      if (paymentMethod === 'Bank') {
        successMsg.innerHTML = `Cảm ơn bạn đã lựa chọn Maison Gourmet!<br>
          Hệ thống đã nhận được thanh toán <strong>tự động</strong>.<br>
          Đơn hàng của bạn đang được xử lý và đóng gói!`;
      } else {
        successMsg.innerHTML = `Cảm ơn bạn đã lựa chọn Maison Gourmet!<br>
          Đơn hàng COD đã được ghi nhận.<br>
          Tư vấn viên sẽ gọi xác nhận ngay trong ít phút!`;
      }
    }

    localStorage.removeItem('maison_cart');
  }

  /* ============================================ */
  /* ===== COPY BUTTONS ========================= */
  /* ============================================ */

  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      let textToCopy = btn.getAttribute('data-copy');
      if (!textToCopy) {
        const sourceId = btn.getAttribute('data-copy-from');
        if (sourceId) {
          const sourceEl = document.getElementById(sourceId);
          textToCopy = sourceEl ? sourceEl.textContent : '';
        }
      }
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
          btn.style.background = 'rgba(46, 204, 113, 0.15)';
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
          }, 1500);
        });
      }
    });
  });
});
