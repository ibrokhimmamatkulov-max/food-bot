const menuRoot = document.getElementById('menu');
const cartRoot = document.getElementById('cart');
const totalEl = document.getElementById('total');
const orderBtn = document.getElementById('orderBtn');

const cart = new Map(); // key: id, value: {id,title,price,qty}

function renderMenu() {
  menuRoot.innerHTML = '';
  window.MENU.forEach(item => {
    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML = `
      <div>
        <div class="item-title">${item.title}</div>
        <div>${item.price} ₽</div>
      </div>
      <div class="controls" data-id="${item.id}">
        <button class="dec">-</button>
        <span class="qty">${cart.get(item.id)?.qty || 0}</span>
        <button class="inc">+</button>
      </div>
    `;
    menuRoot.appendChild(row);
  });
}

function renderCart() {
  cartRoot.innerHTML = '';
  let total = 0;
  for (const it of cart.values()) {
    total += it.qty * it.price;
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div>
        <div class="item-title">${it.title}</div>
        <div>${it.price} ₽ x ${it.qty}</div>
      </div>
      <div class="controls" data-id="${it.id}">
        <button class="dec">-</button>
        <span class="qty">${it.qty}</span>
        <button class="inc">+</button>
      </div>
    `;
    cartRoot.appendChild(row);
  }
  totalEl.textContent = total;
}

function bump(id, delta) {
  const src = window.MENU.find(x => x.id === id);
  if (!src) return;
  const prev = cart.get(id) || { ...src, qty: 0 };
  let nextQty = prev.qty + delta;
  if (nextQty < 0) nextQty = 0;
  if (nextQty === 0) cart.delete(id);
  else cart.set(id, { ...prev, qty: nextQty });
  renderMenu();
  renderCart();
}

function wireControls(rootEl) {
  rootEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const wrap = e.target.closest('.controls');
    if (!wrap) return;
    const id = Number(wrap.dataset.id);
    if (btn.classList.contains('inc')) bump(id, +1);
    if (btn.classList.contains('dec')) bump(id, -1);
  });
}

orderBtn.addEventListener('click', () => {
  let total = 0;
  const items = Array.from(cart.values()).map(it => {
    total += it.qty * it.price;
    return { id: it.id, title: it.title, price: it.price, qty: it.qty };
  });
  if (!items.length) {
    alert('Корзина пуста');
    return;
  }
  const payload = { items, total };
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.sendData(JSON.stringify(payload));
    Telegram.WebApp.close();
  } else {
    alert('Откройте через Telegram');
  }
});

renderMenu();
renderCart();
wireControls(document);