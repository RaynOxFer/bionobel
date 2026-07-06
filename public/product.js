let product = null;
let leadSaveTimeout = null;

function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));
    return Number.isFinite(id) ? id : null;
}

function formatDzd(price) {
    try {
        return `${Number(price).toLocaleString('ar-DZ')} د.ج`;
    } catch {
        return `${price} د.ج`;
    }
}

function showError(message) {
    const errorBox = document.getElementById('productPageError');
    const grid = document.getElementById('productPageGrid');
    if (grid) grid.style.display = 'none';

    if (errorBox) {
        errorBox.style.display = 'block';
        errorBox.innerHTML = `
            <div style="padding:20px;border-radius:16px;background:var(--bg-secondary);border:1px solid var(--border-color);">
                <h2 style="margin-bottom:10px;">${message}</h2>
                <a class="btn btn-primary" href="/" style="text-decoration:none;">العودة للمتجر</a>
            </div>
        `;
    }
}

function updateTotals() {
    if (!product) return;

    let quantity = 1;
    let basePrice = product.price;
    let productTotal = 0;
    let itemName = product.name;

    if (product.isWeighted) {
        const weight = product.selectedWeight || 0;
        basePrice = Math.round((weight / 1000) * (product.pricePerKg || 0));
        productTotal = basePrice;
        itemName = `${product.name} (${weight >= 1000 ? weight/1000 + 'kg' : weight + 'g'})`;
    } else {
        const quantityInput = document.getElementById('quantity');
        quantity = Math.max(1, parseInt(quantityInput?.value || '1'));
        productTotal = basePrice * quantity;
        itemName = `${product.name} × ${quantity}`;
    }
    
    // Get delivery fee
    const wilayaSelect = document.getElementById('wilaya');
    const deliveryOptionInputs = document.getElementsByName('deliveryOption');
    const selectedDeliveryOption = Array.from(deliveryOptionInputs).find(input => input.checked);
    
    const wilaya = wilayaSelect?.value || '';
    const deliveryOption = selectedDeliveryOption?.value || 'stopdesk';
    
    let deliveryFee = 0;
    if (wilaya && typeof getDeliveryPrice === 'function') {
        deliveryFee = getDeliveryPrice(wilaya, deliveryOption);
    }

    const itemBox = document.getElementById('singleCheckoutItem');
    if (itemBox) {
        itemBox.innerHTML = `
            <div class="checkout-item">
                <span>${itemName}</span>
                <span>${formatDzd(productTotal)}</span>
            </div>
        `;
    }
    
    // Show delivery fee if applicable
    const deliveryFeeLine = document.getElementById('deliveryFeeLine');
    const deliveryFeeAmount = document.getElementById('deliveryFeeAmount');
    if (deliveryFee > 0) {
        if (deliveryFeeLine) deliveryFeeLine.style.display = 'flex';
        if (deliveryFeeAmount) deliveryFeeAmount.textContent = formatDzd(deliveryFee);
    } else {
        if (deliveryFeeLine) deliveryFeeLine.style.display = 'none';
    }
    
    const grandTotal = productTotal + deliveryFee;

    const totalEl = document.getElementById('total');
    if (totalEl) totalEl.textContent = formatDzd(grandTotal);
}

function changeQuantity(delta) {
    const input = document.getElementById('quantity');
    if (!input) return;

    const current = Math.max(1, parseInt(input.value || '1'));
    const next = Math.max(1, current + delta);
    input.value = next;
    updateTotals();
}

function copyProductLink() {
    const link = window.location.href;

    const input = document.getElementById('productLink');
    if (input) input.value = link;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link)
            .then(() => showToast('تم نسخ الرابط', 'success'))
            .catch(() => fallbackCopy(link));
    } else {
        fallbackCopy(link);
    }
}

function fallbackCopy(text) {
    const input = document.getElementById('productLink');
    if (input) {
        input.value = text;
        input.focus();
        input.select();
        try {
            document.execCommand('copy');
            showToast('تم نسخ الرابط', 'success');
        } catch {
            showToast('تعذر نسخ الرابط', 'error');
        }
        return;
    }
    showToast('تعذر نسخ الرابط', 'error');
}

// Update delivery prices display based on selected wilaya
function updateDeliveryPrices() {
    const wilayaSelect = document.getElementById('wilaya');
    const stopdeskPriceEl = document.getElementById('stopdeskPrice');
    const stopdoorPriceEl = document.getElementById('stopdoorPrice');
    
    if (!wilayaSelect || !stopdeskPriceEl || !stopdoorPriceEl) return;
    
    const wilaya = wilayaSelect.value;
    
    if (!wilaya || typeof getDeliveryPrice !== 'function') {
        stopdeskPriceEl.textContent = '--';
        stopdoorPriceEl.textContent = '--';
        return;
    }
    
    const stopdeskPrice = getDeliveryPrice(wilaya, 'stopdesk');
    const stopdoorPrice = getDeliveryPrice(wilaya, 'stopdoor');
    
    stopdeskPriceEl.textContent = stopdeskPrice > 0 ? formatDzd(stopdeskPrice) : 'غير متوفر';
    stopdoorPriceEl.textContent = stopdoorPrice > 0 ? formatDzd(stopdoorPrice) : 'غير متوفر';
}

