// Bionobel - Main JavaScript (Integrated with Backend API)

// ===== STATE =====
let products = [];
let cart = [];
let currentFilter = 'all';
let modalWeight = 100;
let modalQty = 1;
let currentProductId = null;
let leadSaveTimeout = null;

// ===== DOM REFS =====
const grid = document.getElementById('products-grid') || document.getElementById('productsGrid');
const loadingEl = document.getElementById('products-loading') || document.getElementById('productsLoading');
const searchInput = document.getElementById('search-input') || document.getElementById('searchInput');
const cartItems = document.getElementById('cart-items') || document.getElementById('cartItems');
const cartTotal = document.getElementById('cart-total') || document.getElementById('cartTotal');
const cartCount = document.getElementById('cart-count') || document.getElementById('cartCount');
const checkoutSubtotal = document.getElementById('checkout-subtotal') || document.getElementById('checkoutSubtotal');
const checkoutShipping = document.getElementById('checkout-shipping') || document.getElementById('checkoutShipping');
const checkoutTotal = document.getElementById('checkout-total') || document.getElementById('checkoutTotal');
const checkoutItemsSummary = document.getElementById('checkout-items-summary') || document.getElementById('checkoutItems');

// ===== UI TOGGLE FUNCTIONS (from index.html) =====
window.toggleCart = function() {
    const overlay = document.getElementById('cart-overlay') || document.getElementById('cartOverlay');
    const sidebar = document.getElementById('cart-sidebar') || document.getElementById('cartSidebar');
    if(overlay) overlay.classList.toggle('open');
    if(sidebar) sidebar.classList.toggle('open');
};

window.toggleMobileMenu = function() {
    const menu = document.getElementById('mobile-menu') || document.getElementById('mobileMenu');
    if(menu) menu.classList.toggle('open');
};

window.toggleTheme = function() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
};

window.searchProducts = function() {
    const input = document.getElementById('search-input') || document.getElementById('searchInput');
    if (typeof renderProducts === 'function' && typeof currentFilter !== 'undefined') {
        renderProducts(currentFilter, input ? input.value : '');
    }
};

window.trackOrder = async function() {
    const trackInput = document.getElementById('trackOrderId');
    if(!trackInput) return;
    const orderId = trackInput.value.trim();
    const resultDiv = document.getElementById('trackResult');
    if(!resultDiv) return;
    
    resultDiv.style.display = 'block';
    
    if (!orderId) {
      resultDiv.innerHTML = `<div class="mt-6 p-4 rounded-xl bg-red-50 text-red-600 text-center">الرجاء إدخال رقم الطلب</div>`;
      return;
    }

    resultDiv.innerHTML = `<div class="mt-6 text-center text-gray-400">جاري البحث...</div>`;

    try {
      const res = await fetch(`/api/orders/track/${orderId}`);
      const data = await res.json();

      if (!res.ok || !data.found) {
        resultDiv.innerHTML = `<div class="mt-6 p-4 rounded-xl bg-red-50 text-red-600 text-center">لم يتم العثور على طلب بهذا الرقم</div>`;
        return;
      }

      const statusMap = {
        'new': 'جديد',
        'pending': 'في الانتظار',
        'accepted': 'مقبول',
        'shipped': 'في الطريق',
        'delivered': 'تم التسليم',
        'rejected': 'مرفوض',
        'cancelled': 'ملغي'
      };
      const status = statusMap[data.status] || data.status;

      resultDiv.innerHTML = `
        <div class="mt-6 p-6 rounded-2xl bg-green-50 border border-green-100">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <i data-lucide="package" style="width:20px;height:20px;color:var(--green)"></i>
            </div>
            <div>
              <p class="font-bold text-sm">رقم الطلب: ${orderId}</p>
              <p class="text-xs text-gray-500">${data.date ? new Date(data.date).toLocaleDateString('ar-DZ') : ''}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 mb-3">
            <div class="w-3 h-3 rounded-full ${['rejected', 'cancelled'].includes(data.status) ? 'bg-red-500' : 'bg-green-500'}"></div>
            <p class="text-sm font-semibold ${['rejected', 'cancelled'].includes(data.status) ? 'text-red-700' : 'text-green-700'}">${status}</p>
          </div>
        </div>
      `;
      if(window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('Track error:', err);
      resultDiv.innerHTML = `<div class="mt-6 p-4 rounded-xl bg-red-50 text-red-600 text-center">حدث خطأ أثناء البحث</div>`;
    }
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  loadCartFromStorage();
  updateCartUI();
  setupEventListeners();
  setupScrollReveal();
  lucide.createIcons();
});

