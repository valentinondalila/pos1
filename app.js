const initialProducts = [
  { id: "p1", name: "Market flowers", category: "Fresh finds", price: 12, stock: 18, icon: "🌷", tint: "#f7ece7" },
  { id: "p2", name: "Daily coffee", category: "Food & drink", price: 4.5, stock: 32, icon: "☕", tint: "#f2eadf" },
  { id: "p3", name: "Canvas tote", category: "Accessories", price: 18, stock: 12, icon: "👜", tint: "#e7efe8" },
  { id: "p4", name: "Handmade soap", category: "Self care", price: 8, stock: 21, icon: "🧼", tint: "#eee9f3" },
  { id: "p5", name: "Citrus candle", category: "Home goods", price: 16, stock: 9, icon: "🕯️", tint: "#f5efd9" },
  { id: "p6", name: "Journal", category: "Stationery", price: 11, stock: 14, icon: "📓", tint: "#e7edf1" },
  { id: "p7", name: "Wild honey", category: "Food & drink", price: 9.5, stock: 16, icon: "🍯", tint: "#f6eddd" },
  { id: "p8", name: "Little plant", category: "Home goods", price: 14, stock: 7, icon: "🪴", tint: "#e8eee3" },
  { id: "p9", name: "Gift wrap", category: "Accessories", price: 3, stock: 40, icon: "🎁", tint: "#f4e7e5" },
];

