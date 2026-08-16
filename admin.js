// ============================================
// ADMIN DASHBOARD - wired to real backend
// ============================================

// auth guard
if (!getAdminToken()) {
  window.location.href = 'login.html';
}

let currentCategories = [];
let currentSettings = {};

async function adminGet(action, params) {
  params = params || {};
  params.token = getAdminToken();
  let res = await apiGet(action, params);
  if (!res.success && res.message && res.message.indexOf('Unauthorized') !== -1) {
    clearAdminToken();
    window.location.href = 'login.html';
  }
  return res;
}
async function adminPost(action, data) {
  data = data || {};
  data.token = getAdminToken();
  let res = await apiPost(action, data);
  if (!res.success && res.message && res.message.indexOf('Unauthorized') !== -1) {
    clearAdminToken();
    window.location.href = 'login.html';
  }
  return res;
}

function closeAdminModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function toast(message, isError) {
  const el = document.createElement('div');
  el.className = `fixed bottom-4 right-4 ${isError ? 'bg-red-600' : 'bg-slate-900'} text-white px-6 py-3 rounded-full shadow-lg z-50`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

async function initAdminDashboard() {
  document.getElementById('admin-username-label').textContent =
    'Logged in as ' + (localStorage.getItem('furonix_admin_username') || 'admin');
  document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    clearAdminToken();
    window.location.href = 'login.html';
  });

  let catRes = await adminGet('getCategories');
  if (catRes.success) currentCategories = catRes.data;

  await loadOverview();
}

// ============================================
// OVERVIEW
// ============================================
async function loadOverview() {
  const statBox = document.getElementById('stat-cards');
  const res = await adminGet('getDashboardStats');
  if (!res.success) { statBox.innerHTML = `<p class="text-red-500 col-span-full">${res.message}</p>`; return; }
  const s = res.data;
  const settingsRes = await adminGet('getSettings');
  const currency = (settingsRes.success && settingsRes.data.currency) || 'Rs.';

  const cards = [
    ['Total Orders', s.totalOrders, 'text-slate-900'],
    ['Total Sales', `${currency} ${Number(s.totalSales).toLocaleString()}`, 'text-blue-600'],
    ['Total Products', s.totalProducts, 'text-slate-900'],
    ['Low Stock Products', s.lowStockProducts, 'text-red-500'],
    ['Pending', s.pendingOrders, 'text-yellow-600'],
    ['Confirmed', s.confirmedOrders, 'text-blue-600'],
    ['Shipped', s.shippedOrders, 'text-indigo-600'],
    ['Delivered', s.deliveredOrders, 'text-green-600'],
  ];
  statBox.innerHTML = cards.map(c => `
    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
      <p class="text-sm font-medium text-slate-500 mb-1">${c[0]}</p>
      <h3 class="text-2xl font-black ${c[2]}">${c[1]}</h3>
    </div>
  `).join('');

  const ordersRes = await adminGet('getOrders');
  const body = document.getElementById('recent-orders-body');
  if (!ordersRes.success || ordersRes.data.length === 0) {
    body.innerHTML = `<tr><td class="px-6 py-4 text-slate-400" colspan="5">No orders yet.</td></tr>`;
    return;
  }
  const badgeColors = {
    Pending: 'bg-yellow-100 text-yellow-700', Confirmed: 'bg-blue-100 text-blue-700',
    Processing: 'bg-indigo-100 text-indigo-700', Shipped: 'bg-purple-100 text-purple-700',
    Delivered: 'bg-green-100 text-green-700', Cancelled: 'bg-red-100 text-red-700'
  };
  body.innerHTML = ordersRes.data.slice(0, 6).map(o => `
    <tr class="hover:bg-slate-50">
      <td class="px-6 py-4 font-medium text-blue-600">${o.orderId}</td>
      <td class="px-6 py-4">${o.customerName}</td>
      <td class="px-6 py-4 font-medium">${currency} ${Number(o.total).toLocaleString()}</td>
      <td class="px-6 py-4">${o.paymentMethod}</td>
      <td class="px-6 py-4"><span class="px-3 py-1 ${badgeColors[o.status] || 'bg-slate-100 text-slate-600'} rounded-full text-xs font-bold">${o.status}</span></td>
    </tr>
  `).join('');
}