// Auto-save lead when user types name or phone
async function saveLead() {
    const firstName = document.getElementById('firstName')?.value.trim();
    const lastName = document.getElementById('lastName')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const wilaya = document.getElementById('wilaya')?.value;
    const baladiyaSelect = document.getElementById('baladiya');
    const customBaladiyaInput = document.getElementById('customBaladiya');
    const baladiya = baladiyaSelect?.value === 'أخرى' && customBaladiyaInput?.value.trim() 
        ? customBaladiyaInput.value.trim() 
        : baladiyaSelect?.value;
    
    // Only save if we have firstName, lastName AND phone
    if (!firstName || !lastName || !phone) return;
    
    try {
        await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, phone, wilaya, baladiya })
        });
        // Silent save - no toast notification
    } catch (error) {
        console.error('Error saving lead:', error);
    }
}

function onFormFieldChange() {
    // Clear existing timeout
    if (leadSaveTimeout) {
        clearTimeout(leadSaveTimeout);
    }
    
    // Save after 2 seconds of no typing
    leadSaveTimeout = setTimeout(() => {
        saveLead();
    }, 2000);
}

// Theme Toggle (same idea as index, but isolated)
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    const icon = document.querySelector('.theme-toggle-ball i');
    if (icon) {
        icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const icon = document.querySelector('.theme-toggle-ball i');
    if (icon) {
        icon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// Toast (reuse existing CSS)
function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.innerHTML = '<i class="fas fa-check-circle"></i><span></span>';
        document.body.appendChild(toast);
    }

    const icon = toast.querySelector('i');
    const text = toast.querySelector('span');

    text.textContent = message;
    toast.className = `toast ${type}`;
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function setupWeightSelector() {
    if (!product || !product.isWeighted) return;
    
    const container = document.getElementById('weightButtons');
    const customContainer = document.getElementById('customWeightInputGroup');
    const customInput = document.getElementById('customWeightInput');
    if (!container || !customContainer || !customInput) return;
    
    container.innerHTML = '';
    
    // Sort weights
    const weights = [...(product.recommendedWeights || [])].sort((a,b) => a-b);
    
    // Default weight
    if (weights.length > 0) {
        setWeight(weights[0]);
    } else {
        setWeight(100);
    }
    
    // Helper to format weight
    const formatWeight = (w) => w >= 1000 ? (w/1000) + 'kg' : w + 'g';
    
    // Render buttons
    weights.forEach(w => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-outline weight-btn';
        btn.innerHTML = formatWeight(w);
        btn.onclick = () => {
            customInput.value = '';
            setWeight(w);
            updateWeightButtonsUI(w);
        };
        container.appendChild(btn);
    });
    
    // Custom button
    const customBtn = document.createElement('button');
    customBtn.type = 'button';
    customBtn.className = 'btn btn-outline weight-btn custom-weight-btn';
    customBtn.innerHTML = 'مخصص (Custom)';
    customBtn.onclick = () => {
        customContainer.style.display = 'flex';
        updateWeightButtonsUI('custom');
        customInput.focus();
    };
    container.appendChild(customBtn);
    
    // Event listener for custom input
    customInput.oninput = (e) => {
        let val = parseFloat(e.target.value);
        if (isNaN(val) || val < 0) {
            setWeight(0);
            return;
        }
        
        setWeight(val);
        // We stay in 'custom' mode until they click a specific button
        updateWeightButtonsUI('custom');
    };
    
    // Initial UI selection
    updateWeightButtonsUI(product.selectedWeight);
}

function updateWeightButtonsUI(selected) {
    const container = document.getElementById('weightButtons');
    if (!container) return;
    
    Array.from(container.children).forEach(btn => {
        btn.classList.remove('active-weight');
        // Clean up old inline styles to allow CSS to take over
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
    });
    
    if (selected === 'custom') {
        const customBtn = container.querySelector('.custom-weight-btn');
        if (customBtn) customBtn.classList.add('active-weight');
    } else {
        const weights = [...(product.recommendedWeights || [])].sort((a,b) => a-b);
        const index = weights.indexOf(selected);
        if (index !== -1 && container.children[index]) {
            container.children[index].classList.add('active-weight');
        }
    }
}