const storageKeys = { products: "valentino-pos-products", orders: "valentino-pos-orders" };
const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { showToast("Browser storage is unavailable; changes may not be saved."); }
};
const money = (amount) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
const $ = (selector) => document.querySelector(selector);
let products = load(storageKeys.products, initialProducts);
let orders = load(storageKeys.orders, []);
let cart = new Map();
let activeCategory = "All products";
let searchTerm = "";
let toastTimer;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function renderCategories() {
  const categories = ["All products", ...new Set(products.map((product) => product.category))];
  if (!categories.includes(activeCategory)) activeCategory = "All products";
  $("#categories").innerHTML = categories.map((category) => `<button class="category ${category === activeCategory ? "active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("");
}

function renderProducts() {
  const visible = products.filter((product) => (activeCategory === "All products" || product.category === activeCategory) && `${product.name} ${product.category}`.toLowerCase().includes(searchTerm.toLowerCase()));
  $("#products").innerHTML = visible.length ? visible.map((product) => `<button class="product-card" data-product="${escapeHtml(product.id)}" ${product.stock < 1 ? "disabled" : ""}>
    <span class="stock ${product.stock > 0 && product.stock < 5 ? "low" : ""}">${product.stock < 1 ? "Sold out" : `${product.stock} left`}</span>
    <span class="product-emoji" style="background:${safeTint(product.tint)}">${escapeHtml(product.icon)}</span><span class="product-category">${escapeHtml(product.category)}</span><span class="product-name">${escapeHtml(product.name)}</span><span class="product-price">${money(product.price)}</span>
  </button>`).join("") : `<p class="no-products">No matches. Try a different search or add a product.</p>`;
}

function safeTint(value) { return /^#[\da-f]{6}$/i.test(value) ? value : "#e8eee3"; }

function total() {
  return [...cart].reduce((sum, [id, quantity]) => sum + (products.find((item) => item.id === id)?.price || 0) * quantity, 0);
}

function renderCart() {
  const entries = [...cart];
  $("#cart-items").innerHTML = entries.length ? entries.map(([id, quantity]) => {
    const product = products.find((item) => item.id === id);
    if (!product) return "";
    return `<div class="cart-line"><div><div class="cart-line-name">${escapeHtml(product.name)}</div><div class="cart-line-price">${money(product.price)} each</div></div><div class="quantity"><button data-quantity="${escapeHtml(id)}" data-change="-1" aria-label="Remove one">−</button><span>${quantity}</span><button data-quantity="${escapeHtml(id)}" data-change="1" aria-label="Add one">+</button></div><div class="line-total">${money(product.price * quantity)}</div></div>`;
  }).join("") : `<div class="empty-cart"><i>＋</i><strong>Your sale starts here</strong><span>Add something from the catalog.</span></div>`;
  $("#subtotal").textContent = money(total());
  $("#total").textContent = money(total());
  $("#checkout-total").textContent = `${money(total())} →`;
  $("#checkout").disabled = cart.size === 0;
}

function renderOrders() {
  const todayOrders = orders.filter((order) => new Date(order.createdAt).toDateString() === new Date().toDateString());
  const dailyTotal = todayOrders.reduce((sum, order) => sum + order.total, 0);
  $("#order-count").textContent = orders.length;
  $("#summary-sales").textContent = money(dailyTotal);
  $("#summary-count").textContent = todayOrders.length;
  $("#summary-average").textContent = money(todayOrders.length ? dailyTotal / todayOrders.length : 0);
  $("#orders-empty").hidden = orders.length > 0;
  $("#orders").innerHTML = [...orders].reverse().map((order) => `<tr><td><span class="order-id">${escapeHtml(order.id)}</span></td><td>${escapeHtml(order.customer || "Walk-in")}</td><td>${order.items.reduce((sum, item) => sum + item.quantity, 0)} items</td><td>${new Date(order.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td><td class="order-total">${money(order.total)}</td></tr>`).join("");
}

function renderInventory() {
  const query = $("#inventory-search").value.trim().toLowerCase();
  const visible = products.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query));
  $("#product-count").textContent = products.length;
  $("#inventory").innerHTML = visible.map((product) => `<tr><td><span class="inventory-product"><span class="product-emoji" style="background:${safeTint(product.tint)}">${escapeHtml(product.icon)}</span><strong>${escapeHtml(product.name)}</strong></span></td><td>${escapeHtml(product.category)}</td><td>${money(product.price)}</td><td class="${product.stock < 5 ? "low-stock" : ""}">${product.stock}</td><td><button class="table-action" data-stock="${escapeHtml(product.id)}" data-change="-1" aria-label="Remove one from stock">−</button> <button class="table-action" data-stock="${escapeHtml(product.id)}" data-change="1" aria-label="Add one to stock">+</button></td></tr>`).join("");
}

function renderAll() { renderCategories(); renderProducts(); renderCart(); renderOrders(); renderInventory(); }

function addToCart(id, change = 1) {
  const product = products.find((item) => item.id === id);
  if (!product) return;
  const quantity = (cart.get(id) || 0) + change;
  if (quantity > product.stock) return showToast("There isn’t enough stock for that quantity.");
  if (quantity < 1) cart.delete(id); else cart.set(id, quantity);
  renderCart();
}

function checkout() {
  if (!cart.size) return;
  const items = [...cart].map(([id, quantity]) => {
    const product = products.find((item) => item.id === id);
    return { id, name: product.name, price: product.price, quantity };
  });
  const order = { id: `V-${Date.now().toString().slice(-7)}`, customer: $("#customer").value.trim(), note: $("#note").value.trim(), items, total: total(), createdAt: new Date().toISOString() };
  for (const item of items) products.find((product) => product.id === item.id).stock -= item.quantity;
  orders.push(order);
  save(storageKeys.products, products);
  save(storageKeys.orders, orders);
  $("#receipt-message").textContent = `${items.reduce((sum, item) => sum + item.quantity, 0)} items${order.customer ? ` for ${order.customer}` : " sold"}. Thank you for supporting Valentino.`;
  $("#receipt-total").textContent = money(order.total);
  $("#receipt-id").textContent = `${order.id} · ${new Date(order.createdAt).toLocaleString()}${order.note ? ` · ${order.note}` : ""}`;
  $("#receipt-dialog").showModal();
  cart.clear();
  $("#customer").value = "";
  $("#note").value = "";
  renderAll();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function navigate(view) {
  const labels = { sale: "New sale", orders: "Orders", inventory: "Inventory", policies: "Store policies" };
  document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === `${view}-view`));
  document.querySelectorAll(".nav-item[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $("#page-title").textContent = labels[view] || labels.sale;
  if (view === "orders") renderOrders();
  if (view === "inventory") renderInventory();
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) return navigate(nav.dataset.view);
  const category = event.target.closest("[data-category]");
  if (category) { activeCategory = category.dataset.category; renderCategories(); renderProducts(); }
  const product = event.target.closest("[data-product]");
  if (product) addToCart(product.dataset.product);
  const quantity = event.target.closest("[data-quantity]");
  if (quantity) addToCart(quantity.dataset.quantity, Number(quantity.dataset.change));
  const stock = event.target.closest("[data-stock]");
  if (stock) {
    const item = products.find((entry) => entry.id === stock.dataset.stock);
    if (item) { item.stock = Math.max(0, item.stock + Number(stock.dataset.change)); save(storageKeys.products, products); renderAll(); }
  }
  if (event.target.closest("[data-open-product]")) $("#product-dialog").showModal();
});

$("#search").addEventListener("input", (event) => { searchTerm = event.target.value.trim(); renderProducts(); });
$("#inventory-search").addEventListener("input", renderInventory);
$("#checkout").addEventListener("click", checkout);
$("#clear-cart").addEventListener("click", () => { if (cart.size) { cart.clear(); renderCart(); showToast("Sale cleared."); } });
$("#close-product").addEventListener("click", () => $("#product-dialog").close());
$("#cancel-product").addEventListener("click", () => $("#product-dialog").close());
$("#product-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("#new-name").value.trim();
  const category = $("#new-category").value.trim();
  const price = Number($("#new-price").value);
  const stock = Number($("#new-stock").value);
  if (!name || !category || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) return;
  const tints = ["#e8eee3", "#f5e9df", "#e6edf0", "#f2e9ed", "#f2efd9"];
  const icons = ["✳", "◇", "❋", "◈", "✿"];
  products.push({ id: `p${Date.now()}`, name, category, price, stock, icon: icons[products.length % icons.length], tint: tints[products.length % tints.length] });
  save(storageKeys.products, products);
  $("#product-form").reset();
  $("#new-stock").value = "10";
  $("#product-dialog").close();
  renderAll();
  showToast(`${name} added to inventory.`);
});
$("#receipt-dialog").addEventListener("close", () => navigate("sale"));
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName) && !$("#product-dialog").open && !$("#receipt-dialog").open) { event.preventDefault(); $("#search").focus(); }
  if (event.key === "1" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) navigate("sale");
});

$("#today-label").textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
function updateClock() { $("#sale-clock").textContent = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }); }
updateClock();
setInterval(updateClock, 60_000);
renderAll();