// ============================================
// PRODUCTS
// ============================================
let productsCache = [];

async function loadProducts() {
  const body = document.getElementById('products-table-body');
  body.innerHTML = `<tr><td class="px-6 py-4 text-slate-400" colspan="6">Loading...</td></tr>`;
  const search = document.getElementById('product-search').value;
  const res = await adminGet('getProducts', { search: search });
  if (!res.success) { body.innerHTML = `<tr><td class="px-6 py-4 text-red-500" colspan="6">${res.message}</td></tr>`; return; }
  productsCache = res.data;
  if (productsCache.length === 0) {
    body.innerHTML = `<tr><td class="px-6 py-4 text-slate-400" colspan="6">No products found.</td></tr>`;
    return;
  }
  body.innerHTML = productsCache.map(p => `
    <tr class="hover:bg-slate-50">
      <td class="px-6 py-4 font-medium text-slate-900">${p.name}</td>
      <td class="px-6 py-4">${p.category}</td>
      <td class="px-6 py-4">Rs. ${Number(p.price).toLocaleString()}</td>
      <td class="px-6 py-4">${p.stock}</td>
      <td class="px-6 py-4"><span class="px-3 py-1 ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'} rounded-full text-xs font-bold">${p.status}</span></td>
      <td class="px-6 py-4">
        <button onclick="openProductModal('${p.productId}')" class="text-blue-600 font-medium text-sm hover:underline mr-3">Edit</button>
        <button onclick="deleteProductConfirm('${p.productId}')" class="text-red-500 font-medium text-sm hover:underline">Delete</button>
      </td>
    </tr>
  `).join('');
}
document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('product-search');
  if (search) search.addEventListener('keyup', (e) => { if (e.key === 'Enter') loadProducts(); });
});