// ===== PRODUCTS =====
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('Failed to load products');
    products = await res.json();
    const countEl = document.getElementById('productCount');
    if (countEl) countEl.textContent = products.length;
    renderProducts();
  } catch (err) {
    console.error('Error loading products:', err);
    const loadingEl = document.getElementById('products-loading') || document.getElementById('productsLoading');
    if (loadingEl) {
      loadingEl.innerHTML = '<p class="text-red-500">تعذر تحميل المنتجات (يرجى التأكد من عمل الخادم /api/products). حاول تحديث الصفحة.</p>';
    }
  }
}

function renderProducts(filter = 'all', search = '') {
  if (!grid) return;
  let filtered = filter === 'all' ? products : products.filter(p => {
    // Try category from product data if available
    const cat = p.category || 'all';
    return cat === filter;
  });

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(s) ||
      (p.description && p.description.toLowerCase().includes(s)) ||
      (p.descriptionAr && p.descriptionAr.toLowerCase().includes(s))
    );
  }

  loadingEl.style.display = 'none';

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-20"><i data-lucide="search-x" class="w-16 h-16 mx-auto text-gray-300 mb-4"></i><p class="text-gray-400 text-lg">لا توجد منتجات</p></div>`;
    lucide.createIcons();
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const badgeText = p.badge === 'special' ? 'عرض خاص' : p.badge === 'sale' ? 'تخفيض' : p.badge || 'جديد';
    const badgeClass = p.badge === 'special' ? 'special' : p.badge === 'sale' ? 'sale' : 'new';
    const priceDisplay = p.oldPrice
      ? `<span class="old-price">${p.oldPrice.toLocaleString()}</span>${p.price.toLocaleString()} د.ج`
      : `${p.price.toLocaleString()} د.ج`;
    const imgSrc = p.image || `https://via.placeholder.com/300x300/86A83B/ffffff?text=${encodeURIComponent(p.name)}`;

    return `
    <div class="product-card" data-id="${p.id}">
      <div class="product-image">
        <span class="product-badge ${badgeClass}">${badgeText}</span>
        <div class="product-quick-actions">
          <button class="quick-action-btn" onclick="openProductModal(${p.id})" title="معاينة سريعة">
            <i data-lucide="eye" style="width:16px;height:16px"></i>
          </button>
          <button class="quick-action-btn" onclick="addToCart(${p.id})" title="أضف للسلة">
            <i data-lucide="shopping-bag" style="width:16px;height:16px"></i>
          </button>
        </div>
        <img src="${imgSrc}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300/86A83B/ffffff?text=منتج'">
      </div>
      <div class="product-info">
        <h3>${p.name}</h3>
        <p class="product-desc">${p.description || p.descriptionAr || 'منتج طبيعي 100%'}</p>
        <div class="product-price-row">
          <div class="product-price">${priceDisplay}</div>
          <button class="add-cart-btn" onclick="addToCart(${p.id})" title="أضف للسلة">
            <i data-lucide="plus" style="width:18px;height:18px"></i>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  lucide.createIcons();
}

// ===== SEARCH =====
function setupSearch() {
  if (!searchInput) return;
  let timeout;
  searchInput.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      renderProducts(currentFilter, searchInput.value);
    }, 300);
  });
}

// ===== CART =====
function addToCart(productId, weight = 100, qty = 1) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  // For weighted products, use the weight-based price
  let price = product.price;
  let label = product.name;
  if (product.isWeighted && weight) {
    price = Math.round((weight / 1000) * (product.pricePerKg || product.price));
    label = `${product.name} (${weight >= 1000 ? weight/1000 + 'kg' : weight + 'g'})`;
  }

  const existing = cart.find(item => item.id === productId && item.weight === weight);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: productId,
      name: label,
      price: price,
      image: product.image,
      weight: weight,
      qty: qty,
      isWeighted: product.isWeighted || false
    });
  }

  saveCartToStorage();
  updateCartUI();
  showCartNotification(product.name);
}

function removeFromCart(productId, weight) {
  cart = cart.filter(item => !(item.id === productId && item.weight === weight));
  saveCartToStorage();
  updateCartUI();
}

function updateQty(productId, weight, delta) {
  const item = cart.find(i => i.id === productId && i.weight === weight);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(productId, weight);
    return;
  }
  saveCartToStorage();
  updateCartUI();
}

function updateCartUI() {
  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  if (cartCount) {
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
  }

  if (cartItems) {
    if (cart.length === 0) {
      cartItems.innerHTML = `<div class="text-center py-10"><i data-lucide="shopping-bag" class="w-12 h-12 mx-auto text-gray-300 mb-3"></i><p class="text-gray-400">السلة فارغة</p></div>`;
    } else {
      cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img src="${item.image || 'https://via.placeholder.com/64x64/86A83B/ffffff?text=منتج'}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/64x64/86A83B/ffffff?text=منتج'">
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-bold truncate">${item.name}</h4>
            <p class="text-xs text-gray-500">${item.weight} غرام × ${item.qty}</p>
            <p class="text-sm font-bold" style="color:var(--green)">${Math.round(item.price * item.qty).toLocaleString()} د.ج</p>
          </div>
          <div class="qty-control" style="transform:scale(0.85)">
            <button onclick="updateQty(${item.id},${item.weight},-1)">−</button>
            <span>${item.qty}</span>
            <button onclick="updateQty(${item.id},${item.weight},1)">+</button>
          </div>
          <button onclick="removeFromCart(${item.id},${item.weight})" class="text-gray-400 hover:text-red-500 transition p-1">
            <i data-lucide="x" style="width:16px;height:16px"></i>
          </button>
        </div>
      `).join('');
    }
  }

  if (cartTotal) cartTotal.textContent = `${Math.round(totalPrice).toLocaleString()} د.ج`;
  if (checkoutSubtotal) checkoutSubtotal.textContent = `${Math.round(totalPrice).toLocaleString()} د.ج`;

  // Update checkout items summary
  if (checkoutItemsSummary) {
    checkoutItemsSummary.innerHTML = cart.map(item =>
      `<div class="flex justify-between text-sm"><span>${item.name} × ${item.qty}</span><span>${Math.round(item.price * item.qty).toLocaleString()} د.ج</span></div>`
    ).join('');
  }

  // Update delivery fee and total in checkout
  updateCheckoutTotals();

  lucide.createIcons();
}