function setWeight(w) {
    product.selectedWeight = w;
    const finalPrice = Math.round((w / 1000) * (product.pricePerKg || 0));
    
    // Update product price
    const priceEl = document.getElementById('productPrice');
    if (priceEl) priceEl.textContent = formatDzd(finalPrice);
    
    updateTotals();
}

async function loadProduct() {
    const id = getProductIdFromUrl();
    if (!id) {
        showError('رابط المنتج غير صحيح');
        return;
    }

    try {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) {
            showError('لم يتم العثور على المنتج');
            return;
        }

        product = await response.json();

        document.title = `${product.name} | Bionobel`;

        const grid = document.getElementById('productPageGrid');
        if (grid) grid.style.display = 'grid';

        if (product.backgroundImage) {
            let bgDiv = document.getElementById('productPageFullBg');
            if (!bgDiv) {
                bgDiv = document.createElement('div');
                bgDiv.id = 'productPageFullBg';
                bgDiv.style.position = 'fixed';
                bgDiv.style.top = '0';
                bgDiv.style.left = '0';
                bgDiv.style.width = '100vw';
                bgDiv.style.height = '100vh';
                bgDiv.style.zIndex = '-1';
                bgDiv.style.backgroundSize = 'cover';
                bgDiv.style.backgroundPosition = 'center';
                bgDiv.style.filter = 'brightness(0.4) blur(8px)';
                bgDiv.style.transform = 'scale(1.1)'; // Prevents blurry white borders at the edges
                document.body.insertBefore(bgDiv, document.body.firstChild);
            }
            bgDiv.style.backgroundImage = `url('${product.backgroundImage}')`;
            
            // Make the body background transparent so the image shows through
            document.body.style.backgroundColor = 'transparent';
        }

        const img = document.getElementById('productImage');
        if (img) {
            img.src = product.image || 'https://via.placeholder.com/600x600?text=منتج';
            img.alt = product.name;
        }

        const name = document.getElementById('productName');
        if (name) name.textContent = product.name;

        const desc = document.getElementById('productDescription');
        if (desc) desc.textContent = product.description || 'منتج طبيعي 100%';

        const price = document.getElementById('productPrice');
        if (price) price.textContent = formatDzd(product.price);

        const old = document.getElementById('productOldPrice');
        if (old) {
            if (product.oldPrice) {
                old.style.display = 'block';
                old.textContent = formatDzd(product.oldPrice);
            } else {
                old.style.display = 'none';
            }
        }

        const badge = document.getElementById('productBadge');
        if (badge) {
            if (product.badge) {
                badge.style.display = 'block';
                badge.textContent = product.badge;
            } else {
                badge.style.display = 'none';
            }
        }
        
        // Weight tracking
        product.selectedWeight = null;
        
        const weightSelectorContainer = document.getElementById('weightSelectorContainer');
        const quantitySelector = document.getElementById('quantitySelector');
        
        if (product.isWeighted) {
            if (weightSelectorContainer) weightSelectorContainer.style.display = 'block';
            if (quantitySelector) quantitySelector.style.display = 'none';
            setupWeightSelector();
        } else {
            if (weightSelectorContainer) weightSelectorContainer.style.display = 'none';
            if (quantitySelector) quantitySelector.style.display = 'flex';
            product.selectedWeight = null;
        }

        const linkInput = document.getElementById('productLink');
        if (linkInput) linkInput.value = window.location.href;

        const qty = document.getElementById('quantity');
        if (qty) {
            qty.addEventListener('input', updateTotals);
            qty.addEventListener('change', updateTotals);
        }

        // Add auto-save listeners to form fields
        const firstName = document.getElementById('firstName');
        const lastName = document.getElementById('lastName');
        const phone = document.getElementById('phone');
        const wilaya = document.getElementById('wilaya');
        
        if (firstName) firstName.addEventListener('input', onFormFieldChange);
        if (lastName) lastName.addEventListener('input', onFormFieldChange);
        if (phone) phone.addEventListener('input', onFormFieldChange);
        if (wilaya) {
            wilaya.addEventListener('change', onFormFieldChange);
            wilaya.addEventListener('change', updateDeliveryPrices);
            wilaya.addEventListener('change', updateTotals);
        }
        
        // Add delivery option listeners
        const deliveryOptionInputs = document.getElementsByName('deliveryOption');
        deliveryOptionInputs.forEach(input => {
            input.addEventListener('change', updateTotals);
        });

        updateTotals();
    } catch (error) {
        console.error(error);
        showError('حدث خطأ أثناء تحميل المنتج');
    }
}