function openProductModal(productId) {
  const p = productId ? productsCache.find(x => x.productId === productId) : null;
  const categoryOptions = currentCategories.map(c => `<option value="${c.name}" ${p && p.category === c.name ? 'selected' : ''}>${c.name}</option>`).join('');

  document.getElementById('modal-root').innerHTML = `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick="if(event.target===this) closeAdminModal()">
      <div class="bg-white rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold text-slate-900 mb-6">${p ? 'Edit Product' : 'Add Product'}</h3>
        <form id="product-form" class="space-y-4" onsubmit="saveProduct(event, ${p ? `'${p.productId}'` : 'null'})">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Name *</label>
            <input name="name" required value="${p ? p.name : ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Category *</label>
              <select name="category" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">${categoryOptions}</select>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Status</label>
              <select name="status" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active" ${!p || p.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="inactive" ${p && p.status === 'inactive' ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Price *</label>
              <input type="number" name="price" required min="0" value="${p ? p.price : ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Original Price</label>
              <input type="number" name="originalPrice" min="0" value="${p ? p.originalPrice : ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 mb-2">Stock *</label>
              <input type="number" name="stock" required min="0" value="${p ? p.stock : ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Image URL</label>
            <input name="images" value="${p ? p.images : ''}" placeholder="https://..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Description</label>
            <textarea name="description" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">${p ? p.description : ''}</textarea>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Specifications (one per line)</label>
            <textarea name="specifications" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">${p ? p.specifications : ''}</textarea>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" onclick="closeAdminModal()" class="flex-1 border border-slate-200 text-slate-700 rounded-full py-3 font-bold">Cancel</button>
            <button type="submit" class="flex-1 bg-blue-600 text-white rounded-full py-3 font-bold hover:bg-blue-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function saveProduct(e, productId) {
  e.preventDefault();
  const f = e.target;
  const data = {
    name: f.name.value.trim(), category: f.category.value, status: f.status.value,
    price: f.price.value, originalPrice: f.originalPrice.value || 0, stock: f.stock.value,
    images: f.images.value.trim(), description: f.description.value.trim(), specifications: f.specifications.value.trim()
  };
  const res = productId
    ? await adminPost('updateProduct', Object.assign({ productId }, data))
    : await adminPost('addProduct', data);
  if (!res.success) { toast(res.message, true); return; }
  closeAdminModal();
  toast(res.message);
  loadProducts();
}

async function deleteProductConfirm(productId) {
  if (!confirm('Delete this product?')) return;
  const res = await adminPost('deleteProduct', { productId });
  if (!res.success) { toast(res.message, true); return; }
  toast(res.message);
  loadProducts();
}

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
  const body = document.getElementById('orders-table-body');
  body.innerHTML = `<tr><td class="px-6 py-4 text-slate-400" colspan="7">Loading...</td></tr>`;
  const search = document.getElementById('order-search').value;
  const status = document.getElementById('order-status-filter').value;
  const res = await adminGet('getOrders', { search, status });
  if (!res.success) { body.innerHTML = `<tr><td class="px-6 py-4 text-red-500" colspan="7">${res.message}</td></tr>`; return; }
  if (res.data.length === 0) { body.innerHTML = `<tr><td class="px-6 py-4 text-slate-400" colspan="7">No orders found.</td></tr>`; return; }

  const statuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  body.innerHTML = res.data.map(o => `
    <tr class="hover:bg-slate-50">
      <td class="px-6 py-4 font-medium text-blue-600">${o.orderId}</td>
      <td class="px-6 py-4">${o.customerName}</td>
      <td class="px-6 py-4">${o.phone}</td>
      <td class="px-6 py-4 font-medium">Rs. ${Number(o.total).toLocaleString()}</td>
      <td class="px-6 py-4">${o.paymentMethod}</td>
      <td class="px-6 py-4">
        <select onchange="changeOrderStatus('${o.orderId}', this.value)" class="bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 text-xs outline-none">
          ${statuses.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td class="px-6 py-4"><button onclick="viewOrder('${o.orderId}')" class="text-blue-600 font-medium text-sm hover:underline">View</button></td>
    </tr>
  `).join('');
}
document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('order-search');
  const filter = document.getElementById('order-status-filter');
  if (search) search.addEventListener('keyup', (e) => { if (e.key === 'Enter') loadOrders(); });
  if (filter) filter.addEventListener('change', loadOrders);
});

async function changeOrderStatus(orderId, status) {
  const res = await adminPost('updateOrderStatus', { orderId, status });
  if (!res.success) { toast(res.message, true); loadOrders(); return; }
  toast('Order status updated');
  loadOrders();
}

async function viewOrder(orderId) {
  const res = await adminGet('getOrder', { orderId });
  if (!res.success) { toast(res.message, true); return; }
  const o = res.data;
  const itemsHtml = o.items.map(i => `
    <div class="flex justify-between text-sm py-1">
      <span>${i.productName} x ${i.quantity}</span>
      <span class="font-medium">Rs. ${Number(i.subtotal).toLocaleString()}</span>
    </div>
  `).join('');
  document.getElementById('modal-root').innerHTML = `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick="if(event.target===this) closeAdminModal()">
      <div class="bg-white rounded-3xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 class="text-xl font-bold text-slate-900 mb-4">Order ${o.orderId}</h3>
        <div class="text-sm space-y-1 text-slate-600 mb-4">
          <p><strong class="text-slate-900">Customer:</strong> ${o.customerName}</p>
          <p><strong class="text-slate-900">Phone:</strong> ${o.phone}</p>
          <p><strong class="text-slate-900">Email:</strong> ${o.email || '-'}</p>
          <p><strong class="text-slate-900">Address:</strong> ${o.address}, ${o.city}</p>
          <p><strong class="text-slate-900">Payment:</strong> ${o.paymentMethod}</p>
        </div>
        <hr class="my-3 border-slate-100">
        ${itemsHtml}
        <hr class="my-3 border-slate-100">
        <div class="flex justify-between text-sm"><span>Subtotal</span><span>Rs. ${Number(o.subtotal).toLocaleString()}</span></div>
        <div class="flex justify-between text-sm"><span>Delivery</span><span>Rs. ${Number(o.deliveryCharges).toLocaleString()}</span></div>
        <div class="flex justify-between font-bold text-lg mt-2"><span>Total</span><span>Rs. ${Number(o.total).toLocaleString()}</span></div>
        <button onclick="closeAdminModal()" class="w-full mt-6 border border-slate-200 rounded-full py-3 font-bold">Close</button>
      </div>
    </div>
  `;
}

// ============================================
// CATEGORIES
// ============================================
async function loadCategories() {
  const list = document.getElementById('categories-list');
  list.innerHTML = `<li class="text-slate-400 text-center py-6">Loading...</li>`;
  const res = await adminGet('getCategories');
  if (!res.success) { list.innerHTML = `<li class="text-red-500 text-center py-6">${res.message}</li>`; return; }
  currentCategories = res.data;
  if (currentCategories.length === 0) { list.innerHTML = `<li class="text-slate-400 text-center py-6">No categories yet.</li>`; return; }
  list.innerHTML = currentCategories.map(c => `
    <li class="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
      <span class="font-medium text-slate-900">${c.name}</span>
      <div>
        <button onclick="openCategoryModal('${c.categoryId}')" class="text-sm text-blue-600 font-medium hover:underline mr-3">Edit</button>
        <button onclick="deleteCategoryConfirm('${c.categoryId}')" class="text-sm text-red-500 font-medium hover:underline">Delete</button>
      </div>
    </li>
  `).join('');
}

function openCategoryModal(categoryId) {
  const c = categoryId ? currentCategories.find(x => x.categoryId === categoryId) : null;
  document.getElementById('modal-root').innerHTML = `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onclick="if(event.target===this) closeAdminModal()">
      <div class="bg-white rounded-3xl p-8 w-full max-w-sm">
        <h3 class="text-xl font-bold text-slate-900 mb-6">${c ? 'Edit Category' : 'Add Category'}</h3>
        <form class="space-y-4" onsubmit="saveCategory(event, ${c ? `'${c.categoryId}'` : 'null'})">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Name *</label>
            <input name="name" required value="${c ? c.name : ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">Status</label>
            <select name="status" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="active" ${!c || c.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${c && c.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" onclick="closeAdminModal()" class="flex-1 border border-slate-200 text-slate-700 rounded-full py-3 font-bold">Cancel</button>
            <button type="submit" class="flex-1 bg-blue-600 text-white rounded-full py-3 font-bold hover:bg-blue-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function saveCategory(e, categoryId) {
  e.preventDefault();
  const f = e.target;
  const data = { name: f.name.value.trim(), status: f.status.value };
  const res = categoryId
    ? await adminPost('updateCategory', Object.assign({ categoryId }, data))
    : await adminPost('addCategory', data);
  if (!res.success) { toast(res.message, true); return; }
  closeAdminModal();
  toast(res.message);
  loadCategories();
}

async function deleteCategoryConfirm(categoryId) {
  if (!confirm('Delete this category?')) return;
  const res = await adminPost('deleteCategory', { categoryId });
  if (!res.success) { toast(res.message, true); return; }
  toast(res.message);
  loadCategories();
}

// ============================================
// SETTINGS
// ============================================
async function loadSettings() {
  const res = await adminGet('getSettings');
  if (!res.success) { toast(res.message, true); return; }
  currentSettings = res.data;
  document.getElementById('setting-cod-fee').value = currentSettings.codDeliveryCharge || 300;
  document.getElementById('setting-advance-fee').value = currentSettings.advanceDeliveryCharge || 250;
  document.getElementById('setting-advance-method').value = currentSettings.advancePaymentMethod || '';
  document.getElementById('setting-account-title').value = currentSettings.advanceAccountTitle || '';
  document.getElementById('setting-account-number').value = currentSettings.advanceAccountNumber || '';
  document.getElementById('setting-instructions').value = currentSettings.advancePaymentInstructions || '';
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const settings = {
        codDeliveryCharge: document.getElementById('setting-cod-fee').value,
        advanceDeliveryCharge: document.getElementById('setting-advance-fee').value,
        advancePaymentMethod: document.getElementById('setting-advance-method').value,
        advanceAccountTitle: document.getElementById('setting-account-title').value,
        advanceAccountNumber: document.getElementById('setting-account-number').value,
        advancePaymentInstructions: document.getElementById('setting-instructions').value
      };
      const res = await adminPost('updateSettings', { settings });
      if (!res.success) { toast(res.message, true); return; }
      const msg = document.getElementById('settings-saved-msg');
      msg.classList.remove('hidden');
      setTimeout(() => msg.classList.add('hidden'), 2500);
    });
  }
});
