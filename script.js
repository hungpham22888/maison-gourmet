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
     15. CHATBOT 'BRAIN' UPGRADE (Intent-based NLP)
     ====================================================== */
  const chatbotToggle = document.getElementById('chatbot-toggle');
  const chatbotWindow = document.getElementById('chatbot-window');
  const chatbotClose = document.getElementById('chatbot-close');
  const chatbotMessages = document.getElementById('chatbot-messages');
  const chatbotFooter = document.getElementById('chatbot-footer');
  const chatbotInput = document.getElementById('chatbot-input');
  const chatbotSend = document.getElementById('chatbot-send');

  // 15.1. KNOWLEDGE BASE & INTENT MAPPING
  const chatbotBrain = {
    intents: [
      {
        id: 'GREETING',
        keywords: ['chào', 'hi', 'hello', 'alo', 'ê', 'hey', 'start', 'bắt đầu'],
        responses: ["Dạ, Maison Gourmet em xin chào Anh/Chị ạ! Em rất hân hạnh được hỗ trợ mình tìm kiếm Bộ quà tặng Tết 2026 hoàn hảo nhất ạ."]
      },
      {
        id: 'PRICE_GENERAL',
        keywords: ['giá', 'bao nhiêu', 'tiền', 'nhiêu', 'báo giá', 'chi phí', 'ngân sách', 'tầm tiền'],
        responses: ["Dạ, các bộ quà tặng cao cấp nhà Maison Gourmet có mức giá niêm yết linh hoạt từ **560.000đ đến hơn 1.800.000đ** ạ. Nếu Anh/Chị đặt số lượng lớn cho doanh nghiệp, em xin phép được áp dụng chiết khấu ưu đãi lên đến **30%** ạ."]
      },
      {
        id: 'PRODUCT_SANG_VIP',
        keywords: ['vạn an', 'vip', 'sang nhất', 'đắt nhất', 'cao cấp nhất', 'đối tác lớn', '1800', '1.800'],
        responses: ["Dạ, để biếu đối tác VIP thì mẫu **Vạn An (1.800.000đ)** là lựa chọn đẳng cấp nhất ạ. Hộp quà mang vẻ đẹp sang trọng kỳ vĩ, đi kèm là chai vang Ý Terre Forti tuyệt hảo, chắc chắn sẽ tạo ấn tượng mạnh mẽ với người nhận ạ."]
      },
      {
        id: 'PRODUCT_ECONOMY',
        keywords: ['gia quý', 'rẻ nhất', 'thấp nhất', 'bình dân', '560', '560.000'],
        responses: ["Dạ, nếu mình cần mẫu quà tinh tế với mức giá tối ưu nhất, em xin phép giới thiệu hộp **Gia Quý (560.000đ)** ạ. Dù giá phải chăng nhưng mẫu này vẫn rất được lòng khách hàng nhờ thiết kế chỉn chu và đầy đủ trà bánh ạ."]
      },
      {
        id: 'PRODUCT_POPULAR',
        keywords: ['an quý', 'duyên hòa', 'tài lộc', 'ngọc quý', 'vinh hoa', 'phổ biến', 'nhiều người mua'],
        responses: ["Dạ, các dòng như **An Quý** (720k) hay **Tài Lộc** (950k) hiện đang là những mẫu 'bán chạy' nhất vì sự cân bằng giữa chất lượng và giá thành ạ. Anh/Chị có muốn em gửi ảnh chi tiết các mẫu này cho mình xem không ạ?"]
      },
      {
        id: 'SERVICE_LOGO',
        keywords: ['in logo', 'thương hiệu', 'khắc tên', 'lên hộp', 'miễn phí in', 'thiết kế riêng'],
        responses: ["Dạ có ạ! Với các đơn hàng từ **50 hộp trở lên**, Maison Gourmet xin phép hỗ trợ thiết kế và in ấn logo doanh nghiệp hoàn toàn **miễn phí** lên bao bì và thiệp chúc mừng để tăng tính nhận diện thương hiệu cho bên mình ạ."]
      },
      {
        id: 'SERVICE_DISCOUNT',
        keywords: ['chiết khấu', 'giảm giá', 'ưu đãi', 'giảm thêm', 'mua nhiều', 'số lượng lớn', '30%'],
        responses: ["Dạ, bên em luôn có chính sách chiết khấu rất tốt cho doanh nghiệp ạ: đạt mốc từ 10% đến **30%** tùy theo số lượng đơn hàng ạ. Anh/Chị dự kiến đặt khoảng bao nhiêu bộ để em xin phép báo mức giá tốt nhất cho mình ạ?"]
      },
      {
        id: 'QUALITY_TRUST',
        keywords: ['uy tín', 'chất lượng', 'an toàn', 'iso', 'haccp', 'golden gate', 'nguồn gốc', 'vệ sinh'],
        responses: ["Dạ, Anh/Chị hoàn toàn có thể yên tâm ạ. Maison Gourmet là thương hiệu thuộc tập đoàn **Golden Gate Group**, mọi sản phẩm đều đạt chứng chỉ quốc tế **ISO 22000 & HACCP**. Bên em đã phục vụ hơn 3000 doanh nghiệp lớn nên uy tín luôn là ưu tiên hàng đầu ạ."]
      },
      {
        id: 'LOGISTICS',
        keywords: ['giao hàng', 'vận chuyển', 'ship', 'bao lâu', 'hà nội', 'tỉnh xa', 'phí ship'],
        responses: ["Dạ, khu vực Hà Nội bên em giao nhanh trong **24h** ạ. Với các đơn hàng từ 20 hộp trở lên, Maison Gourmet xin phép **miễn phí vận chuyển** toàn quốc cho mình ạ. Bên em có quy trình đóng gói 3 lớp cực kỳ chắc chắn nên ship tỉnh thoải mái ạ."]
      },
      {
        id: 'LOCATION',
        keywords: ['địa chỉ', 'đâu', 'ở đâu', 'xem mẫu', 'trực tiếp', 'trường chinh', 'văn phòng', 'showroom'],
        responses: ["Dạ, em mời Anh/Chị ghé qua văn phòng trưng bày mẫu của bên em tại **315 Trường Chinh, Khương Mai, Thanh Xuân, Hà Nội** để xem và trải nghiệm sản phẩm trực tiếp ạ. Bên em luôn sẵn sàng đón tiếp mình ạ."]
      },
      {
        id: 'ORDER_INTENT',
        keywords: ['đặt hàng', 'mua', 'lấy', 'chốt đơn', 'order', 'thủ tục', 'thanh toán'],
        responses: ["Dạ tuyệt vời quá ạ! Để hỗ trợ Anh/Chị lên đơn hàng nhanh nhất, Anh/Chị có thể để lại số điện thoại hoặc nhắn em số lượng cụ thể, nhân viên của bên em sẽ gọi lại hỗ trợ Anh/Chị ngay lập tức ạ."]
      },
      {
        id: 'SMALL_TALK_GOOD',
        keywords: ['tốt', 'hay', 'đẹp', 'cảm ơn', 'thanks', 'ok', 'hiểu rồi', 'giỏi'],
        responses: ["Dạ, em rất vui khi giúp ích được cho Anh/Chị ạ! Nếu mình cần thêm bất kỳ thông tin nào khác, Anh/Chị cứ nhắn em nhé ạ."]
      }
    ],
    fallback: "Dạ, em xin phép được lắng nghe kỹ hơn yêu cầu của Anh/Chị ạ. Hiện Maison Gourmet đang có ưu đãi chiết khấu 30% và hỗ trợ in logo miễn phí cho các mẫu quà Tết 2026 cao cấp. Không biết Anh/Chị cần em tư vấn thêm về mẫu quà, bảng giá hay chính sách vận chuyển ạ?"
  };

  // 15.2. BRAIN HELPERS
  function normalizeText(text) {
    return text.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")      // Remove punctuation
      .trim();
  }

  function getBotResponse(userText) {
    const normalized = normalizeText(userText);
    let matchedIntents = [];

    chatbotBrain.intents.forEach(intent => {
      if (intent.keywords.some(kw => normalized.includes(normalizeText(kw)))) {
        matchedIntents.push(intent);
      }
    });

    if (matchedIntents.length > 0) {
      // Pick first matching intent response (could be improved to combine)
      let response = matchedIntents[0].responses[0];
      // If multiple intents, try to bridge them (limited logic here for simplicity)
      if (matchedIntents.length > 1) {
        // Simple logic to add another part if relevant
        // response += " Ngoài ra, " + matchedIntents[1].responses[0].replace(/^Dạ, /, "");
      }
      return response;
    }

    // Special check for combined questions (e.g., price AND logo)
    const hasPrice = normalized.includes('gia') || normalized.includes('bao nhieu');
    const hasLogo = normalized.includes('logo') || normalized.includes('in');
    
    if (hasPrice && hasLogo) {
      return "Dạ, về giá cả thì các mẫu quà bên em dao động từ 560k đến 1.8M ạ. Đặc biệt, với đơn từ 50 hộp, bên em sẽ xin phép hỗ trợ in logo doanh nghiệp hoàn toàn miễn phí cho Anh/Chị luôn ạ!";
    }

    return chatbotBrain.fallback;
  }

  // 15.3. CHAT UI LOGIC
  let chatStarted = false;

  function addMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg msg-${type}`;
    // Simple markdown formatting for bold **
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    msgDiv.innerHTML = formattedText;
    chatbotMessages.appendChild(msgDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  function showBotTyping(show = true) {
    if (show) {
      chatbotFooter.innerHTML = '<span class="typing-indicator" style="font-size:0.8rem; color:var(--text-light); padding:8px">Maison Assistant đang suy nghĩ...</span>';
      chatbotFooter.style.display = 'block';
    } else {
      chatbotFooter.innerHTML = '';
      chatbotFooter.style.display = 'none';
    }
  }

  function handleManualInput() {
    const text = chatbotInput.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    chatbotInput.value = '';
    showBotTyping(true);

    setTimeout(() => {
      showBotTyping(false);
      const botResponse = getBotResponse(text);
      addMessage(botResponse, "bot");
      
      // Auto-suggest CTA if relevant
      if (text.toLowerCase().includes('dat hang') || text.toLowerCase().includes('mua')) {
        setTimeout(() => {
          const cta = document.createElement('a');
          cta.href = '#order';
          cta.className = 'chat-cta-btn';
          cta.innerText = "Đi tới Form Đặt hàng";
          cta.onclick = () => chatbotWindow.classList.remove('open');
          chatbotMessages.appendChild(cta);
          chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        }, 500);
      }
    }, 1000);
  }

  if (chatbotToggle) {
     chatbotToggle.addEventListener('click', () => {
      const isOpen = chatbotWindow.classList.toggle('open');
      if (isOpen && !chatStarted) {
        chatStarted = true;
        showBotTyping(true);
        setTimeout(() => {
          showBotTyping(false);
          addMessage("Dạ, Maison Gourmet em xin kính chào Anh/Chị ạ! Rất vui được đón tiếp mình. Không biết Anh/Chị đang quan tâm đến các mẫu quà Tết cao cấp hay cần em hỗ trợ tư vấn về chính sách cho doanh nghiệp ạ?", "bot");
        }, 800);
      }
    });
  }

  if (chatbotClose) {
    chatbotClose.addEventListener('click', () => {
      chatbotWindow.classList.remove('open');
    });
  }

  if (chatbotSend) {
    chatbotSend.addEventListener('click', handleManualInput);
  }

  if (chatbotInput) {
    chatbotInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleManualInput();
    });
  }

  // Handle outside click to close
  document.addEventListener('mousedown', (e) => {
    if (chatbotWindow && chatbotWindow.classList.contains('open') && 
        !chatbotWindow.contains(e.target) && 
        !chatbotToggle.contains(e.target)) {
      chatbotWindow.classList.remove('open');
    }
  });

  console.log('🎁 Maison Gourmet Smart Chatbot Engine Ready!');
});
