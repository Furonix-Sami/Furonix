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
function mapProduct(p) {
  return {
    id: p.productId,
    name: p.name,
    category: p.category,
    price: Number(p.price),
    originalPrice: Number(p.originalPrice) || 0,
    discount: Number(p.discount) || 0,
    stock: Number(p.stock),
    image: String(p.images || "").split(",")[0].trim(),
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
