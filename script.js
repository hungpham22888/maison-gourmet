/* ============================================================
   MAISON GOURMET – JavaScript
   Handles: Navigation, Scroll effects, Product filtering,
   Form validation, Animations, Floating CTA, Back to top
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ======================================================
     1. NAVBAR – Sticky + Mobile toggle
     ====================================================== */
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');

  // Scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    handleBackToTop();
    handleFloatingCTA();
  }, { passive: true });

  // Mobile menu toggle
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      // document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        // document.body.style.overflow = '';
      });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        // document.body.style.overflow = '';
      }
    });
  }

  /* ======================================================
     2. SMOOTH SCROLL for anchor links
     ====================================================== */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const navHeight = navbar ? navbar.offsetHeight : 0;
        const annBar = document.getElementById('announcement-bar');
        const annHeight = annBar ? annBar.offsetHeight : 0;
        const topOffset = target.getBoundingClientRect().top + window.scrollY - navHeight - annHeight - 16;
        window.scrollTo({ top: topOffset, behavior: 'smooth' });
      }
    });
  });

  /* ======================================================
     3. PRODUCT TABS – Filter
     ====================================================== */
  const tabBtns = document.querySelectorAll('.tab-btn');
  const productCards = document.querySelectorAll('.product-card');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active tab
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      productCards.forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.classList.remove('hidden');
          // Trigger re-animation
          card.classList.remove('visible');
          requestAnimationFrame(() => {
            setTimeout(() => card.classList.add('visible'), 50);
          });
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  /* ======================================================
     4. INTERSECTION OBSERVER – Scroll animations
     ====================================================== */
  const animateElements = [
    ...document.querySelectorAll('.product-card'),
    ...document.querySelectorAll('.reason-card'),
    ...document.querySelectorAll('.testimonial-card'),
    ...document.querySelectorAll('.trust-logo-item'),
    document.querySelector('.about-grid'),
    document.querySelector('.order-grid'),
    document.querySelector('.pricing-table-wrap'),
    ...document.querySelectorAll('.section-header'),
    ...document.querySelectorAll('.contact-item'),
  ].filter(Boolean);

  // Add fade-in-up class
  animateElements.forEach(el => {
    el.classList.add('fade-in-up');
  });

  // Left/right animation for 2-column layouts
  const aboutImg = document.querySelector('.about-image-col');
  const aboutContent = document.querySelector('.about-content-col');
  if (aboutImg) { aboutImg.classList.remove('fade-in-up'); aboutImg.classList.add('fade-in-left'); }
  if (aboutContent) { aboutContent.classList.remove('fade-in-up'); aboutContent.classList.add('fade-in-right'); }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Once visible, unobserve
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -48px 0px'
  });

  [...animateElements, aboutImg, aboutContent].filter(Boolean).forEach(el => {
    observer.observe(el);
  });

  /* ======================================================
     14.5 FLASH SALE LOGIC & COUNTDOWN
     ====================================================== */
  // Chú ý: Tháng trong JS bắt đầu từ 0 (Tháng 1 là 0, Tháng 4 là 3)
  const SALE_START = new Date(2026, 3, 5, 0, 0, 0).getTime();
  const SALE_END = new Date(2026, 3, 6, 23, 59, 59).getTime();
  let isSaleActive = false;

  function updateFlashSale() {
    const now = new Date().getTime();
    const distance = SALE_END - now;
    const banner = document.getElementById('flash-sale-banner');

    if (now >= SALE_START && distance > 0) {
      isSaleActive = true;
      if (banner) banner.style.display = 'flex';

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (document.getElementById('timer-days')) document.getElementById('timer-days').innerText = days.toString().padStart(2, '0');
      if (document.getElementById('timer-hours')) document.getElementById('timer-hours').innerText = hours.toString().padStart(2, '0');
      if (document.getElementById('timer-mins')) document.getElementById('timer-mins').innerText = minutes.toString().padStart(2, '0');
      if (document.getElementById('timer-secs')) document.getElementById('timer-secs').innerText = seconds.toString().padStart(2, '0');

      // Update product prices on UI
      document.querySelectorAll('.product-card').forEach(card => {
        const btn = card.querySelector('.add-to-cart-btn');
        if (!btn) return;

        if (!btn.dataset.originalPrice) {
          btn.dataset.originalPrice = btn.dataset.price;
        }

        const originalPrice = parseInt(btn.dataset.originalPrice);
        const discountedPrice = Math.round(originalPrice * 0.7);
        btn.dataset.price = discountedPrice;

        const priceEl = card.querySelector('.product-price');
        const oldPriceEl = card.querySelector('.product-price-old');

        if (priceEl && !priceEl.classList.contains('sale-active')) {
          priceEl.innerText = discountedPrice.toLocaleString('vi-VN') + 'đ';
          priceEl.classList.add('sale-active');
          if (oldPriceEl) oldPriceEl.innerText = originalPrice.toLocaleString('vi-VN') + 'đ';

          const imgWrap = card.querySelector('.product-image-wrap');
          if (imgWrap && !imgWrap.querySelector('.sale-badge')) {
            const badge = document.createElement('span');
            badge.className = 'sale-badge';
            badge.innerText = '-30%';
            imgWrap.appendChild(badge);
          }
        }
      });
    } else {
      isSaleActive = false;
      if (banner) banner.style.display = 'none';
      document.querySelectorAll('.product-card').forEach(card => {
        const btn = card.querySelector('.add-to-cart-btn');
        if (btn && btn.dataset.originalPrice) {
          btn.dataset.price = btn.dataset.originalPrice;
          const priceEl = card.querySelector('.product-price');
          if (priceEl && priceEl.classList.contains('sale-active')) {
            priceEl.innerText = parseInt(btn.dataset.originalPrice).toLocaleString('vi-VN') + 'đ';
            priceEl.classList.remove('sale-active');
            const oldPriceEl = card.querySelector('.product-price-old');
            if (oldPriceEl) oldPriceEl.innerText = '';
          }
          const badge = card.querySelector('.sale-badge');
          if (badge) badge.remove();
        }
      });
    }
  }

  // Run timer every second
  setInterval(updateFlashSale, 1000);
  updateFlashSale();

  /* ======================================================
     15. E-COMMERCE CART LOGIC
     ====================================================== */
  let cart = JSON.parse(localStorage.getItem('maison_cart')) || [];

  function saveCart() {
    localStorage.setItem('maison_cart', JSON.stringify(cart));
  }

  const cartOverlay = document.getElementById('cart-overlay');
  const cartSidebar = document.getElementById('cart-sidebar');
  const cartBtn = document.getElementById('cart-btn');
  const closeCartBtn = document.getElementById('close-cart');
  const cartBadge = document.getElementById('cart-badge');
  const cartItemsContainer = document.getElementById('cart-items');
  const cartTotalPrice = document.getElementById('cart-total-price');
  const checkoutBtn = document.getElementById('checkout-btn');

  function openCart() {
    if (cartSidebar) cartSidebar.classList.add('open');
    if (cartOverlay) cartOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    if (cartSidebar) cartSidebar.classList.remove('open');
    if (cartOverlay) cartOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (cartBtn) cartBtn.addEventListener('click', openCart);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      window.location.href = 'checkout.html';
    });
  }

  function renderCart() {
    if (!cartItemsContainer) return;

    // Update badge
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartBadge) cartBadge.textContent = totalItems;

    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<div class="cart-empty">Giỏ hàng của bạn đang trống!</div>';
      if (cartTotalPrice) cartTotalPrice.textContent = '0đ';
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    if (checkoutBtn) checkoutBtn.disabled = false;
    cartItemsContainer.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;

      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <img src="${item.img || 'product_set.png'}" alt="${item.name}" />
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          <span class="cart-item-price">${item.price === 0 ? 'Liên hệ' : item.price.toLocaleString('vi-VN') + 'đ'}</span>
          <div class="qty-controls">
            <button class="qty-btn minus" data-id="${item.id}">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn plus" data-id="${item.id}">+</button>
          </div>
        </div>
        <button class="remove-item" data-id="${item.id}">&times;</button>
      `;
      cartItemsContainer.appendChild(itemEl);
    });

    if (cartTotalPrice) {
      if (cart.some(item => item.price === 0)) {
        cartTotalPrice.textContent = total === 0 ? 'Liên hệ' : total.toLocaleString('vi-VN') + 'đ (+Liên hệ)';
      } else {
        cartTotalPrice.textContent = total.toLocaleString('vi-VN') + 'đ';
      }
    }

    // Attach events for buttons inside cart
    cartItemsContainer.querySelectorAll('.plus').forEach(btn => {
      btn.addEventListener('click', (e) => updateQuantity(e.target.dataset.id, 1));
    });
    cartItemsContainer.querySelectorAll('.minus').forEach(btn => {
      btn.addEventListener('click', (e) => updateQuantity(e.target.dataset.id, -1));
    });
    cartItemsContainer.querySelectorAll('.remove-item').forEach(btn => {
      btn.addEventListener('click', (e) => removeFromCart(e.target.dataset.id));
    });
  }

  function addToCart(id, name, price, img) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ id, name, price: parseInt(price), img, quantity: 1 });
    }
    saveCart();
    renderCart();

    // Quick notification
    openCart();
  }

  function updateQuantity(id, change) {
    const item = cart.find(item => item.id === id);
    if (item) {
      item.quantity += change;
      if (item.quantity <= 0) {
        removeFromCart(id);
      } else {
        saveCart();
        renderCart();
      }
    }
  }

  function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    renderCart();
  }

  // Attach Add to Cart to buttons
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.dataset.id;
      const name = btn.dataset.name;
      const price = btn.dataset.price;
      const img = btn.dataset.img;
      addToCart(id, name, price, img);
    });
  });

  // Initial render
  renderCart();

  /* ======================================================
     5. CONSULTATION FORM – Validation & Submission
     ====================================================== */
  const consultationForm = document.getElementById('consultation-form');
  const formSuccess = document.getElementById('form-success');

  if (consultationForm) {
    consultationForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('full-name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const qty = document.getElementById('quantity').value.trim();
      const budget = document.getElementById('budget').value.trim();

      if (!name) {
        showFieldError('full-name', 'Vui lòng nhập họ và tên');
        return;
      }
      if (!phone || !/^[0-9]{9,11}$/.test(phone.replace(/\s/g, ''))) {
        showFieldError('phone', 'Số điện thoại không hợp lệ');
        return;
      }
      if (!qty || parseInt(qty) <= 0) {
        showFieldError('quantity', 'Vui lòng nhập số lượng');
        return;
      }
      if (!budget) {
        showFieldError('budget', 'Vui lòng nhập ngân sách dự kiến');
        return;
      }

      const submitBtn = document.getElementById('submit-consultation-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Đang gửi khảo sát...</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
        submitBtn.style.opacity = '0.8';
      }

      // TIẾP TỤC SỬ DỤNG LINK MỚI BẠN CUNG CẤP
      // LƯU Ý QUAN TRỌNG: Bạn PHẢI chọn "Who has access: Anyone" khi Deploy thì mới không bị lỗi yêu cầu đăng nhập.
      const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4XemJZUHikmBMio-_Q6be1WepCybM0nEdW4S21bc0lLIydZvGpvNlPtv5qGdo8mj2/exec";

      // Sử dụng URLSearchParams thay cho FormData để đảm bảo Google Apps Script nhận được data trong e.parameter
      const formData = new FormData(consultationForm);
      const params = new URLSearchParams();
      for (const pair of formData.entries()) {
        params.append(pair[0], pair[1]);
      }

      fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", 
        body: params,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      })
        .then(() => {
          consultationForm.reset(); // Reset form sau khi gửi
          consultationForm.style.display = 'none';
          formSuccess.style.display = 'block';
          formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
        .catch(error => {
          console.error("Lỗi:", error);
          alert("Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại hoặc gọi Hotline!");
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Gửi khảo sát</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>';
            submitBtn.style.opacity = '1';
          }
        });
    });

    consultationForm.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('input', () => clearFieldError(el.id));
      el.addEventListener('change', () => clearFieldError(el.id));
    });
  }

  function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.style.borderColor = '#e74c3c';
    field.style.boxShadow = '0 0 0 3px rgba(231, 76, 60, 0.15)';

    // Remove existing error
    const existing = field.parentElement.querySelector('.field-error');
    if (existing) existing.remove();

    const error = document.createElement('span');
    error.className = 'field-error';
    error.textContent = message;
    error.style.cssText = 'color: #e74c3c; font-size: 0.78rem; margin-top: 4px; display: block;';
    field.parentElement.appendChild(error);
    field.focus();
  }

  function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.style.borderColor = '';
    field.style.boxShadow = '';
    const error = field.parentElement.querySelector('.field-error');
    if (error) error.remove();
  }

  /* ======================================================
     6. BACK TO TOP BUTTON
     ====================================================== */
  const backToTopBtn = document.getElementById('back-to-top');

  function handleBackToTop() {
    if (!backToTopBtn) return;
    if (window.scrollY > 400) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  }

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ======================================================
     7. FLOATING CTA – Show after scroll
     ====================================================== */
  const floatingCta = document.getElementById('floating-cta');

  function handleFloatingCTA() {
    if (!floatingCta) return;
    if (window.scrollY > 300) {
      floatingCta.style.opacity = '1';
      floatingCta.style.pointerEvents = 'auto';
      floatingCta.style.transform = 'none';
    } else {
      floatingCta.style.opacity = '0';
      floatingCta.style.pointerEvents = 'none';
      floatingCta.style.transform = 'translateY(20px)';
    }
  }

  // Initial state
  if (floatingCta) {
    floatingCta.style.opacity = '0';
    floatingCta.style.pointerEvents = 'none';
    floatingCta.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    floatingCta.style.transform = 'translateY(20px)';
  }

  /* ======================================================
     8. ANNOUNCEMENT BAR – Auto dismiss on scroll far
     ====================================================== */
  const announcementBar = document.getElementById('announcement-bar');
  let announcementDismissed = false;

  window.addEventListener('scroll', () => {
    if (!announcementDismissed && announcementBar && window.scrollY > 200) {
      announcementBar.style.transition = 'all 0.4s ease';
      announcementBar.style.maxHeight = '0';
      announcementBar.style.overflow = 'hidden';
      announcementBar.style.padding = '0';
      announcementDismissed = true;
    }
  }, { passive: true });

  /* ======================================================
     9. HERO – Parallax effect (subtle)
     ====================================================== */
  const heroSection = document.querySelector('.hero');
  const heroBgDeco = document.querySelector('.hero-bg-decoration');

  if (heroSection && heroBgDeco) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      const heroHeight = heroSection.offsetHeight;
      if (scrolled < heroHeight) {
        heroBgDeco.style.transform = `translateY(${scrolled * 0.3}px)`;
      }
    }, { passive: true });
  }

  /* ======================================================
     10. MINI PRODUCT – Click to swap hero image
     ====================================================== */
  const miniProducts = document.querySelectorAll('.mini-product');
  const heroMainImg = document.getElementById('hero-main-img');

  miniProducts.forEach(mini => {
    mini.addEventListener('click', () => {
      if (heroMainImg) {
        heroMainImg.style.opacity = '0';
        heroMainImg.style.transform = 'scale(0.96)';
        setTimeout(() => {
          heroMainImg.src = mini.src;
          heroMainImg.style.opacity = '1';
          heroMainImg.style.transform = 'scale(1)';
        }, 200);
        heroMainImg.style.transition = 'all 0.25s ease';
      }
      miniProducts.forEach(m => m.style.borderColor = '');
      mini.style.borderColor = 'var(--primary)';
    });
  });

  /* ======================================================
     11. COUNTER ANIMATION – Stats in hero
     ====================================================== */
  function animateCounter(el, target, duration = 1600, suffix = '') {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        start = target;
        clearInterval(timer);
      }
      el.textContent = Math.floor(start).toLocaleString('vi-VN') + suffix;
    }, 16);
  }

  const heroSection2 = document.querySelector('.hero-stats');
  let countersStarted = false;

  if (heroSection2) {
    const counterObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !countersStarted) {
        countersStarted = true;
        const statStrongs = document.querySelectorAll('.stat-item strong');
        if (statStrongs[0]) animateCounter(statStrongs[0], 500, 1400, '+');
        if (statStrongs[1]) animateCounter(statStrongs[1], 10000, 1800, '+');
        // 3rd is percentage, just animate text
        if (statStrongs[2]) {
          setTimeout(() => { statStrongs[2].textContent = '100%'; }, 1000);
        }
        counterObserver.disconnect();
      }
    }, { threshold: 0.5 });
    counterObserver.observe(heroSection2);
  }

  /* ======================================================
     12. ACTIVE NAV LINK on scroll
     ====================================================== */
  const sections = document.querySelectorAll('section[id], div[id]');
  const navLinksAll = document.querySelectorAll('.nav-link');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinksAll.forEach(link => {
          link.classList.remove('active-nav');
          if (link.getAttribute('href') === `#${entry.target.id}`) {
            link.classList.add('active-nav');
            link.style.color = 'var(--primary)';
          } else {
            link.style.color = '';
          }
        });
      }
    });
  }, { threshold: 0.4 });

  document.querySelectorAll('#about, #products, #why-us, #testimonials, #order').forEach(sec => {
    sectionObserver.observe(sec);
  });

  /* ======================================================
     13. CSS: Add .spin keyframes dynamically
     ====================================================== */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spin { animation: spin 0.8s linear infinite; }
    .active-nav { color: var(--primary) !important; }
  `;
  document.head.appendChild(style);

  /* ======================================================
     14. IMAGE LAZY LOAD fallback
     ====================================================== */
  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      img.style.background = 'linear-gradient(135deg, #fce4ec, #f8bbd9)';
      img.style.minHeight = '200px';
      img.alt = img.alt || 'Maison Gourmet';
    });
  });

  /* ======================================================
     15. CHATBOT LOGIC
     ====================================================== */
  const chatbotToggle = document.getElementById('chatbot-toggle');
  const chatbotWindow = document.getElementById('chatbot-window');
  const chatbotClose = document.getElementById('chatbot-close');
  const chatbotMessages = document.getElementById('chatbot-messages');
  const chatbotFooter = document.getElementById('chatbot-footer');

  const salesScript = {
    greeting: "Dạ, Maison Gourmet xin chào anh/chị ạ! Anh/chị đang cần tìm bộ quà tặng cao cấp dành cho đối tác hay quà tặng cho nhân viên ạ? Anh/chị cứ nhắn cho em, em xin phép được tư vấn mẫu phù hợp nhất với nhu cầu và ngân sách của bên mình ạ!",
    questions: [
      { q: "Mẫu quà nào tiêu biểu nhất?", a: "Dạ, hiện tại bên em có hai dòng được khách hàng lựa chọn nhiều nhất là hộp **Vạn An** (sang trọng, dành cho đối tác VIP) và hộp **An Quý** (tinh tế, phù hợp cho nhân viên). Anh/chị muốn xem chi tiết mẫu nào, em xin phép gửi ảnh thật để mình tham khảo ạ?" },
      { q: "Giá cả các bộ quà tặng?", a: "Dạ, các mẫu quà nhà em có mức giá từ **648.000đ đến hơn 1.600.000đ** tùy theo thành phần ạ. Hiện bên em đang có ưu đãi cho dòng sản phẩm mới nên giá rất tốt. Anh/chị dự kiến ngân sách khoảng bao nhiêu cho mỗi phần quà để em tư vấn mẫu tối ưu nhất ạ?" },
      { q: "Chiết khấu số lượng lớn?", a: "Dạ, bên em luôn có chính sách ưu đãi cho các đơn hàng số lượng lớn ạ. Cụ thể: từ 10 hộp giảm 10%, từ 50 hộp giảm 20% và trên 100 hộp chiết khấu lên đến 30%. Bên mình đặt số lượng bao nhiêu để em áp dụng mức chiết khấu tốt nhất ạ?" },
      { q: "In logo công ty?", a: "Dạ có ạ. Với các đơn hàng từ 50 hộp trở lên, bên em sẽ hỗ trợ thiết kế và in ấn logo, tên thương hiệu của anh/chị lên bao bì và thiệp chúc mừng hoàn toàn miễn phí để tăng tính chuyên nghiệp ạ." },
      { q: "Thời gian giao hàng?", a: "Dạ, tại Hà Nội bên em hỗ trợ giao nhanh trong vòng 24h. Với các tỉnh thành khác, thời gian giao hàng khoảng từ 2-4 ngày làm việc. Bên em cam kết đóng gói kỹ lưỡng, đảm bảo hộp quà nguyên vẹn khi đến tay anh/chị ạ." },
      { q: "Chất lượng nguyên liệu?", a: "Dạ anh/chị hoàn toàn yên tâm ạ. Các nguyên liệu của bên em đều được nhập khẩu cao cấp từ Pháp, Bỉ... và sản xuất theo quy trình chuẩn ISO/HACCP quốc tế, đảm bảo an toàn vệ sinh thực phẩm và hương vị thơm ngon ạ." },
      { q: "Tùy chỉnh thành phần?", a: "Dạ được ạ. Với các đơn hàng doanh nghiệp, bên em rất sẵn sàng tùy chỉnh thành phần bên trong để phù hợp nhất với ngân sách và sở thích của bên mình. Anh/chị cứ chia sẻ yêu cầu, em sẽ lên phương án combo riêng ạ." },
      { q: "Túi xách và thiệp?", a: "Dạ có đầy đủ ạ. Mỗi bộ quà tặng đều bao gồm: Hộp quà cao cấp, túi xách đồng bộ và thiệp chúc mừng lịch sự. Anh/chị có thể dùng để biếu tặng ngay mà không cần chuẩn bị thêm gì ạ." },
      { q: "Phí vận chuyển?", a: "Dạ, với các đơn hàng từ 20 hộp trở lên, bên em sẽ miễn phí vận chuyển toàn quốc cho mình ạ. Với các đơn hàng lẻ, em sẽ hỗ trợ tìm đơn vị vận chuyển có chi phí tiết kiệm nhất cho anh/chị ạ." },
      { q: "Quà Trung Thu 2026?", a: "Dạ, bên em đang chuẩn bị ra mắt Bộ sưu tập Trung Thu 2026 với nhiều mẫu độc đáo. Nếu anh/chị muốn nhận thông tin sớm và hưởng ưu đãi đặt trước 10%, anh/chị vui lòng để lại lời nhắn 'TRUNG THU' giúp em nhé ạ." }
    ],
    closing: "Dạ, mẫu này hiện đang được rất nhiều khách hàng quan tâm và số lượng có hạn ạ. Anh/chị dự kiến lấy số lượng bao nhiêu để em kịp thời giữ kho và chuẩn bị đơn hàng chu đáo nhất cho mình ạ?",
    formLead: "Dạ không sao ạ, anh/chị cứ dành thêm thời gian cân nhắc kỹ nhé ạ. Nếu anh/chị muốn nhận các chương trình ưu đãi đặc biệt hoặc thông báo khi có Bộ sưu tập mới, anh/chị có thể tham gia danh sách chờ của bên em nhé!"
  };

  let chatStarted = false;

  function addMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg msg-${type}`;
    // Chuyển đổi markdown đơn giản sang HTML (cho in đậm **)
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    msgDiv.innerHTML = formattedText;
    chatbotMessages.appendChild(msgDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  function renderQuickReplies(mode = 'none') {
    chatbotFooter.innerHTML = '';
    chatbotFooter.style.display = 'none';
    
    if (mode === 'closing') {
      chatbotFooter.style.display = 'flex';
      const btnBuy = document.createElement('button');
      btnBuy.className = 'quick-reply-btn';
      btnBuy.innerText = "Em muốn đặt hàng ngay";
      btnBuy.onclick = () => {
        addMessage("Em muốn đặt hàng ngay", "user");
        setTimeout(() => {
          addMessage("Dạ tuyệt quá ạ! Mời anh/chị điền thông tin vào mẫu khảo sát/liên hệ bên dưới để em lên đơn ngay cho mình nhé.", "bot");
          const cta = document.createElement('a');
          cta.href = '#order';
          cta.className = 'chat-cta-btn';
          cta.innerText = "Đi tới Form Đặt hàng";
          cta.onclick = () => chatbotWindow.classList.remove('open');
          chatbotMessages.appendChild(cta);
          chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
          renderQuickReplies('none');
        }, 600);
      };
      
      const btnThink = document.createElement('button');
      btnThink.className = 'quick-reply-btn';
      btnThink.innerText = "Để mình cân nhắc thêm";
      btnThink.onclick = () => {
        addMessage("Để mình cân nhắc thêm", "user");
        setTimeout(() => {
          addMessage(salesScript.formLead, "bot");
          const cta = document.createElement('a');
          cta.href = 'khao-sat-trung-thu.html';
          cta.className = 'chat-cta-btn';
          cta.innerText = "Đăng ký nhận ưu đãi mới";
          chatbotMessages.appendChild(cta);
          chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
          renderQuickReplies('none');
        }, 600);
      };
      
      chatbotFooter.appendChild(btnBuy);
      chatbotFooter.appendChild(btnThink);
    }
  }

  function handleUserAction(index) {
    const item = salesScript.questions[index];
    addMessage(item.q, "user");
    
    // Giả lập bot đang "typing"
    chatbotFooter.innerHTML = '<span style="font-size:0.8rem; color:var(--text-light); padding:8px">Đang trả lời...</span>';
    
    setTimeout(() => {
      addMessage(item.a, "bot");
      setTimeout(() => {
        renderQuickReplies('closing');
      }, 500);
    }, 800);
  }

  if (chatbotToggle) {
    chatbotToggle.addEventListener('click', () => {
      const isOpen = chatbotWindow.classList.toggle('open');
      if (isOpen && !chatStarted) {
        chatStarted = true;
        setTimeout(() => {
          addMessage(salesScript.greeting, "bot");
          renderQuickReplies('questions');
        }, 400);
      }
    });
  }

  if (chatbotClose) {
    chatbotClose.addEventListener('click', () => {
      chatbotWindow.classList.remove('open');
    });
  }

  // Manual Input Handling
  const chatbotInput = document.getElementById('chatbot-input');
  const chatbotSend = document.getElementById('chatbot-send');

  function handleManualInput() {
    const text = chatbotInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    chatbotInput.value = '';

    // Giả lập bot đang suy nghĩ
    chatbotFooter.innerHTML = '<span style="font-size:0.8rem; color:var(--text-light); padding:8px">Đang suy nghĩ...</span>';

    setTimeout(() => {
      // Tìm kiếm từ khóa đơn giản
      const lowerText = text.toLowerCase();
      let bestMatch = null;

      // Danh sách từ khóa và mapping tới câu hỏi trong kịch bản
      const keywordMap = [
        { keywords: ['giá', 'bao nhiêu', 'chi phí', 'tiền'], index: 1 },
        { keywords: ['mẫu', 'loại nào', 'vạn an', 'an quý', 'sản phẩm'], index: 0 },
        { keywords: ['chiết khấu', 'giảm giá', 'số lượng lớn', 'ưu đãi'], index: 2 },
        { keywords: ['in logo', 'thương hiệu', 'bao bì'], index: 3 },
        { keywords: ['giao hàng', 'vận chuyển', 'bao lâu', 'ship'], index: 4 },
        { keywords: ['chất lượng', 'nguyên liệu', 'an toàn', 'iso'], index: 5 },
        { keywords: ['thay đổi', 'tùy chỉnh', 'combo riêng'], index: 6 },
        { keywords: ['túi xách', 'thiệp'], index: 7 },
        { keywords: ['phí ship', 'miễn phí vận chuyển'], index: 8 },
        { keywords: ['trung thu', '2026'], index: 9 }
      ];

      // Ý định đặt hàng trực tiếp
      const buyKeywords = ['đặt hàng', 'mua', 'lấy', 'order', 'chốt'];
      const isBuyIntent = buyKeywords.some(kw => lowerText.includes(kw));

      for (const entry of keywordMap) {
        if (entry.keywords.some(kw => lowerText.includes(kw))) {
          bestMatch = salesScript.questions[entry.index];
          break;
        }
      }

      if (bestMatch) {
        addMessage(bestMatch.a, "bot");
        setTimeout(() => renderQuickReplies('closing'), 500);
      } else if (isBuyIntent) {
        addMessage(salesScript.closing, "bot");
        setTimeout(() => renderQuickReplies('closing'), 500);
      } else {
        addMessage("Dạ, Maison Assistant chưa hiểu ý mình lắm ạ. Anh/chị có thể mô tả kỹ hơn nhu cầu (mẫu quà, số lượng, ngân sách...) để em tư vấn tốt nhất không ạ?", "bot");
      }
    }, 1000);
  }

  if (chatbotSend) {
    chatbotSend.addEventListener('click', handleManualInput);
  }

  if (chatbotInput) {
    chatbotInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleManualInput();
    });
  }

  // Đóng chat khi click ra ngoài (tùy chọn)
  document.addEventListener('mousedown', (e) => {
    if (chatbotWindow.classList.contains('open') && 
        !chatbotWindow.contains(e.target) && 
        !chatbotToggle.contains(e.target)) {
      chatbotWindow.classList.remove('open');
    }
  });

  console.log('🎁 Maison Gourmet Landing Page & Sales Chatbot loaded successfully!');
});
