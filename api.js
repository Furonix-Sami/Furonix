// ============================================
// API HELPER - connects this design to the real
// Google Apps Script + Google Sheets backend
// ============================================

async function apiGet(action, params) {
  params = params || {};
  let url = API_URL + "?action=" + encodeURIComponent(action);
  for (let key in params) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
      url += "&" + key + "=" + encodeURIComponent(params[key]);
    }
  }
  try {
    let res = await fetch(url);
    return await res.json();
  } catch (err) {
    return { success: false, message: "Could not connect to server. Please check your internet connection." };
  }
}

async function apiPost(action, data) {
  data = data || {};
  data.action = action;
  try {
    let res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    return { success: false, message: "Could not connect to server. Please check your internet connection." };
  }
}

// Escapes text before it's inserted into innerHTML, so that data coming
// from customers (order forms) or admins (product/category names) can
// never be interpreted as HTML/JS. ALWAYS wrap untrusted values with this
// before putting them inside a template string that goes into innerHTML.
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// admin token helpers
function getAdminToken() { return localStorage.getItem("furonix_admin_token") || ""; }
function setAdminToken(token, username) {
  localStorage.setItem("furonix_admin_token", token);
  localStorage.setItem("furonix_admin_username", username);
}
function clearAdminToken() {
  localStorage.removeItem("furonix_admin_token");
  localStorage.removeItem("furonix_admin_username");
}

// turns a backend product row into the shape this design's app.js expects
// (backend uses productId/images/stock, this design's UI expects id/image/stock)
// Google Drive's "uc?export=view" links often fail to render as <img src>
// (hotlink blocks / confirmation pages). This rewrites any Drive link -
// wherever it came from - into the reliable Drive thumbnail endpoint.
function driveImg(url) {
  if (!url) return url;
  const str = String(url);
  if (str.indexOf('drive.google.com') === -1) return str;
  const match = str.match(/[?&]id=([a-zA-Z0-9_-]+)/) || str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return str;
}

function mapProduct(p) {
  const imageList = String(p.images || "").split(",").map(s => driveImg(s.trim())).filter(Boolean);
  return {
    id: p.productId,
    name: p.name,
    category: p.category,
    price: Number(p.price),
    originalPrice: Number(p.originalPrice) || 0,
    discount: Number(p.discount) || 0,
    stock: Number(p.stock),
    image: imageList[0] || "",
    images: imageList,
    featured: String(p.featured).toLowerCase() === "true",
    description: p.description || "",
    specs: String(p.specifications || "").split("\n").map(s => s.trim()).filter(Boolean)
  };
}

// Loads real products / categories / delivery charges from the backend and
// exposes them as the SAME global names the existing page scripts expect:
// window.sampleProducts, window.categories, window.deliveryCharges
async function loadFuronixData() {
  let [productsRes, categoriesRes, settingsRes] = await Promise.all([
    apiGet("getProducts"),
    apiGet("getCategories"),
    apiGet("getSettings")
  ]);

  window.sampleProducts = productsRes.success ? productsRes.data.map(mapProduct) : [];

  let catNames = categoriesRes.success ? categoriesRes.data.map(c => c.name) : [];
  window.categories = ["All", ...catNames];

  let settings = settingsRes.success ? settingsRes.data : {};
  window.siteSettings = settings;
  window.deliveryCharges = {
    cod: Number(settings.codDeliveryCharge || 300),
    advance: Number(settings.advanceDeliveryCharge || 250)
  };

  return { products: window.sampleProducts, categories: window.categories, settings: settings };
}
