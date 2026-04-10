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

  // 15.1. KNOWLEDGE BASE & INTENT MAPPING (Ưu tiên ý định đặc thù trước)
  const chatbotBrain = {
    intents: [
      {
        id: 'FAQ_1',
        keywords: ['vừa phải', 'sang trọng', 'thấp nhất', 'gia quý', 'phổ thông', '560', 'giá thấp'],
        responses: ["Dạ có ạ, Anh/Chị có thể tham khảo mẫu hộp **Gia Quý** (giá 560.000đ). Mặc dù là dòng phổ thông nhưng bao bì vẫn được thiết kế rất chỉn chu, đầy đủ các thành phần trà, bánh và nước quả, rất phù hợp để làm quà tặng số lượng lớn ạ."]
      },
      {
        id: 'FAQ_2',
        keywords: ['an quý', 'khác biệt', '720', 'ăn quý', 'so sánh'],
        responses: ["Dạ, hộp An Quý (giá 720.000đ) sẽ có thành phần cao cấp hơn một chút với các loại bánh quy đặc sản và trà Shan Tuyết cổ thụ ạ. Nếu Anh/Chị dự định tặng cấp quản lý hoặc đối tác thân thiết thì mẫu An Quý sẽ mang tính trang trọng hơn ạ."]
      },
      {
        id: 'FAQ_3',
        keywords: ['đẳng cấp nhất', 'vạn an', '1800', '1.800', 'vip', 'doanh nghiệp lớn', 'biếu đối tác'],
        responses: ["Dạ, Anh/Chị nên lựa chọn mẫu **Vạn An** (giá 1.800.000đ) ạ. Đây là dòng sản phẩm cao cấp nhất của bên em, đi kèm với vang Ý Terre Forti hảo hạng và thiết kế hộp quà vô cùng đẳng cấp, chắc chắn sẽ làm hài lòng các đối tác quan trọng của bên mình ạ."]
      },
      {
        id: 'FAQ_4',
        keywords: ['tài lộc', 'rượu mơ', 'haruka', 'nồng độ'],
        responses: ["Dạ, trong hộp Tài Lộc bên em sử dụng rượu mơ Haruka 500ml ạ. Loại rượu này có nồng độ vừa phải, hương vị thơm nhẹ, rất dễ dùng cho cả nam và nữ nên được rất nhiều khách hàng lựa chọn để biếu tặng gia đình ạ."]
      },
      {
        id: 'FAQ_5',
        keywords: ['giá chính xác', 'niêm yết', 'website không khớp', 'thực tế'],
        responses: ["Dạ, mức giá trên website là giá niêm yết chưa bao gồm ưu đãi ạ. Nếu Anh/Chị đặt hàng sớm hoặc đặt số lượng lớn, em xin phép được áp dụng chính sách chiết khấu tốt nhất dành riêng cho bên mình ạ. Không biết dự kiến bên mình sẽ lấy khoảng bao nhiêu hộp ạ?"]
      },
      {
        id: 'FAQ_6',
        keywords: ['vinh hoa', 'botte', '750ml', 'vang ý'],
        responses: ["Dạ, hộp Vinh Hoa nổi bật với sự kết hợp của vang Ý Botte 750ml và các loại bánh trái cao cấp ạ. Thiết kế của dòng này mang phong cách chuyên nghiệp, rất được các quý doanh nghiệp ưa chuộng để làm quà tặng đối tác trong các dịp Lễ Tết ạ."]
      },
      {
        id: 'FAQ_7',
        keywords: ['bánh quy', 'thủ công', 'bơ pháp', 'giòn tan'],
        responses: ["Dạ, bánh quy bên em là dòng bánh thủ công cao cấp được làm từ nguyên liệu tuyển chọn ạ. Bánh có độ giòn tan, vị ngọt thanh tự nhiên và hương thơm đặc trưng của bơ Pháp, nên được rất nhiều khách hàng cũ phản hồi rất tốt ạ."]
      },
      {
        id: 'FAQ_8',
        keywords: ['uy tín', 'golden gate', 'tập đoàn', 'thương hiệu'],
        responses: ["Dạ, Maison Gourmet là thương hiệu quà tặng trực thuộc tập đoàn F&B hàng đầu **Golden Gate Group** ạ. Với bề dày kinh nghiệm và uy tín từ tập đoàn mẹ, bên em luôn cam kết mang đến những sản phẩm và dịch vụ chuyên nghiệp nhất cho Anh/Chị ạ."]
      },
      {
        id: 'FAQ_9',
        keywords: ['chứng chỉ', 'haccp', 'iso 22000', 'an toàn', 'vệ sinh', 'nguồn gốc'],
        responses: ["Dạ có ạ, toàn bộ quy trình sản xuất và đóng gói của Maison Gourmet đều đạt tiêu chuẩn quốc tế **HACCP** và **ISO 22000** ạ. Anh/Chị hoàn toàn có thể yên tâm về chất lượng và độ an toàn vệ sinh thực phẩm khi biếu tặng ạ."]
      },
      {
        id: 'FAQ_10',
        keywords: ['doanh nghiệp lớn', 'liệt kê', 'vingroup', 'fpt', 'viettel', 'techcombank'],
        responses: ["Dạ, Maison Gourmet đã có cơ hội phục vụ hơn 3.000 doanh nghiệp lớn nhỏ ạ. Trong đó có thể kể đến các đối tác thân thiết như Vingroup, FPT, Viettel, Techcombank, Masan... và nhiều tập đoàn lớn khác ạ."]
      },
      {
        id: 'FAQ_11',
        keywords: ['hóa đơn', 'vat', 'chứng từ', 'hợp đồng', 'thanh toán doanh nghiệp'],
        responses: ["Dạ có ạ. Bên em hỗ trợ xuất hóa đơn VAT và cung cấp đầy đủ các giấy tờ, hợp đồng liên quan cho quý doanh nghiệp để thuận tiện cho quá trình thanh toán ạ."]
      },
      {
        id: 'FAQ_12',
        keywords: ['bao lâu', 'thời gian', 'hoàn thiện', 'in logo mất bao lâu'],
        responses: ["Dạ, thông thường quy trình in ấn sẽ mất khoảng từ 3 đến 5 ngày làm việc ạ. Tuy nhiên, nếu Anh/Chị đang cần gấp cho sự kiện, xin hãy nhắn em để em xin phép báo bộ phận sản xuất ưu tiên xử lý sớm nhất cho bên mình ạ."]
      },
      {
        id: 'FAQ_13',
        keywords: ['chi phí in', 'miễn phí in', '50 hộp', 'logo phí'],
        responses: ["Dạ, với các đơn hàng từ 50 hộp trở lên, Maison Gourmet xin phép được **miễn phí hoàn toàn** chi phí thiết kế và in ấn logo lên hộp quà cho bên mình ạ. Với số lượng ít hơn, em sẽ báo mức phí hỗ trợ tối ưu nhất cho Anh/Chị ạ."]
      },
      {
        id: 'FAQ_14',
        keywords: ['thay đổi thành phần', 'yêu cầu riêng', 'tùy chỉnh', 'combo riêng'],
        responses: ["Dạ có ạ. Để phù hợp nhất với ngân sách và sở thích của bên mình, em xin phép được tư vấn và hỗ trợ phối lại các combo thành phần riêng biệt dành cho đơn hàng doanh nghiệp ạ."]
      },
      {
        id: 'FAQ_15',
        keywords: ['thiệp', 'lời chúc', 'đi kèm'],
        responses: ["Dạ có ạ. Mỗi bộ quà tặng đều bao gồm thiệp chúc mừng thiết kế trang trọng và đồng bộ ạ. Nếu Anh/Chị có nội dung lời chúc riêng, em xin phép được hỗ trợ in thiệp cho bên mình luôn ạ."]
      },
      {
        id: 'FAQ_16',
        keywords: ['giao hàng nhanh', 'trong ngày', '24h', 'nội thành'],
        responses: ["Dạ, với khu vực nội thành Hà Nội, bên em xin phép hỗ trợ giao hàng nhanh trong vòng 24h ạ. Anh/Chị chỉ cần chốt mẫu, mọi khâu giao nhận em sẽ lo chu đáo ạ."]
      },
      {
        id: 'FAQ_17',
        keywords: ['phí vận chuyển', 'ship đi tỉnh', 'miễn phí vận chuyển', '20 hộp'],
        responses: ["Dạ, Maison Gourmet xin phép **miễn phí vận chuyển** toàn quốc cho các đơn hàng quà tặng từ 20 hộp trở lên ạ. Với các đơn lẻ, em sẽ xin phép báo mức phí hỗ trợ nhất cho Anh/Chị tùy theo khu vực ạ."]
      },
      {
        id: 'FAQ_18',
        keywords: ['móp méo', 'đóng gói', '3 lớp', 'bi xa', 'an toàn vận chuyển'],
        responses: ["Dạ có ạ. Với các đơn hàng đi tỉnh, bên em sử dụng quy trình đóng gói 3 lớp chuyên dụng cho quà tặng cao cấp, đảm bảo hộp quà đến tay Anh/Chị vẫn giữ được vẻ đẹp hoàn hảo ạ."]
      },
      {
        id: 'FAQ_19',
        keywords: ['đổi trả', 'hỏng hóc', 'lỗi sản xuất', 'đổi mới'],
        responses: ["Dạ, nếu có bất kỳ vấn đề gì về lỗi sản xuất hoặc hỏng hóc do vận chuyển, bên em cam kết sẽ **đổi mới 100%** sản phẩm cho Anh/Chị ngay lập tức ạ. Sự hài lòng của Anh/Chị là ưu tiên hàng đầu của bên em ạ."]
      },
      {
        id: 'FAQ_20',
        keywords: ['thanh toán sau', 'nhận hàng', 'cod', 'kiểm tra sản phẩm'],
        responses: ["Dạ được ạ. Đối với khách cá nhân, Anh/Chị hoàn toàn có thể kiểm tra sản phẩm và thanh toán cho nhân viên giao hàng ạ. Với khách doanh nghiệp, bên em sẽ thực hiện theo quy trình tạm ứng và thanh toán linh hoạt trong hợp đồng ạ."]
      },
      {
        id: 'FAQ_21',
        keywords: ['chiết khấu tối đa', '30%', 'giảm giá nhiều nhất'],
        responses: ["Dạ, tùy vào số lượng đơn hàng mà bên em có chính sách chiết khấu rất linh hoạt, có thể lên đến **30%** ạ. Anh/Chị vui lòng cho em biết số lượng dự kiến để em xin phép gửi bảng báo giá tốt nhất cho bên mình ạ."]
      },
      {
        id: 'FAQ_22',
        keywords: ['hibiscus', ' vitamin', 'nước quả', 'vị'],
        responses: ["Dạ, nước quả Hibiscus là sản phẩm đặc trưng của Maison Gourmet, có vị chua ngọt thanh mát và rất giàu vitamin ạ. Đây không chỉ là thức uống ngon mà còn rất tốt cho sức khỏe, mang lại nét độc đáo cho món quà của bên mình ạ."]
      },
      {
        id: 'FAQ_23',
        keywords: ['showroom', 'địa chỉ', 'trực tiếp', 'trường chinh'],
        responses: ["Dạ, em mời Anh/Chị ghé qua địa chỉ văn phòng trưng bày của bên em tại: **315 Trường Chinh, Khương Mai, Thanh Xuân, Hà Nội** ạ. Em rất hân hạnh được đón tiếp Anh/Chị ạ."]
      },
      {
        id: 'FAQ_24',
        keywords: ['ngọc quý', 'không có rượu', '1.100', '1.100.000'],
        responses: ["Dạ, Ngọc Quý (giá 1.100.000đ) tập trung vào các dòng bánh quy đặc biệt và hồng trà cổ thụ, không bao gồm rượu ạ. Đây là lựa chọn lý tưởng nếu Anh/Chị muốn một set quà thanh lịch, nhẹ nhàng mà vẫn rất đẳng cấp ạ."]
      },
      {
        id: 'FAQ_25',
        keywords: ['viết tay', 'chân thành'],
        responses: ["Dạ có ạ, nếu Anh/Chị có yêu cầu đặc biệt muốn viết tay để tăng sự chân thành, em rất sẵn lòng hỗ trợ Anh/Chị ạ."]
      },
      {
        id: 'FAQ_26',
        keywords: ['bán lẻ', 'dùng thử', 'trải nghiệm'],
        responses: ["Dạ có ạ. Anh/Chị có thể đặt mua lẻ các loại trà, bánh hoặc nước quả để trải nghiệm chất lượng trước khi quyết định đặt số lượng lớn ạ."]
      },
      {
        id: 'FAQ_27',
        keywords: ['người lớn tuổi', 'ông bà', 'cha mẹ', 'trà và hạt'],
        responses: ["Dạ, Anh/Chị có thể tham khảo hộp **An Quý** hoặc **Ngọc Quý** ạ. Hai dòng này tập trung nhiều vào trà Shan Tuyết cổ thụ và các loại hạt dinh dưỡng, rất phù hợp và ý nghĩa để tặng ông bà, cha mẹ ạ."]
      },
      {
        id: 'FAQ_28',
        keywords: ['sếp nữ', 'dương hòa', 'trang nhã', 'mộc mạc'],
        responses: ["Dạ, Anh/Chị có thể cân nhắc hộp **Dương Hòa** hoặc **Ngọc Quý** ạ. Hai mẫu này có thiết kế rất trang nhã, mộc mạc và thành phần bánh trái ngọt thanh, chắc chắn sẽ tạo được ấn tượng tốt đẹp với sếp ạ."]
      },
      {
        id: 'FAQ_29',
        keywords: ['catalogue', 'zalo', 'năm mới 2026'],
        responses: ["Dạ đã có bản mềm rồi ạ. Anh/Chị vui lòng để lại thông tin hoặc số zalo, em xin phép gửi catalogue chi tiết và các chương trình ưu đãi mới nhất cho bên mình tham khảo ạ."]
      },
      {
        id: 'FAQ_30',
        keywords: ['tại sao', 'khác biệt', 'tận tâm', 'chọn maison'],
        responses: ["Dạ, Maison Gourmet không chỉ cam kết về chất lượng sản phẩm đạt chuẩn quốc tế mà còn luôn chú trọng vào trải nghiệm dịch vụ tận tâm ạ. Với sự bảo trợ từ **Golden Gate Group**, bên em tự tin có thể đáp ứng tốt mọi yêu cầu khắt khe nhất của Anh/Chị về quà tặng cao cấp ạ."]
      },
      {
        id: 'GREETING',
        keywords: ['chào', 'hi', 'hello', 'hey', 'start', 'bắt đầu'],
        responses: ["Dạ, Maison Gourmet em xin chào Anh/Chị ạ! Anh/Chị đang quan tâm đến mẫu quà tặng dành cho đối tác hay quà tặng nhân viên để em xin phép được hỗ trợ tư vấn cho mình ạ?"]
      },
      {
        id: 'ORDER_INTENT',
        keywords: ['đặt hàng', 'mua', 'lấy', 'chốt đơn', 'xác nhận'],
        responses: ["Dạ vâng, với những yêu cầu của Anh/Chị thì mẫu em vừa tư vấn là vô cùng phù hợp ạ. Em xin phép được xác nhận lại số lượng để chuẩn bị đơn hàng cho bên mình một cách chu đáo nhất nhé ạ?"]
      },
      {
        id: 'LEAD_FORM',
        keywords: ['suy nghĩ thêm', 'chưa sẵn sàng', 'đăng ký', 'form'],
        responses: ["Dạ không sao đâu ạ, Anh/Chị cứ thong thả cân nhắc thêm nhé ạ. Nếu Anh/Chị muốn nhận thêm các mẫu thiết kế mới hoặc catalogue cập nhật nhất, Anh/Chị có thể điền thông tin tại đây để em xin phép được hỗ trợ gửi mình sớm nhất ạ."]
      }
    ],
    fallback: "Dạ, hiện em chỉ hỗ trợ giải đáp các thắc mắc trong bộ 30 câu hỏi về sản phẩm, bảng giá và chính sách quà tặng Tết 2026 ạ. Không biết Anh/Chị đang cần tìm hiểu về mẫu quà nào hay chính sách in logo cho doanh nghiệp ạ?"
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
    
    // 🔍 1. KIỂM TRA ĐẶC BIỆT CHO TRƯỜNG HỢP GỘP (SOP BƯỚC 5: GIÁ + LOGO)
    const hasPrice = /\b(gia|bao nhieu|tien)\b/i.test(normalized);
    const hasLogo = /\b(logo|in)\b/i.test(normalized);
    const hasDiscount = /\b(chiet khau|giam gia|uu dai)\b/i.test(normalized);

    if (hasPrice && hasLogo) {
      return "Dạ, về giá cả thì các mẫu quà bên em dao động từ **560k đến 1.8M** ạ. Đặc biệt, với các đơn hàng doanh nghiệp từ 50 hộp, bên em sẽ xin phép hỗ trợ **in logo thương hiệu hoàn toàn miễn phí** cho mình luôn ạ!";
    }
    
    if (hasLogo && hasDiscount) {
      return "Dạ, bên em có chính sách **chiết khấu lên đến 30%** cho số lượng lớn và vẫn hỗ trợ **in logo doanh nghiệp miễn phí** (cho đơn từ 50 hộp) Anh/Chị nhé ạ. Anh/Chị dự kiến đặt số lượng bao nhiêu để em báo mức ưu đãi tốt nhất ạ?";
    }

    // 🔍 2. THU THẬP TẤT CẢ Ý ĐỊNH KHỚP
    let matchedIntents = [];
    for (const intent of chatbotBrain.intents) {
      if (intent.keywords.some(kw => {
        const normalizedKw = normalizeText(kw);
        const regex = new RegExp(`\\b${normalizedKw}\\b`, 'i');
        return regex.test(normalized);
      })) {
        matchedIntents.push(intent);
      }
    }

    if (matchedIntents.length > 0) {
      // Nếu có nhiều hơn 1 ý định, loại bỏ các ý định phụ như Chào hỏi/Xã giao để tập trung nội dung chính
      if (matchedIntents.length > 1) {
        const filtered = matchedIntents.filter(i => i.id !== 'GREETING' && i.id !== 'SMALL_TALK_GOOD');
        if (filtered.length > 0) matchedIntents = filtered;
      }

      if (matchedIntents.length === 1) {
        return matchedIntents[0].responses[0];
      }

      // Lắp ghép câu trả lời đa ý định (Synthesis)
      let combinedResponse = matchedIntents[0].responses[0];
      for (let i = 1; i < matchedIntents.length; i++) {
        // Loại bỏ phần chào "Dạ," ở các câu sau để nối cho tự nhiên
        let part = matchedIntents[i].responses[0].replace(/^Dạ, /, "");
        // Viết thường chữ cái đầu của phần nối
        part = part.charAt(0).toLowerCase() + part.slice(1);
        combinedResponse += " Ngoài ra, " + part;
      }
      return combinedResponse;
    }

    // 🔍 3. FALLBACK KHÔNG BIẾT Ý ĐỊNH
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
