/**
 * CubeVerse – cart.js  (v2 – tương thích index.html + 3x3.html)
 * Giỏ hàng sidebar với localStorage (giữ dữ liệu khi chuyển trang)
 * Cách dùng: <script src="cart.js"></script> ở cuối <body> mọi trang
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
     1.  STORAGE HELPERS
  ───────────────────────────────────────── */
  var STORAGE_KEY = 'cubeverse_cart';

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }

  /* ─────────────────────────────────────────
     2.  EXTRACT PRODUCT INFO FROM CARD DOM
  ───────────────────────────────────────── */
  function getProductFromButton(btn) {
    // Leo lên tìm .product-card hoặc .product-thumb
    var card = btn.closest('.product-card') || btn.closest('[class*="product"]');

    var name  = 'Sản phẩm';
    var price = 0;
    var img   = '';
    var id    = '';

    if (card) {
      var nameEl  = card.querySelector('.product-name');
      var priceEl = card.querySelector('.product-price');
      var imgEl   = card.querySelector('.product-img, img');

      if (nameEl)  name  = nameEl.textContent.trim();
      if (priceEl) price = parsePrice(priceEl.textContent);
      if (imgEl)   img   = imgEl.getAttribute('src') || '';

      // ID = tên sản phẩm dạng slug
      id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    return { id: id, name: name, price: price, img: img };
  }

  function parsePrice(str) {
    // "1.290.000₫" → 1290000
    return parseInt(str.replace(/[^0-9]/g, ''), 10) || 0;
  }

  function formatPrice(num) {
    return num.toLocaleString('vi-VN') + '₫';
  }

  /* ─────────────────────────────────────────
     3.  CART LOGIC
  ───────────────────────────────────────── */
  function addItem(product) {
    var cart = loadCart();
    var existing = cart.find(function (i) { return i.id === product.id; });
    if (existing) {
      existing.qty += (product.qty || 1);
    } else {
      cart.push({
        id:    product.id,
        name:  product.name,
        price: product.price,
        img:   product.img,
        qty:   product.qty || 1
      });
    }
    saveCart(cart);
    return cart;
  }

  function removeItem(id) {
    var cart = loadCart().filter(function (i) { return i.id !== id; });
    saveCart(cart);
    return cart;
  }

  function updateQty(id, qty) {
    var cart = loadCart();
    var item = cart.find(function (i) { return i.id === id; });
    if (item) {
      item.qty = Math.max(1, parseInt(qty, 10) || 1);
    }
    saveCart(cart);
    return cart;
  }

  function totalItems(cart) {
    return cart.reduce(function (s, i) { return s + i.qty; }, 0);
  }

  function totalPrice(cart) {
    return cart.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
  }

  /* ─────────────────────────────────────────
     4.  INJECT SIDEBAR + OVERLAY HTML
  ───────────────────────────────────────── */
  function injectHTML() {
    var html = [
      /* Overlay mờ */
      '<div id="cv-cart-overlay"></div>',

      /* Sidebar */
      '<div id="cv-cart-sidebar" aria-label="Giỏ hàng">',

      /* Header */
      '  <div class="cv-cart-header">',
      '    <div class="cv-cart-title">',
      '      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>',
      '        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
      '      </svg>',
      '      Giỏ Hàng',
      '      <span id="cv-header-count" class="cv-header-badge">0</span>',
      '    </div>',
      '    <button id="cv-cart-close" aria-label="Đóng giỏ hàng">',
      '      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">',
      '        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      '      </svg>',
      '    </button>',
      '  </div>',

      /* Body */
      '  <div class="cv-cart-body" id="cv-cart-body">',
      '    <div class="cv-cart-empty" id="cv-cart-empty">',
      '      <div class="cv-empty-icon">🛒</div>',
      '      <div class="cv-empty-text">Giỏ hàng trống</div>',
      '      <div class="cv-empty-sub">Hãy thêm sản phẩm yêu thích của bạn!</div>',
      '    </div>',
      '    <div id="cv-cart-items"></div>',
      '  </div>',

      /* Footer */
      '  <div class="cv-cart-footer" id="cv-cart-footer">',
      '    <div class="cv-cart-shipping">🚀 Free ship cho đơn từ <strong>300.000₫</strong></div>',
      '    <div class="cv-cart-subtotal">',
      '      <span>Tạm tính</span>',
      '      <span id="cv-cart-subtotal-val">0₫</span>',
      '    </div>',
      '    <div class="cv-cart-total">',
      '      <span>Tổng cộng</span>',
      '      <span id="cv-cart-total-val">0₫</span>',
      '    </div>',
      '    <button class="cv-checkout-btn" id="cv-checkout-btn">',
      '      Thanh Toán →',
      '    </button>',
      '    <button class="cv-continue-btn" id="cv-cart-continue">Tiếp tục mua sắm</button>',
      '  </div>',

      '</div>',

      /* Toast thêm vào giỏ */
      '<div id="cv-add-toast">',
      '  <span class="cv-add-toast-icon">✓</span>',
      '  <span id="cv-add-toast-msg">Đã thêm vào giỏ hàng!</span>',
      '</div>',
    ].join('\n');

    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap);
  }

  /* ─────────────────────────────────────────
     5.  INJECT CSS
  ───────────────────────────────────────── */
  function injectCSS() {
    var css = [
      /* ── Overlay ── */
      '#cv-cart-overlay{',
      '  position:fixed;inset:0;z-index:9998;',
      '  background:rgba(5,13,26,.75);',
      '  backdrop-filter:blur(4px);',
      '  opacity:0;pointer-events:none;',
      '  transition:opacity .3s;',
      '}',
      '#cv-cart-overlay.cv-open{opacity:1;pointer-events:auto;}',

      /* ── Sidebar ── */
      '#cv-cart-sidebar{',
      '  position:fixed;top:0;right:0;bottom:0;z-index:9999;',
      '  width:420px;max-width:100vw;',
      '  background:#080f1e;',
      '  border-left:1px solid rgba(0,180,255,.15);',
      '  box-shadow:-20px 0 60px rgba(0,0,0,.6);',
      '  display:flex;flex-direction:column;',
      '  transform:translateX(100%);',
      '  transition:transform .35s cubic-bezier(.4,0,.2,1);',
      '  font-family:"Be Vietnam Pro",sans-serif;',
      '}',
      '#cv-cart-sidebar.cv-open{transform:translateX(0);}',

      /* ── Header ── */
      '.cv-cart-header{',
      '  display:flex;align-items:center;justify-content:space-between;',
      '  padding:20px 24px;',
      '  border-bottom:1px solid rgba(0,180,255,.1);',
      '  flex-shrink:0;',
      '}',
      '.cv-cart-title{',
      '  display:flex;align-items:center;gap:10px;',
      '  font-family:"Lexend Deca",sans-serif;font-size:16px;font-weight:700;',
      '  color:#e8f4ff;',
      '}',
      '.cv-header-badge{',
      '  background:#ff3d6e;color:#fff;',
      '  font-size:11px;font-weight:700;',
      '  min-width:20px;height:20px;padding:0 5px;',
      '  border-radius:99px;display:flex;align-items:center;justify-content:center;',
      '}',
      '#cv-cart-close{',
      '  background:rgba(0,180,255,.08);border:1.5px solid rgba(0,180,255,.15);',
      '  border-radius:6px;width:36px;height:36px;',
      '  display:flex;align-items:center;justify-content:center;',
      '  cursor:pointer;color:#e8f4ff;',
      '  transition:background .2s,border-color .2s;',
      '}',
      '#cv-cart-close:hover{background:rgba(255,61,110,.15);border-color:#ff3d6e;color:#ff3d6e;}',

      /* ── Body ── */
      '.cv-cart-body{',
      '  flex:1;overflow-y:auto;padding:16px 24px;',
      '  scrollbar-width:thin;scrollbar-color:#0072ff #050d1a;',
      '}',
      '.cv-cart-body::-webkit-scrollbar{width:4px;}',
      '.cv-cart-body::-webkit-scrollbar-thumb{background:#0072ff;border-radius:99px;}',

      /* ── Empty state ── */
      '.cv-cart-empty{',
      '  display:none;flex-direction:column;align-items:center;',
      '  padding:60px 0;text-align:center;',
      '}',
      '.cv-cart-empty.cv-visible{display:flex;}',
      '.cv-empty-icon{font-size:56px;margin-bottom:16px;opacity:.4;}',
      '.cv-empty-text{font-family:"Lexend Deca",sans-serif;font-weight:700;font-size:16px;color:#e8f4ff;margin-bottom:6px;}',
      '.cv-empty-sub{font-size:13px;color:#5a7a99;}',

      /* ── Item ── */
      '.cv-cart-item{',
      '  display:flex;gap:14px;align-items:flex-start;',
      '  padding:14px 0;',
      '  border-bottom:1px solid rgba(0,180,255,.07);',
      '}',
      '.cv-cart-item:last-child{border-bottom:none;}',
      '.cv-item-img{',
      '  width:72px;height:72px;border-radius:8px;',
      '  object-fit:cover;flex-shrink:0;',
      '  border:1px solid rgba(0,180,255,.12);',
      '  background:#0d1c35;',
      '}',
      '.cv-item-detail{flex:1;min-width:0;}',
      '.cv-item-name{',
      '  font-size:13px;font-weight:600;color:#e8f4ff;',
      '  line-height:1.35;margin-bottom:4px;',
      '  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
      '}',
      '.cv-item-price-unit{font-size:12px;color:#5a7a99;margin-bottom:10px;}',
      '.cv-item-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}',

      /* Qty control */
      '.cv-qty{',
      '  display:flex;align-items:center;gap:0;',
      '  border:1.5px solid rgba(0,180,255,.2);border-radius:6px;overflow:hidden;',
      '}',
      '.cv-qty-btn{',
      '  width:28px;height:28px;',
      '  background:rgba(0,180,255,.08);border:none;',
      '  color:#00b4ff;font-size:16px;font-weight:700;',
      '  cursor:pointer;display:flex;align-items:center;justify-content:center;',
      '  transition:background .15s;line-height:1;',
      '}',
      '.cv-qty-btn:hover{background:rgba(0,180,255,.2);}',
      '.cv-qty-input{',
      '  width:36px;height:28px;',
      '  background:transparent;border:none;border-left:1px solid rgba(0,180,255,.15);border-right:1px solid rgba(0,180,255,.15);',
      '  color:#e8f4ff;font-size:13px;font-weight:700;',
      '  text-align:center;outline:none;',
      '  font-family:"Lexend Deca",sans-serif;',
      '}',
      '.cv-item-total{font-family:"Lexend Deca",sans-serif;font-size:14px;font-weight:700;color:#00b4ff;white-space:nowrap;}',
      '.cv-item-remove{',
      '  background:none;border:none;cursor:pointer;',
      '  color:#5a7a99;padding:4px;border-radius:4px;',
      '  transition:color .15s;font-size:15px;',
      '  flex-shrink:0;',
      '}',
      '.cv-item-remove:hover{color:#ff3d6e;}',

      /* ── Footer ── */
      '.cv-cart-footer{',
      '  padding:20px 24px;',
      '  border-top:1px solid rgba(0,180,255,.1);',
      '  flex-shrink:0;',
      '  background:#080f1e;',
      '}',
      '.cv-cart-shipping{',
      '  font-size:12px;color:#5a7a99;margin-bottom:14px;',
      '  padding:8px 12px;',
      '  background:rgba(0,180,255,.05);border:1px solid rgba(0,180,255,.1);',
      '  border-radius:6px;',
      '}',
      '.cv-cart-subtotal{',
      '  display:flex;justify-content:space-between;',
      '  font-size:13px;color:#8aa5c0;margin-bottom:6px;',
      '}',
      '.cv-cart-total{',
      '  display:flex;justify-content:space-between;',
      '  font-family:"Lexend Deca",sans-serif;font-size:17px;font-weight:700;',
      '  color:#e8f4ff;margin-bottom:18px;',
      '  padding-top:10px;border-top:1px solid rgba(0,180,255,.1);',
      '}',
      '#cv-cart-total-val{color:#00b4ff;}',
      '.cv-checkout-btn{',
      '  width:100%;padding:14px;border:none;border-radius:8px;',
      '  background:linear-gradient(135deg,#0072ff,#00b4ff);',
      '  color:#fff;font-family:"Lexend Deca",sans-serif;font-weight:700;font-size:15px;',
      '  cursor:pointer;letter-spacing:.02em;',
      '  box-shadow:0 4px 20px rgba(0,114,255,.45);',
      '  transition:transform .2s,box-shadow .2s,opacity .2s;',
      '  margin-bottom:10px;',
      '}',
      '.cv-checkout-btn:hover{transform:translateY(-2px);box-shadow:0 6px 28px rgba(0,180,255,.6);}',
      '.cv-checkout-btn:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none;}',
      '.cv-continue-btn{',
      '  width:100%;padding:10px;border-radius:8px;',
      '  background:transparent;border:1.5px solid rgba(0,180,255,.25);',
      '  color:#00b4ff;font-family:"Be Vietnam Pro",sans-serif;font-size:13px;font-weight:600;',
      '  cursor:pointer;transition:background .2s,border-color .2s;',
      '}',
      '.cv-continue-btn:hover{background:rgba(0,180,255,.08);border-color:#00b4ff;}',

      /* ── Add toast ── */
      '#cv-add-toast{',
      '  position:fixed;bottom:90px;right:24px;z-index:10000;',
      '  background:#0d1c35;border:1px solid rgba(0,180,255,.2);',
      '  border-radius:10px;padding:12px 18px;',
      '  display:flex;align-items:center;gap:10px;',
      '  font-size:13px;font-family:"Be Vietnam Pro",sans-serif;color:#e8f4ff;',
      '  box-shadow:0 8px 32px rgba(0,0,0,.5);',
      '  transform:translateY(20px);opacity:0;pointer-events:none;',
      '  transition:transform .3s,opacity .3s;',
      '  max-width:280px;',
      '}',
      '#cv-add-toast.cv-show{transform:translateY(0);opacity:1;}',
      '.cv-add-toast-icon{',
      '  width:22px;height:22px;border-radius:50%;',
      '  background:linear-gradient(135deg,#0072ff,#00b4ff);',
      '  color:#fff;font-size:12px;font-weight:700;',
      '  display:flex;align-items:center;justify-content:center;flex-shrink:0;',
      '}',

      /* ── Badge bounce ── */
      '@keyframes cv-badge-pop{0%{transform:scale(1)}40%{transform:scale(1.6)}100%{transform:scale(1)}}',
      '.cv-badge-pop{animation:cv-badge-pop .3s ease-out;}',

      /* ── Mobile ── */
      '@media(max-width:480px){',
      '  #cv-cart-sidebar{width:100vw;}',
      '}',
    ].join('\n');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ─────────────────────────────────────────
     6.  RENDER CART ITEMS
  ───────────────────────────────────────── */
  function renderCart() {
    var cart    = loadCart();
    var itemsEl = document.getElementById('cv-cart-items');
    var emptyEl = document.getElementById('cv-cart-empty');
    var footerEl = document.getElementById('cv-cart-footer');
    var subtotalEl = document.getElementById('cv-cart-subtotal-val');
    var totalEl = document.getElementById('cv-cart-total-val');
    var checkoutBtn = document.getElementById('cv-checkout-btn');
    var countEl  = document.getElementById('cv-header-count');

    if (!itemsEl) return;

    var count = totalItems(cart);
    var total = totalPrice(cart);

    // Badge count trong sidebar
    if (countEl) countEl.textContent = count;

    // Sync tất cả badge trên trang (hỗ trợ cả #cart-count của 3x3.html)
    document.querySelectorAll('#cart-count, .cart-count, .cart-badge').forEach(function (el) {
      el.textContent = count;
    });

    // Empty state
    if (cart.length === 0) {
      emptyEl.classList.add('cv-visible');
      itemsEl.innerHTML = '';
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    emptyEl.classList.remove('cv-visible');
    if (footerEl) footerEl.style.display = 'block';

    // Prices
    if (subtotalEl) subtotalEl.textContent = formatPrice(total);
    if (totalEl)    totalEl.textContent    = formatPrice(total);
    if (checkoutBtn) checkoutBtn.disabled  = false;

    // Build items HTML
    var html = '';
    cart.forEach(function (item) {
      html += [
        '<div class="cv-cart-item" data-id="' + escHtml(item.id) + '">',
        '  <img class="cv-item-img" src="' + escHtml(item.img) + '" alt="' + escHtml(item.name) + '" onerror="this.src=\'https://placehold.co/72x72/0d1c35/00b4ff?text=Cube\'">',
        '  <div class="cv-item-detail">',
        '    <div class="cv-item-name" title="' + escHtml(item.name) + '">' + escHtml(item.name) + '</div>',
        '    <div class="cv-item-price-unit">' + formatPrice(item.price) + ' / cái</div>',
        '    <div class="cv-item-row">',
        '      <div class="cv-qty">',
        '        <button class="cv-qty-btn cv-qty-minus" data-id="' + escHtml(item.id) + '" aria-label="Giảm">−</button>',
        '        <input class="cv-qty-input" type="number" min="1" value="' + item.qty + '" data-id="' + escHtml(item.id) + '" aria-label="Số lượng">',
        '        <button class="cv-qty-btn cv-qty-plus" data-id="' + escHtml(item.id) + '" aria-label="Tăng">+</button>',
        '      </div>',
        '      <div class="cv-item-total">' + formatPrice(item.price * item.qty) + '</div>',
        '      <button class="cv-item-remove" data-id="' + escHtml(item.id) + '" aria-label="Xoá">',
        '        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
        '      </button>',
        '    </div>',
        '  </div>',
        '</div>',
      ].join('');
    });
    itemsEl.innerHTML = html;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ─────────────────────────────────────────
     7.  SIDEBAR OPEN / CLOSE
  ───────────────────────────────────────── */
  function openCart() {
    renderCart();
    document.getElementById('cv-cart-sidebar').classList.add('cv-open');
    document.getElementById('cv-cart-overlay').classList.add('cv-open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    document.getElementById('cv-cart-sidebar').classList.remove('cv-open');
    document.getElementById('cv-cart-overlay').classList.remove('cv-open');
    document.body.style.overflow = '';
  }

  /* ─────────────────────────────────────────
     8.  ADD-TO-CART TOAST
  ───────────────────────────────────────── */
  var _toastTimer = null;
  function showAddToast(name) {
    var toast = document.getElementById('cv-add-toast');
    var msg   = document.getElementById('cv-add-toast-msg');
    if (!toast) return;
    msg.textContent = 'Đã thêm: ' + name;
    toast.classList.add('cv-show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () {
      toast.classList.remove('cv-show');
    }, 2200);
  }

  /* ─────────────────────────────────────────
     9.  BADGE POP ANIMATION
  ───────────────────────────────────────── */
  function popBadges() {
    document.querySelectorAll('#cart-count, .cart-count, .cart-badge, #cv-header-count').forEach(function (el) {
      el.classList.remove('cv-badge-pop');
      void el.offsetWidth; // reflow
      el.classList.add('cv-badge-pop');
    });
  }

  /* ─────────────────────────────────────────
     10.  EVENT DELEGATION
  ───────────────────────────────────────── */
  function bindEvents() {
    /* Close / overlay */
    document.getElementById('cv-cart-close').addEventListener('click', closeCart);
    document.getElementById('cv-cart-overlay').addEventListener('click', closeCart);
    document.getElementById('cv-cart-continue').addEventListener('click', closeCart);

    /* Escape key */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCart();
    });

    /* Checkout button */
/* Checkout button */
  document.getElementById('cv-checkout-btn').addEventListener('click', function () {
    var cart = loadCart();
    if (cart.length === 0) {
      alert('Giỏ hàng của bạn đang trống!');
      return;
    }
    // Chuyển hướng sang trang checkout.html
    window.location.href = 'checkout.html';
  });

    /*
     * MỞ SIDEBAR GIỎ HÀNG
     * Hỗ trợ: #cart-btn, .cart-btn, [data-cart-open]  (index.html)
     *         #cart-pill, .cart-pill                   (3x3.html)
     */
    document.addEventListener('click', function (e) {
      var cartBtn = e.target.closest(
        '#cart-btn, .cart-btn, [data-cart-open], #cart-pill, .cart-pill'
      );
      if (cartBtn) {
        e.preventDefault();
        openCart();
      }
    });

    /* "Thêm giỏ" buttons — intercept addToCart */
    document.addEventListener('click', function (e) {
      var addBtn = e.target.closest(
        'a[onclick*="addToCart"], button[onclick*="addToCart"], ' +
        '[data-add-cart], .cv-add-btn'
      );
      if (!addBtn) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      var product = getProductFromButton(addBtn);
      if (!product.id) return;

      addItem(product);
      renderCart();
      popBadges();
      showAddToast(product.name);
    });

    /* In-sidebar qty & remove */
    document.getElementById('cv-cart-body').addEventListener('click', function (e) {
      /* Remove */
      var removeBtn = e.target.closest('.cv-item-remove');
      if (removeBtn) {
        removeItem(removeBtn.dataset.id);
        renderCart();
        return;
      }
      /* Qty minus */
      var minusBtn = e.target.closest('.cv-qty-minus');
      if (minusBtn) {
        var id = minusBtn.dataset.id;
        var cart = loadCart();
        var item = cart.find(function (i) { return i.id === id; });
        if (item && item.qty <= 1) {
          if (confirm('Xoá "' + item.name + '" khỏi giỏ hàng?')) {
            removeItem(id);
          }
        } else {
          updateQty(id, (item ? item.qty : 1) - 1);
        }
        renderCart();
        return;
      }
      /* Qty plus */
      var plusBtn = e.target.closest('.cv-qty-plus');
      if (plusBtn) {
        var id2 = plusBtn.dataset.id;
        var cart2 = loadCart();
        var item2 = cart2.find(function (i) { return i.id === id2; });
        updateQty(id2, (item2 ? item2.qty : 1) + 1);
        renderCart();
        return;
      }
    });

    /* Qty input change */
    document.getElementById('cv-cart-body').addEventListener('change', function (e) {
      if (e.target.classList.contains('cv-qty-input')) {
        updateQty(e.target.dataset.id, e.target.value);
        renderCart();
      }
    });
  }

  /* ─────────────────────────────────────────
     11.  PATCH LEGACY FUNCTIONS
          Override các hàm sẵn có trong HTML
  ───────────────────────────────────────── */
  function patchLegacyAddToCart() {
    /*
     * Patch hàm addToCart dùng trong index.html
     * (gắn vào onclick="addToCart(event)")
     */
    window.addToCart = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var btn = e && (e.currentTarget || e.target);
      if (!btn) return;
      var product = getProductFromButton(btn);
      if (!product.id) return;
      addItem(product);
      renderCart();
      popBadges();
      showAddToast(product.name);
    };

    /*
     * Patch hàm quickAddToCart dùng trong 3x3.html
     * (nút "+ Giỏ" trên card sản phẩm)
     * Tham số: id số nguyên của sản phẩm trong mảng `products`
     */
    window.quickAddToCart = function (id) {
      // Tìm sản phẩm trong mảng products (biến toàn cục của 3x3.html)
      var productList = (typeof products !== 'undefined') ? products : [];
      var p = null;
      for (var i = 0; i < productList.length; i++) {
        if (productList[i].id === id) { p = productList[i]; break; }
      }
      if (!p) return;

      addItem({ id: 'p-' + p.id, name: p.name, price: p.price, img: p.img, qty: 1 });
      renderCart();
      popBadges();
      showAddToast(p.name);
    };

    /*
     * Patch hàm addToCartFromModal dùng trong 3x3.html
     * (nút "Thêm vào giỏ hàng" trong modal chi tiết sản phẩm)
     * Tính đúng giá theo version + các dịch vụ bổ sung đã chọn
     */
    window.addToCartFromModal = function () {
      // Các biến toàn cục của 3x3.html
      var p        = (typeof currentProduct   !== 'undefined') ? currentProduct   : null;
      var version  = (typeof selectedVersion  !== 'undefined') ? selectedVersion  : 0;
      var selSvc   = (typeof selectedServices !== 'undefined') ? selectedServices : [];
      var svcList  = (typeof services         !== 'undefined') ? services         : [];

      if (!p) return;

      // Giá theo version đã chọn
      var basePrice = (p.versions && p.versions[version])
        ? p.versions[version].price
        : p.price;

      // Cộng thêm giá các dịch vụ bổ sung
      var serviceTotal = 0;
      for (var i = 0; i < selSvc.length; i++) {
        for (var j = 0; j < svcList.length; j++) {
          if (svcList[j].id === selSvc[i]) {
            serviceTotal += svcList[j].price;
            break;
          }
        }
      }

      var unitPrice = basePrice + serviceTotal;
      var qty = parseInt(document.getElementById('qty-input').value) || 1;

      // Tạo tên hiển thị chi tiết (version + dịch vụ)
      var versionLabel = (p.versions && p.versions[version]) ? p.versions[version].label : '';
      var svcLabels = [];
      for (var k = 0; k < selSvc.length; k++) {
        for (var m = 0; m < svcList.length; m++) {
          if (svcList[m].id === selSvc[k]) { svcLabels.push(svcList[m].name); break; }
        }
      }

      var displayName = p.name;
      if (versionLabel) displayName += ' – ' + versionLabel;
      if (svcLabels.length > 0) displayName += ' (+' + svcLabels.join(', ') + ')';

      // ID duy nhất theo sản phẩm + version + dịch vụ
      var itemId = 'p-' + p.id + (versionLabel ? '-' + versionLabel.toLowerCase().replace(/[^a-z0-9]/g, '') : '');
      if (selSvc.length > 0) itemId += '-' + selSvc.slice().sort().join('-');

      addItem({
        id:    itemId,
        name:  displayName,
        price: unitPrice,
        img:   p.imgs ? p.imgs[0] : p.img,
        qty:   qty
      });

      renderCart();
      popBadges();
      showAddToast(p.name);

      // Đóng modal sau khi thêm (gọi hàm gốc nếu có)
      if (typeof closeModal === 'function') closeModal();
    };
  }

  /* ─────────────────────────────────────────
     12.  INIT
  ───────────────────────────────────────── */
  function init() {
    injectCSS();
    injectHTML();
    patchLegacyAddToCart();
    bindEvents();
    renderCart(); // sync badges on page load
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
