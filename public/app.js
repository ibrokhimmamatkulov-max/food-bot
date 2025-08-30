async function loadMenu() {
  try {
    const res = await fetch('/menu');
    const menu = await res.json();
    const container = document.getElementById('menu');
    container.innerHTML = menu.map(item => 
      `<div><span>${item.img} ${item.name}</span> — ${item.price} TJS</div>`
    ).join('');
  } catch (err) {
    console.error('Ошибка загрузки меню', err);
  }
}
loadMenu();