function showCartNotification(name) {
  const notif = document.getElementById('cart-notification');
  if (!notif) return;
  const text = notif.querySelector('.notif-text');
  if (text) text.textContent = `تمت إضافة "${name}" للسلة`;
  notif.classList.add('opacity-100', 'translate-y-0');
  notif.classList.remove('opacity-0', '-translate-y-4');
  setTimeout(() => {
    notif.classList.remove('opacity-100', 'translate-y-0');
    notif.classList.add('opacity-0', '-translate-y-4');
  }, 2500);
}

function saveCartToStorage() {
  localStorage.setItem('bionobel_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  const saved = localStorage.getItem('bionobel_cart');
  if (saved) {
    try {
      cart = JSON.parse(saved);
    } catch (e) {
      cart = [];
    }
  }
}

// ===== CHECKOUT =====
function updateCheckoutTotals() {
  const wilayaSelect = document.getElementById('checkout-wilaya');
  const deliveryRadios = document.querySelectorAll('input[name="delivery"]');
  const selectedDelivery = Array.from(deliveryRadios).find(r => r.checked);

  const wilaya = wilayaSelect ? wilayaSelect.value : '';
  const deliveryOption = selectedDelivery ? selectedDelivery.value : 'stopdesk';

  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  let deliveryFee = 0;
  if (wilaya && typeof getDeliveryPrice === 'function') {
    deliveryFee = getDeliveryPrice(wilaya, deliveryOption) || 0;
  }

  const total = subtotal + deliveryFee;

  if (checkoutShipping) checkoutShipping.textContent = `${Math.round(deliveryFee).toLocaleString()} د.ج`;
  if (checkoutTotal) checkoutTotal.textContent = `${Math.round(total).toLocaleString()} د.ج`;

  // Update delivery price displays
  updateDeliveryPriceDisplay(wilaya);
}

function updateDeliveryPriceDisplay(wilaya) {
  const stopdeskEl = document.getElementById('delivery-price-stopdesk');
  const stopdoorEl = document.getElementById('delivery-price-stopdoor');

  if (!wilaya || typeof getDeliveryPrice !== 'function') {
    if (stopdeskEl) stopdeskEl.textContent = '--';
    if (stopdoorEl) stopdoorEl.textContent = '--';
    return;
  }

  const stopdesk = getDeliveryPrice(wilaya, 'stopdesk') || 0;
  const stopdoor = getDeliveryPrice(wilaya, 'stopdoor') || 0;

  if (stopdeskEl) stopdeskEl.textContent = stopdesk > 0 ? `${stopdesk.toLocaleString()} د.ج` : 'غير متوفر';
  if (stopdoorEl) stopdoorEl.textContent = stopdoor > 0 ? `${stopdoor.toLocaleString()} د.ج` : 'غير متوفر';
}

function openCheckout() {
  if (cart.length === 0) return;
  const overlay = document.getElementById('checkout-overlay');
  overlay.classList.add('open');
  updateCheckoutTotals();
  lucide.createIcons();
}

function closeCheckout() {
  document.getElementById('checkout-overlay').classList.remove('open');
}

async function submitOrder(e) {
  e.preventDefault();

  const form = document.getElementById('checkout-form');
  const firstName = form.querySelector('[name="firstName"]').value.trim();
  const lastName = form.querySelector('[name="lastName"]').value.trim();
  const phone = form.querySelector('[name="phone"]').value.trim();
  const wilayaSelect = document.getElementById('checkout-wilaya');
  const baladiyaSelect = document.getElementById('checkout-baladiya');
  const customBaladiya = document.getElementById('custom-baladiya');
  const deliveryRadio = form.querySelector('input[name="delivery"]:checked');

  const wilaya = wilayaSelect ? wilayaSelect.value : '';
  let baladiya = baladiyaSelect ? baladiyaSelect.value : '';
  if (baladiya === 'أخرى' && customBaladiya) {
    baladiya = customBaladiya.value.trim() || baladiya;
  }
  const deliveryOption = deliveryRadio ? deliveryRadio.value : 'stopdesk';

  if (!firstName || !lastName || !phone || !wilaya || !baladiya) {
    alert('يرجى ملء جميع الحقول المطلوبة');
    return;
  }

  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  let deliveryFee = 0;
  if (typeof getDeliveryPrice === 'function') {
    deliveryFee = getDeliveryPrice(wilaya, deliveryOption) || 0;
  }
  const totalPrice = subtotal + deliveryFee;

  const orderData = {
    customer: {
      firstName,
      lastName,
      phone,
      wilaya,
      baladiya
    },
    items: cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.qty,
      selectedWeight: item.weight || null,
      label: item.weight ? `${item.weight}g` : null
    })),
    deliveryOption: deliveryOption,
    deliveryFee: deliveryFee,
    totalPrice: totalPrice
  };

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"></i> جاري الإرسال...';

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || 'فشل إرسال الطلب');

    // Success
    closeCheckout();
    document.getElementById('order-id-display').textContent = result.orderId || 'BN-' + Date.now().toString(36).toUpperCase();
    document.getElementById('success-overlay').classList.add('open');

    // Clear cart
    cart = [];
    saveCartToStorage();
    updateCartUI();

  } catch (err) {
    console.error('Order error:', err);
    alert('حدث خطأ أثناء إرسال الطلب: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i data-lucide="check-circle" style="width:20px;height:20px"></i> تأكيد الطلب';
    lucide.createIcons();
  }
}

