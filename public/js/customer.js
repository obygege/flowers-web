const customerToken = () => localStorage.getItem('customer_token');
const customerUser = () => { try { return JSON.parse(localStorage.getItem('customer_user') || 'null'); } catch { return null; } };
const money = value => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const safe = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const customerTranslations = {
  id: { home: 'Beranda', search: 'Cari', login: 'Masuk', register: 'Daftar', favorites: 'Favorit', cart: 'Keranjang', logout: 'Keluar', back: 'Kembali ke beranda', order: 'Pesan', empty: 'Belum ada data.', rate: 'Beri rating', review: 'Tulis ulasan', send: 'Kirim rating' },
  en: { home: 'Home', search: 'Search', login: 'Login', register: 'Register', favorites: 'Favorites', cart: 'Cart', logout: 'Logout', back: 'Back to home', order: 'Order', empty: 'No data yet.', rate: 'Rate this product', review: 'Write a review', send: 'Submit rating' }
};
const customerLang = () => localStorage.getItem('mahira-lang') || 'id';
function setCustomerLanguage(lang) { localStorage.setItem('mahira-lang', lang); document.documentElement.lang = lang; document.querySelectorAll('[data-customer-text]').forEach(el => { const key = el.dataset.customerText; if (customerTranslations[lang][key]) el.textContent = customerTranslations[lang][key]; }); document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang)); const pageCopy = { '/search': ['Search products', 'Find arrangements by name, category, or description.'], '/favorites': ['Your favorites', 'Arrangements you want to save for later.'], '/cart': ['Cart', 'Manage your arrangements before sending an order request.'], '/login': ['Sign in to your account', 'Save favorites and manage your cart.'], '/register': ['Create an account', 'Use your account to save favorites and cart items.'] }; const copy = pageCopy[location.pathname]; if (copy) { const heading = document.querySelector('main h1'); const intro = document.querySelector('main .page-heading .muted, main .form-panel > .muted'); if (heading && lang === 'en') heading.textContent = copy[0]; if (intro && lang === 'en') intro.textContent = copy[1]; } }
function customerLanguageSwitch() { const header = document.querySelector('.customer-header'); if (!header || header.querySelector('.customer-language')) return; const switcher = document.createElement('div'); switcher.className = 'customer-language'; switcher.innerHTML = '<button type="button" class="lang-btn" data-lang="id">ID</button><button type="button" class="lang-btn" data-lang="en">EN</button>'; header.appendChild(switcher); switcher.addEventListener('click', event => { if (event.target.matches('.lang-btn')) setCustomerLanguage(event.target.dataset.lang); }); setCustomerLanguage(customerLang()); }
async function customerFetch(url, options = {}) {
  options.headers = { ...(options.headers || {}), Authorization: `Bearer ${customerToken()}` };
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({ success: false, message: 'Respons server tidak valid' }));
  if (response.status === 401 || response.status === 403) { localStorage.removeItem('customer_token'); localStorage.removeItem('customer_user'); location.href = `/login?next=${encodeURIComponent(location.pathname)}`; throw new Error('Silakan login terlebih dahulu'); }
  if (!response.ok) throw new Error(data.message || 'Permintaan gagal');
  return data;
}
function requireCustomer() { if (!customerToken()) { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; return false; } return true; }
function customerHeader() {
  customerLanguageSwitch();
  if (!document.querySelector('link[rel="icon"]')) {
    const favicon = document.createElement('link'); favicon.rel = 'icon'; favicon.type = 'image/svg+xml'; favicon.href = '/images/logo.svg'; document.head.appendChild(favicon);
  }
  const main = document.querySelector('main.page-shell');
  if (main && !main.querySelector('.back-link')) {
    const back = document.createElement('a'); back.className = 'back-link'; back.href = '/'; back.dataset.customerText = 'back'; back.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Kembali ke beranda'; main.prepend(back);
  }
  const user = customerUser();
  const account = document.querySelector('[data-customer-account]');
  if (account) account.innerHTML = user ? `<span class="user-pill">${safe(user.name)}</span> <a href="/favorites" data-customer-text="favorites">Favorit</a> <a href="/cart" data-customer-text="cart">Keranjang</a> <a href="#" data-logout data-customer-text="logout">Keluar</a>` : '<a href="/login" data-customer-text="login">Masuk</a><a class="btn" href="/register" data-customer-text="register">Daftar</a>';
  setCustomerLanguage(customerLang());
  document.querySelector('[data-logout]')?.addEventListener('click', e => { e.preventDefault(); localStorage.removeItem('customer_token'); localStorage.removeItem('customer_user'); location.href = '/'; });
}
function ratingStars(product) { const rating = Number(product.average_rating || 0); return `<div class="rating-stars" aria-label="${rating} dari 5">${[1,2,3,4,5].map(i => `<button type="button" class="rating-star ${i <= Math.round(rating) ? 'is-filled' : ''}" data-rating-product="${product.id}" data-rating-value="${i}" aria-label="${i} bintang"><i class="fa-solid fa-star"></i></button>`).join('')}<small>${rating ? rating.toFixed(1) : '0.0'} (${product.review_count || 0})</small></div>`; }
function productCard(product, favorite = false) { return `<article class="product-card"><img src="${safe(product.image_url || '/images/logo.svg')}" alt="${safe(product.name)}" onerror="this.onerror=null;this.src='/images/logo.svg'"><div class="product-info"><h3>${safe(product.name)}</h3><p>${safe(product.description || 'Rangkaian bunga premium Mahira Flowers.')}</p><div class="price">${money(product.price)}</div>${ratingStars(product)}<div class="product-actions"><button class="btn btn-dark" data-cart="${product.id}" data-product-name="${safe(product.name)}" data-product-price="${money(product.price)}"><i class="fa-solid fa-bag-shopping"></i> <span data-customer-text="order">Pesan</span></button><button class="btn btn-light favorite-button" data-favorite="${product.id}" aria-label="Tambah ke favorit"><i class="fa-${favorite ? 'solid' : 'regular'} fa-heart"></i></button></div></div></article>`; }
async function addToCart(productId, productName = '', productPrice = '') {
  const target = `/?order=${encodeURIComponent(productId)}&name=${encodeURIComponent(productName)}&price=${encodeURIComponent(productPrice)}`;
  if (typeof window.openOrderModal === 'function') {
    window.openOrderModal(productId, productName, productPrice);
  } else {
    location.href = target;
  }
}
async function toggleFavorite(productId, button) { if (!requireCustomer()) return; try { const data = await customerFetch(`/api/favorites/${productId}`,{method:'POST'}); button.classList.toggle('active', data.active); button.innerHTML = `<i class="fa-${data.active ? 'solid' : 'regular'} fa-heart"></i>`; } catch (e) { alert(e.message); } }
document.addEventListener('click', e => { const cart = e.target.closest('[data-cart]'); if (cart) addToCart(cart.dataset.cart, cart.dataset.productName, cart.dataset.productPrice); const favorite = e.target.closest('[data-favorite]'); if (favorite) toggleFavorite(favorite.dataset.favorite, favorite); });
document.addEventListener('click', e => { const star = e.target.closest('[data-rating-product]'); if (star) submitRating(star.dataset.ratingProduct, star.dataset.ratingValue); });
async function submitRating(productId, rating) { if (!requireCustomer()) return; const reviewText = window.prompt(customerLang() === 'en' ? 'Write a short review:' : 'Tulis ulasan singkat:'); if (!reviewText) return; try { const data = await customerFetch(`/api/reviews/${productId}`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ rating: Number(rating), review_text: reviewText }) }); alert(data.message); location.reload(); } catch (error) { alert(error.message); } }
document.addEventListener('DOMContentLoaded', customerHeader);
