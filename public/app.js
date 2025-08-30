const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.setHeaderColor('#0e0f13');
  tg.setBackgroundColor('#0e0f13');
}
const state = { items: [], cart: {} };
const els = {
  status: document.getElementById('status'),
  menu: document.getElementById('menu'),
  cartCount: document.getElementById('cartCount'),
  cartDrawer: document.getElementById('cartDrawer'),
  cartItems: document.getElementById('cartItems'),
  cartTotal: document.getElementById('cartTotal'),
  openCartBtn: document.getElementById('openCartBtn'),
  closeCartBtn: document.getElementById('closeCartBtn'),
  checkoutBtn: document.getElementById('checkoutBtn'),
  backdrop: document.getElementById('drawerBackdrop'),
};
const fmt = (n) => `${n.toLocaleString('ru-RU')} ₽`;
const cartEntries = () => Object.values(state.cart);
const cartTotal = () => cartEntries().reduce((s, i) => s + i.price * i.qty, 0);
const cartQty = () => cartEntries().reduce((s, i) => s + i.qty, 0);
function renderMenu() {
  els.menu.innerHTML = '';
  if (!state.items.length) {
    els.menu.innerHTML = `<div class="empty">Меню пустое</div>`;
    return;
  }
  state.items.forEach(item => {
    const card = document.createElement('div'); card.className = 'card';
    const img = document.createElement('img'); img.className = 'card__img';
    img.src = item.image || 'https://placehold.co/600x450/png?text=Food'; img.alt = item.title;
    const body = document.createElement('div'); body.className = 'card__body';
    const title = document.createElement('h3'); title.className = 'card__title'; title.textContent = item.title;
    const desc = document.createElement('p'); desc.className = 'card__desc'; desc.textContent = item.description || 'Вкусно и сытно';
    const row = document.createElement('div'); row.className = 'card__row';
    const price = document.createElement('div'); price.className = 'price'; price.textContent = fmt(item.price);
    const add = document.createElement('button'); add.className = 'btn add'; add.textContent = 'Добавить'; add.onclick = () => addToCart(item);
    row.append(price, add); body.append(title, desc, row); card.append(img, body); els.menu.append(card);
  });
}
function syncCartUI() {
  els.cartCount.textContent = cartQty();
  els.cartItems.innerHTML = '';
  if (!cartEntries().length) { els.cartItems.innerHTML = `<div class="empty">Корзина пуста</div>`; }
  else {
    cartEntries().forEach(it => {
      const row = document.createElement('div'); row.className = 'cart-row';
      const title = document.createElement('div'); title.className = 'cart-title'; title.textContent = it.title;
      const controls = document.createElement('div'); controls.className = 'qty';
      const minus = document.createElement('button'); minus.className = 'icon-btn'; minus.textContent = '−'; minus.onclick = () => decQty(it.id);
      const qty = document.createElement('span'); qty.textContent = it.qty;
      const plus = document.createElement('button'); plus.className = 'icon-btn'; plus.textContent = '+'; plus.onclick = () => incQty(it.id);
      controls.append(minus, qty, plus);
      const price = document.createElement('div'); price.className = 'cart-price'; price.textContent = fmt(it.price * it.qty);
      row.append(title, controls, price); els.cartItems.append(row);
    });
  }
  els.cartTotal.textContent = fmt(cartTotal());
}
function addToCart(item) { if (!state.cart[item.id]) state.cart[item.id] = { id: item.id, title: item.title, price: item.price, qty: 0 }; state.cart[item.id].qty++; syncCartUI(); }
function incQty(id) { if (state.cart[id]) { state.cart[id].qty++; syncCartUI(); } }
function decQty(id) { if (!state.cart[id]) return; state.cart[id].qty--; if (state.cart[id].qty <= 0) delete state.cart[id]; syncCartUI(); }
function openCart() { els.cartDrawer.classList.add('open'); els.backdrop.classList.add('show'); }
function closeCart() { els.cartDrawer.classList.remove('open'); els.backdrop.classList.remove('show'); }
els.openCartBtn.onclick = openCart; els.closeCartBtn.onclick = closeCart; els.backdrop.onclick = closeCart;
els.checkoutBtn.onclick = () => {
  const items = cartEntries(); if (!items.length) { toast('Корзина пуста'); return; }
  const payload = { action: 'checkout', items: items.map(i => ({ id: i.id, title: i.title, price: i.price, qty: i.qty })), total: cartTotal() };
  if (tg?.sendData) { tg.sendData(JSON.stringify(payload)); tg.close && tg.close(); }
  else { console.log('SEND DATA →', payload); alert('Заказ отправлен (режим браузера).'); }
};
function toast(text) { els.status.textContent = text; setTimeout(() => els.status.textContent = '', 2000); }
async function loadMenu() {
  try {
    const res = await fetch('/menu', { cache: 'no-store' });
    if (res.ok) { const data = await res.json(); if (Array.isArray(data) && data.length) { state.items = data; renderMenu(); return; } }
    state.items = [
      { id: '1', title: 'Плов', price: 250 }, { id: '2', title: 'Лагман', price: 270 },
      { id: '3', title: 'Манты', price: 240 }, { id: '4', title: 'Суп-шурпа', price: 230 },
      { id: '5', title: 'Самса', price: 120 }, { id: '6', title: 'Салат Оливье', price: 180 },
      { id: '7', title: 'Шашлык куриный', price: 320 }, { id: '8', title: 'Шашлык говяжий', price: 390 },
      { id: '9', title: 'Лепешка', price: 40 }, { id: '10', title: 'Чай зелёный', price: 60 }
    ]; renderMenu();
  } catch { state.items = [
      { id: '1', title: 'Плов', price: 250 }, { id: '2', title: 'Лагман', price: 270 },
      { id: '3', title: 'Манты', price: 240 }, { id: '4', title: 'Суп-шурпа', price: 230 },
      { id: '5', title: 'Самса', price: 120 }, { id: '6', title: 'Салат Оливье', price: 180 },
      { id: '7', title: 'Шашлык куриный', price: 320 }, { id: '8', title: 'Шашлык говяжий', price: 390 },
      { id: '9', title: 'Лепешка', price: 40 }, { id: '10', title: 'Чай зелёный', price: 60 }
    ]; renderMenu(); }
}
loadMenu(); syncCartUI();