// ===== PRODUCT MODAL =====
function openProductModal(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  currentProductId = productId;
  modalWeight = 100;
  modalQty = 1;

  const modal = document.getElementById('product-modal');
  const body = modal.querySelector('.modal-body');

  const imgSrc = product.image || 'https://via.placeholder.com/400x400/86A83B/ffffff?text=منتج';
  const badgeText = product.badge === 'special' ? 'عرض خاص' : product.badge === 'sale' ? 'تخفيض' : product.badge || 'جديد';
  const badgeClass = product.badge === 'special' ? 'special' : product.badge === 'sale' ? 'sale' : 'new';
  const priceDisplay = product.oldPrice
    ? `<span class="old-price text-lg">${product.oldPrice.toLocaleString()}</span>${product.price.toLocaleString()} د.ج`
    : `${product.price.toLocaleString()} د.ج`;
  const desc = product.description || product.descriptionAr || 'منتج طبيعي 100%';

  // Weight selector for weighted products
  let weightHtml = '';
  if (product.isWeighted) {
    const weights = product.recommendedWeights || [50, 100, 250, 500];
    weightHtml = `
      <div class="mb-6">
        <label class="form-label">اختر الوزن:</label>
        <div class="weight-selector" id="modal-weight-selector">
          ${weights.map(w => `<button class="weight-option ${w === 100 ? 'active' : ''}" onclick="selectModalWeight(this, ${w})">${w >= 1000 ? w/1000 + 'kg' : w + 'g'}</button>`).join('')}
          <button class="weight-option" onclick="selectModalWeight(this, 'custom')">مخصص</button>
        </div>
        <div id="modal-custom-weight-group" style="display:none; margin-top:8px;">
          <input type="number" id="modal-custom-weight" class="form-input" placeholder="أدخل الوزن بالغرام" min="50" oninput="onCustomWeightInput(this.value)">
        </div>
      </div>
    `;
  }

  body.innerHTML = `
    <div class="flex flex-col md:flex-row gap-6">
      <div class="md:w-1/2">
        <div class="rounded-2xl overflow-hidden bg-gradient-to-br from-green-50 to-yellow-50 p-4">
          <img src="${imgSrc}" alt="${product.name}" class="w-full h-64 object-contain" onerror="this.src='https://via.placeholder.com/400x400/86A83B/ffffff?text=منتج'">
        </div>
      </div>
      <div class="md:w-1/2">
        <span class="inline-block px-3 py-1 rounded-full text-xs font-bold mb-3 ${badgeClass === 'special' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}">${badgeText}</span>
        <h2 class="text-2xl font-bold mb-3">${product.name}</h2>
        <p class="text-gray-500 mb-6 leading-relaxed">${desc}</p>
        <div class="product-price text-3xl font-black mb-6" style="color:var(--green)">
          ${priceDisplay}
        </div>
        ${weightHtml}
        <div class="flex items-center gap-4 mb-6">
          <label class="form-label mb-0">الكمية:</label>
          <div class="qty-control">
            <button onclick="changeModalQty(-1)">−</button>
            <span id="modal-qty-display">1</span>
            <button onclick="changeModalQty(1)">+</button>
          </div>
        </div>
        <div class="flex gap-3">
          <button class="btn-primary flex-1" onclick="addToCartFromModal()">
            <i data-lucide="shopping-bag" style="width:18px;height:18px"></i>
            أضف إلى السلة
          </button>
          <button class="btn-secondary flex-1" onclick="buyNowFromModal()">
            <i data-lucide="zap" style="width:18px;height:18px"></i>
            شراء الآن
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('open');
  lucide.createIcons();

  // Store the product for modal operations
  window._modalProduct = product;
}

function selectModalWeight(el, weight) {
  const container = el.closest('.weight-selector');
  container.querySelectorAll('.weight-option').forEach(w => w.classList.remove('active'));
  el.classList.add('active');

  const customGroup = document.getElementById('modal-custom-weight-group');
  if (weight === 'custom') {
    customGroup.style.display = 'block';
    document.getElementById('modal-custom-weight').focus();
    modalWeight = 100; // default until user types
  } else {
    customGroup.style.display = 'none';
    modalWeight = weight;
    updateModalPrice();
  }
}

function onCustomWeightInput(value) {
  const w = parseFloat(value);
  if (!isNaN(w) && w > 0) {
    modalWeight = w;
    updateModalPrice();
  }
}

function updateModalPrice() {
  const product = window._modalProduct;
  if (!product) return;
  const priceEl = document.querySelector('#product-modal .product-price');
  if (!priceEl) return;

  let price = product.price;
  if (product.isWeighted && modalWeight > 0) {
    price = Math.round((modalWeight / 1000) * (product.pricePerKg || product.price));
  }
  priceEl.textContent = `${price.toLocaleString()} د.ج`;
}

function changeModalQty(delta) {
  modalQty = Math.max(1, modalQty + delta);
  const display = document.getElementById('modal-qty-display');
  if (display) display.textContent = modalQty;
}

function addToCartFromModal() {
  const product = window._modalProduct;
  if (!product) return;
  const weight = product.isWeighted ? modalWeight : 100;
  addToCart(product.id, weight, modalQty);
  document.getElementById('product-modal').classList.remove('open');
}

function buyNowFromModal() {
  const product = window._modalProduct;
  if (!product) return;
  const weight = product.isWeighted ? modalWeight : 100;
  addToCart(product.id, weight, modalQty);
  document.getElementById('product-modal').classList.remove('open');
  openCheckout();
}

// ===== LOCATION DROPDOWNS =====
function initLocationSelects() {
  const wilayaSelect = document.getElementById('checkout-wilaya');
  const baladiyaSelect = document.getElementById('checkout-baladiya');
  const customGroup = document.getElementById('custom-baladiya-group');
  const customInput = document.getElementById('custom-baladiya');

  if (!wilayaSelect || !baladiyaSelect) return;

  // Populate wilayas
  Object.keys(algeriaData).forEach(code => {
    const opt = document.createElement('option');
    opt.value = `${code}-${algeriaData[code].name}`;
    opt.textContent = `${code} - ${algeriaData[code].name}`;
    wilayaSelect.appendChild(opt);
  });

  // Wilaya change -> load baladiyat
  wilayaSelect.addEventListener('change', function() {
    const val = this.value;
    baladiyaSelect.innerHTML = '<option value="">اختر البلدية</option>';
    baladiyaSelect.disabled = true;
    customGroup.style.display = 'none';
    if (customInput) customInput.value = '';

    if (val) {
      const code = val.split('-')[0];
      const communes = algeriaData[code]?.communes || [];
      communes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        baladiyaSelect.appendChild(opt);
      });
      // Add "أخرى" option
      const other = document.createElement('option');
      other.value = 'أخرى';
      other.textContent = 'أخرى (اكتبها)';
      baladiyaSelect.appendChild(other);
      baladiyaSelect.disabled = false;
    }
    updateCheckoutTotals();
  });

  // Baladiya change -> show/hide custom input
  baladiyaSelect.addEventListener('change', function() {
    if (this.value === 'أخرى') {
      customGroup.style.display = 'block';
      if (customInput) customInput.focus();
    } else {
      customGroup.style.display = 'none';
      if (customInput) customInput.value = '';
    }
  });

  // Delivery radio change -> update totals
  document.querySelectorAll('input[name="delivery"]').forEach(input => {
    input.addEventListener('change', () => {
      document.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
      input.closest('.radio-option').classList.add('selected');
      updateCheckoutTotals();
    });
  });

  // Custom baladiya input -> update totals on change
  if (customInput) {
    customInput.addEventListener('input', updateCheckoutTotals);
  }
}

// ===== TRACK ORDER =====
function setupTrackOrder() {
  const form = document.getElementById('track-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[name="trackId"]');
    const orderId = input.value.trim();
    const resultDiv = document.getElementById('track-result');

    if (!orderId) {
      resultDiv.innerHTML = `<div class="mt-6 p-4 rounded-xl bg-red-50 text-red-600 text-center">الرجاء إدخال رقم الطلب</div>`;
      return;
    }

    resultDiv.innerHTML = `<div class="mt-6 text-center text-gray-400">جاري البحث...</div>`;

    try {
      const res = await fetch(`/api/orders/track/${orderId}`);
      const data = await res.json();

      if (!res.ok || !data.found) {
        resultDiv.innerHTML = `<div class="mt-6 p-4 rounded-xl bg-red-50 text-red-600 text-center">لم يتم العثور على طلب بهذا الرقم</div>`;
        return;
      }

      const statusMap = {
        'new': 'جديد',
        'pending': 'في الانتظار',
        'accepted': 'مقبول',
        'shipped': 'في الطريق',
        'delivered': 'تم التسليم',
        'rejected': 'مرفوض',
        'cancelled': 'ملغي'
      };
      const status = statusMap[data.status] || data.status;

      const steps = ['pending', 'accepted', 'shipped', 'delivered'];
      const currentIdx = steps.indexOf(data.status);
      const isRejected = data.status === 'rejected' || data.status === 'cancelled';

      let timelineHtml = '';
      if (!isRejected) {
        timelineHtml = `
          <div class="flex justify-between mt-4 relative">
            <div class="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" style="z-index:0;"></div>
            ${steps.map((s, i) => `
              <div class="flex flex-col items-center relative z-10">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= currentIdx ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}">${i <= currentIdx ? '✓' : i+1}</div>
                <span class="text-xs mt-1 ${i <= currentIdx ? 'text-green-700 font-bold' : 'text-gray-400'}">${statusMap[s]}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      resultDiv.innerHTML = `
        <div class="mt-6 p-6 rounded-2xl bg-green-50 border border-green-100">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <i data-lucide="package" style="width:20px;height:20px;color:var(--green)"></i>
            </div>
            <div>
              <p class="font-bold text-sm">رقم الطلب: ${orderId}</p>
              <p class="text-xs text-gray-500">${data.date ? new Date(data.date).toLocaleDateString('ar-DZ') : ''}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 mb-3">
            <div class="w-3 h-3 rounded-full ${isRejected ? 'bg-red-500' : 'bg-green-500'}"></div>
            <p class="text-sm font-semibold ${isRejected ? 'text-red-700' : 'text-green-700'}">${isRejected ? 'تم رفض الطلب' : status}</p>
          </div>
          ${timelineHtml}
          <p class="text-xs text-gray-500 mt-4">${isRejected ? 'يمكنك التواصل معنا لمعرفة السبب' : 'سيتم التواصل معك قريباً لتأكيد الطلب'}</p>
        </div>
      `;
      lucide.createIcons();
    } catch (err) {
      console.error('Track error:', err);
      resultDiv.innerHTML = `<div class="mt-6 p-4 rounded-xl bg-red-50 text-red-600 text-center">حدث خطأ أثناء البحث</div>`;
    }
  });
}

// ===== SCROLL REVEAL =====
function setupScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Search
  setupSearch();

  // Cart toggle
  const openBtn = document.getElementById('open-cart');
  const closeBtn = document.getElementById('close-cart');
  const overlay = document.getElementById('cart-overlay');
  const sidebar = document.getElementById('cart-sidebar');

  if (openBtn) openBtn.addEventListener('click', () => {
    overlay.classList.add('open');
    sidebar.classList.add('open');
  });
  if (closeBtn) closeBtn.addEventListener('click', () => {
    overlay.classList.remove('open');
    sidebar.classList.remove('open');
  });
  if (overlay) overlay.addEventListener('click', () => {
    overlay.classList.remove('open');
    sidebar.classList.remove('open');
  });

  // Checkout button
  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;
    overlay.classList.remove('open');
    sidebar.classList.remove('open');
    openCheckout();
  });

  // Close checkout
  const closeCheckoutBtn = document.querySelector('.close-checkout');
  const checkoutOverlay = document.getElementById('checkout-overlay');
  if (closeCheckoutBtn) closeCheckoutBtn.addEventListener('click', closeCheckout);
  if (checkoutOverlay) checkoutOverlay.addEventListener('click', (e) => {
    if (e.target === checkoutOverlay) closeCheckout();
  });

  // Close product modal
  const closeModal = document.querySelector('#product-modal .close-modal');
  const productModal = document.getElementById('product-modal');
  if (closeModal) closeModal.addEventListener('click', () => productModal.classList.remove('open'));
  if (productModal) productModal.addEventListener('click', (e) => {
    if (e.target === productModal) productModal.classList.remove('open');
  });

  // Close success modal
  const closeSuccess = document.querySelector('.close-success');
  const successOverlay = document.getElementById('success-overlay');
  if (closeSuccess) closeSuccess.addEventListener('click', () => successOverlay.classList.remove('open'));
  if (successOverlay) successOverlay.addEventListener('click', (e) => {
    if (e.target === successOverlay) successOverlay.classList.remove('open');
  });

  // Mobile menu
  const mobileMenu = document.getElementById('mobile-menu');
  const openMobile = document.getElementById('open-mobile-menu');
  const closeMobile = document.getElementById('close-mobile-menu');
  if (openMobile) openMobile.addEventListener('click', () => mobileMenu.classList.add('open'));
  if (closeMobile) closeMobile.addEventListener('click', () => mobileMenu.classList.remove('open'));
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => mobileMenu.classList.remove('open'));
    });
  }

  // Checkout form submit
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) checkoutForm.addEventListener('submit', submitOrder);

  // Location selects
  initLocationSelects();

  // Track order
  setupTrackOrder();

  // Close modals on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.open').forEach(el => el.classList.remove('open'));
    }
  });
}

// ===== INITIAL LOAD =====
// Products are loaded via loadProducts() on DOMContentLoaded