async function submitSingleOrder(event) {
    event.preventDefault();
    if (!product) return;

    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';
    }

    let quantity = Math.max(1, parseInt(document.getElementById('quantity')?.value || '1'));
    let basePrice = product.price;
    let itemLabel = product.name;
    let selectedWeightStr = null;

    if (product.isWeighted) {
        quantity = 1; // Always 1 for weighted item
        const weight = product.selectedWeight || 0;
        basePrice = Math.round((weight / 1000) * (product.pricePerKg || 0));
        selectedWeightStr = weight >= 1000 ? weight/1000 + 'kg' : weight + 'g';
        itemLabel = `${product.name} (${selectedWeightStr})`;
    }

    const baladiyaSelect = document.getElementById('baladiya');
    const customBaladiyaInput = document.getElementById('customBaladiya');
    const baladiyaValue = baladiyaSelect.value === 'أخرى' && customBaladiyaInput.value.trim() 
        ? customBaladiyaInput.value.trim() 
        : baladiyaSelect.value;
    
    // Get delivery option and calculate fee
    const deliveryOptionInputs = document.getElementsByName('deliveryOption');
    const selectedDeliveryOption = Array.from(deliveryOptionInputs).find(input => input.checked);
    const deliveryOption = selectedDeliveryOption?.value || 'stopdesk';
    
    const wilaya = document.getElementById('wilaya').value;
    let deliveryFee = 0;
    if (wilaya && typeof getDeliveryPrice === 'function') {
        deliveryFee = getDeliveryPrice(wilaya, deliveryOption);
    }
    
    const productTotal = basePrice * quantity;
    const totalPrice = productTotal + deliveryFee;
    
    const formData = {
        customer: {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            phone: document.getElementById('phone').value,
            wilaya: wilaya,
            baladiya: baladiyaValue
        },
        items: [
            {
                id: product.id,
                name: itemLabel,
                price: basePrice,
                quantity: quantity,
                selectedWeight: product.isWeighted ? product.selectedWeight : null,
                label: selectedWeightStr
            }
        ],
        deliveryOption: deliveryOption,
        deliveryFee: deliveryFee,
        totalPrice: totalPrice
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        if (!response.ok) {
            showToast(result.message || 'خطأ في إرسال الطلب', 'error');
            return;
        }

        // Redirect to thank you page with order ID and total price
        window.location.href = `/thankyou.html?orderId=${result.orderId}&value=${totalPrice}`;

    } catch (error) {
        console.error(error);
        showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> تأكيد الطلب';
        }
    }
}

// Initialize Wilayas and Baladiyat
function initializeLocationSelects() {
    const wilayaSelect = document.getElementById('wilaya');
    const baladiyaSelect = document.getElementById('baladiya');
    
    if (!wilayaSelect || !baladiyaSelect) return;
    
    // Populate wilayas
    Object.keys(algeriaData).forEach(code => {
        const option = document.createElement('option');
        option.value = `${code}-${algeriaData[code].name}`;
        option.textContent = `${code} - ${algeriaData[code].name}`;
        wilayaSelect.appendChild(option);
    });
    
    // Handle wilaya change
    wilayaSelect.addEventListener('change', function() {
        const selectedValue = this.value;
        baladiyaSelect.innerHTML = '<option value="">اختر البلدية</option>';
        baladiyaSelect.disabled = true;
        
        const customBaladiyaGroup = document.getElementById('customBaladiyaGroup');
        const customBaladiyaInput = document.getElementById('customBaladiya');
        if (customBaladiyaGroup) {
            customBaladiyaGroup.style.display = 'none';
            if (customBaladiyaInput) customBaladiyaInput.value = '';
        }
        
        if (selectedValue) {
            const wilayaCode = selectedValue.split('-')[0];
            const communes = algeriaData[wilayaCode]?.communes || [];
            
            communes.forEach(commune => {
                const option = document.createElement('option');
                option.value = commune;
                option.textContent = commune;
                baladiyaSelect.appendChild(option);
            });
            
            baladiyaSelect.disabled = false;
        }
    });
    
    // Show/hide custom baladiya input when 'أخرى' is selected
    baladiyaSelect.addEventListener('change', function() {
        const customBaladiyaGroup = document.getElementById('customBaladiyaGroup');
        const customBaladiyaInput = document.getElementById('customBaladiya');
        
        if (this.value === 'أخرى' && customBaladiyaGroup) {
            customBaladiyaGroup.style.display = 'block';
            if (customBaladiyaInput) customBaladiyaInput.setAttribute('required', 'required');
        } else if (customBaladiyaGroup) {
            customBaladiyaGroup.style.display = 'none';
            if (customBaladiyaInput) {
                customBaladiyaInput.value = '';
                customBaladiyaInput.removeAttribute('required');
            }
        }
        
        onFormFieldChange();
    });
    
    // Add custom baladiya to lead save listener
    const customBaladiyaInput = document.getElementById('customBaladiya');
    if (customBaladiyaInput) {
        customBaladiyaInput.addEventListener('input', onFormFieldChange);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadProduct();
    initializeLocationSelects();

    const form = document.getElementById('singleCheckoutForm');
    if (form) form.addEventListener('submit', submitSingleOrder);
});
