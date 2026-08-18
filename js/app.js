let cart = JSON.parse(localStorage.getItem('furonix_cart')) || [];

function saveCart() {
  localStorage.setItem('furonix_cart', JSON.stringify(cart));
  updateCartCount();
}

function addToCart(productId, quantity = 1) {
  const product = sampleProducts.find(p => p.id === productId);
  if (!product) return;
  if (Number(product.stock) < Number(quantity)) {
    alert("Sorry, only " + product.stock + " left in stock.");
    return;
  }

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += parseInt(quantity);
  } else {
    cart.push({ ...product, quantity: parseInt(quantity) });
  }
  saveCart();
  
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 transform transition-transform duration-300 translate-y-10 opacity-0';
  toast.textContent = `${product.name} added to cart!`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
  }, 10);
  
  setTimeout(() => {
    toast.classList.add('translate-y-10', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function buyNow(productId) {
  addToCart(productId, 1);
  window.location.href = 'checkout.html';
}

function updateCartCount() {
  const countSpans = document.querySelectorAll('.cart-count-badge');
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  countSpans.forEach(span => {
    span.textContent = total;
    if (total > 0) {
      span.classList.remove('hidden');
    } else {
      span.classList.add('hidden');
    }
  });
}

function createProductCard(product) {
  const inStock = Number(product.stock) > 0;
  const safeName = escapeHtml(product.name);
  const safeCategory = escapeHtml(product.category);
  const safeImage = escapeHtml(product.image);
  const safeId = escapeHtml(product.id);
  return `
    <div class="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col hover:shadow-lg transition-all group h-full">
      <div class="h-40 bg-slate-100 rounded-2xl mb-4 flex items-center justify-center relative overflow-hidden p-4">
        <a href="product.html?id=${encodeURIComponent(product.id)}" class="w-full h-full flex items-center justify-center">
          <img src="${safeImage}" alt="${safeName}" class="object-cover max-h-full mix-blend-multiply group-hover:scale-110 transition-transform duration-500">
        </a>
        <div class="absolute top-2 left-2 ${inStock ? 'bg-blue-500' : 'bg-red-500'} text-white text-[9px] font-black px-2 py-0.5 rounded-full">${inStock ? 'IN STOCK' : 'OUT OF STOCK'}</div>
        ${product.discount > 0 ? `<div class="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">-${product.discount}%</div>` : ''}
      </div>
      <h3 class="font-bold text-slate-800 text-sm line-clamp-2 mb-1"><a href="product.html?id=${encodeURIComponent(product.id)}" class="hover:text-blue-600 transition-colors">${safeName}</a></h3>
      <p class="text-xs text-slate-500 mb-2 uppercase tracking-wider">${safeCategory}</p>
      <div class="flex items-center gap-2 mt-auto mb-3">
        <span class="text-lg font-black text-blue-600">Rs. ${product.price.toLocaleString()}</span>
        ${product.originalPrice > product.price ? `<span class="text-xs text-slate-400 line-through">Rs. ${product.originalPrice.toLocaleString()}</span>` : ''}
      </div>
      <div class="flex gap-2 mt-auto">
        <button onclick="addToCart('${safeId}')" ${inStock ? '' : 'disabled'} class="flex-1 border border-blue-600 text-blue-600 rounded-full py-2 text-[10px] font-bold hover:bg-blue-50 transition-colors uppercase disabled:opacity-40 disabled:cursor-not-allowed">Add to Cart</button>
        <button onclick="buyNow('${safeId}')" ${inStock ? '' : 'disabled'} class="flex-1 bg-blue-600 text-white rounded-full py-2 text-[10px] font-bold hover:bg-blue-700 transition-colors uppercase disabled:opacity-40 disabled:cursor-not-allowed">Buy Now</button>
      </div>
    </div>
  `;
}

const navbarHTML = `
<nav class="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-sm shrink-0 z-50 sticky top-0">
  <div class="flex items-center gap-8">
    <a href="index.html" id="brand-logo-link" class="text-2xl font-black tracking-tighter text-blue-600 uppercase">
      Furonix
    </a>
    
    <!-- Desktop Navigation -->
    <div class="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-500">
      <a href="index.html" class="hover:text-blue-600 transition-colors">Home</a>
      <a href="shop.html" class="hover:text-blue-600 transition-colors">Shop</a>
      <a href="contact.html" class="hover:text-blue-600 transition-colors">Contact</a>
    </div>
  </div>

  <div class="flex items-center gap-4">
    <!-- Desktop Search -->
    <div class="relative hidden md:block">
      <input type="text" id="global-search" placeholder="Search smart tech..." class="bg-slate-100 border-none rounded-full py-2 px-4 text-sm w-64 focus:ring-2 focus:ring-blue-600 outline-none"/>
      <div class="absolute right-3 top-2.5 opacity-40 text-slate-600">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>
    </div>

    <a href="cart.html" class="relative p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
      <span class="cart-count-badge absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-white hidden">0</span>
    </a>

    <!-- Mobile menu button -->
    <button id="mobile-menu-btn" class="lg:hidden relative p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors text-slate-600">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
    </button>
  </div>
</nav>

<!-- Mobile Menu -->
<div id="mobile-menu" class="hidden lg:hidden bg-white border-b border-slate-200 shadow-sm fixed w-full z-40 top-16">
  <div class="px-4 py-4 space-y-2">
    <div class="mb-4 relative md:hidden">
      <input type="text" placeholder="Search..." class="w-full bg-slate-100 rounded-full py-2 pl-10 pr-4 outline-none text-sm focus:ring-2 focus:ring-blue-600 border-none">
      <svg class="w-4 h-4 text-slate-400 absolute left-4 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
    </div>
    <a href="index.html" class="block px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600">Home</a>
    <a href="shop.html" class="block px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600">Shop</a>
    <a href="contact.html" class="block px-3 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600">Contact</a>
  </div>
</div>
`;

const footerHTML = `
<footer class="py-8 bg-white border-t border-slate-200 px-8 mt-12 shrink-0">
  <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
    <div class="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6 items-center">
      <span id="footer-copyright" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">&copy; ${new Date().getFullYear()} Furonix</span>
      <div class="hidden md:block h-4 w-[1px] bg-slate-200"></div>
      <span id="footer-contact" class="text-[10px] text-slate-500 font-medium"></span>
    </div>
    <div class="flex flex-wrap justify-center gap-3 md:gap-4 items-center">
      <div id="footer-social" class="flex items-center gap-3"></div>
      <button class="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">Cash on Delivery</button>
      <button class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tighter">Advance Payment</button>
      <div class="hidden md:block h-4 w-[1px] bg-slate-200"></div>
    </div>
  </div>
</footer>
`;

function applySiteSettings() {
  const s = window.siteSettings || {};

  if (s.brandName) {
    const logoLink = document.getElementById('brand-logo-link');
    if (logoLink && !s.logo) logoLink.textContent = s.brandName;
  }

  const logoLink2 = document.getElementById('brand-logo-link');
  if (logoLink2 && s.logo) {
    logoLink2.innerHTML = `<img src="${escapeHtml(driveImg(s.logo))}" alt="${escapeHtml(s.brandName || 'Logo')}" class="h-8 w-auto object-contain">`;
  }

  // Favicon
  if (s.favicon) {
    let favEl = document.querySelector('link[rel="icon"]');
    if (!favEl) {
      favEl = document.createElement('link');
      favEl.rel = 'icon';
      document.head.appendChild(favEl);
    }
    favEl.href = driveImg(s.favicon);
  }

  const brand = s.themeColor || '';
  const btn = s.buttonColor || brand;
  if (brand || btn) {
    let styleTag = document.getElementById('furonix-dynamic-theme');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'furonix-dynamic-theme';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = `
      .bg-blue-600, .bg-blue-700, .from-blue-600, .to-blue-700, .via-indigo-600 { background-color: ${btn || brand} !important; }
      .text-blue-600, .text-blue-700 { color: ${brand || btn} !important; }
      .border-blue-600 { border-color: ${brand || btn} !important; }
      .cart-count-badge { background-color: ${btn || brand} !important; }
    `;
  }

  const footerContact = document.getElementById('footer-contact');
  if (footerContact) {
    const bits = [s.phone, s.email].filter(Boolean);
    footerContact.textContent = bits.join(' | ');
  }
  const footerCopyright = document.getElementById('footer-copyright');
  if (footerCopyright && s.footerText) {
    footerCopyright.textContent = s.footerText;
  }
  const footerSocial = document.getElementById('footer-social');
  if (footerSocial) {
    let icons = '';
    if (s.facebookUrl) icons += `<a href="${s.facebookUrl}" target="_blank" rel="noopener" class="text-[10px] font-bold text-blue-600 hover:underline">Facebook</a>`;
    if (s.instagramUrl) icons += `<a href="${s.instagramUrl}" target="_blank" rel="noopener" class="text-[10px] font-bold text-pink-600 hover:underline">Instagram</a>`;
    footerSocial.innerHTML = icons;
  }

  if (s.announcementText) {
    let bar = document.getElementById('announcement-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'announcement-bar';
      bar.className = 'text-center text-xs font-semibold text-white py-2 px-4';
      bar.style.backgroundColor = btn || brand || '#111827';
      document.body.insertBefore(bar, document.body.firstChild);
    }
    bar.textContent = s.announcementText;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const headerElem = document.getElementById('shared-header');
  if (headerElem) headerElem.innerHTML = navbarHTML;
  
  const footerElem = document.getElementById('shared-footer');
  if (footerElem) footerElem.innerHTML = footerHTML;

  updateCartCount();

  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        window.location.href = `shop.html?search=${encodeURIComponent(searchInput.value.trim())}`;
      }
    });
  }

  if (typeof loadFuronixData === 'function') {
    loadFuronixData().then(() => applySiteSettings());
  }
});
