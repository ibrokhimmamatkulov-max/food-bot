require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const express = require('express');
const fs = require('fs');

// Загружаем меню
const menu = JSON.parse(fs.readFileSync('./menu.json', 'utf8'));

// Создаем бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Сессии для хранения состояния
bot.use(session());

// Стартовое сообщение
bot.start((ctx) => {
  ctx.reply(
    'Добро пожаловать! Используйте кнопку "Меню", чтобы открыть список блюд.',
    Markup.keyboard([['📋 Меню', '🛒 Корзина']]).resize()
  );
});

// Открыть меню
bot.hears('📋 Меню', (ctx) => {
  const buttons = menu.map((item) => [Markup.button.callback(item.title, `add_${item.id}`)]);
  ctx.reply('Выберите блюдо:', Markup.inlineKeyboard(buttons));
});

// Добавление в корзину
menu.forEach((item) => {
  bot.action(`add_${item.id}`, (ctx) => {
    if (!ctx.session.cart) ctx.session.cart = [];
    const existing = ctx.session.cart.find((i) => i.id === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      ctx.session.cart.push({ ...item, quantity: 1 });
    }
    ctx.answerCbQuery(`${item.title} добавлен в корзину`);
  });
});

// Просмотр корзины
bot.hears('🛒 Корзина', (ctx) => {
  const cart = ctx.session.cart || [];
  if (cart.length === 0) {
    return ctx.reply('Ваша корзина пуста');
  }
  let text = '🛒 Ваша корзина:\n\n';
  cart.forEach((item, i) => {
    text += ${i + 1}. ${item.title} × ${item.quantity}\n;
  });
  ctx.reply(text, Markup.inlineKeyboard([[Markup.button.callback('✅ Оформить заказ', 'checkout')]]));
});

// Оформление заказа
bot.action('checkout', (ctx) => {
  ctx.session.state = 'ask_pavilion';
  ctx.reply('Введите номер павильона:');
});

// Получение номера павильона
bot.on('text', (ctx, next) => {
  if (ctx.session.state === 'ask_pavilion') {
    ctx.session.pavilion = ctx.message.text;
    ctx.session.state = 'ask_phone';
    return ctx.reply('Введите ваш номер телефона:');
  }
  if (ctx.session.state === 'ask_phone') {
    ctx.session.phone = ctx.message.text;
    ctx.session.state = null;

    const cart = ctx.session.cart || [];
    if (cart.length === 0) return ctx.reply('Корзина пуста');

    // Формируем заказ
    let orderText = "📦 Новый заказ!\n\n";
    cart.forEach((item, i) => {
      orderText += ${i + 1}. ${item.title} × ${item.quantity}\n;
    });
    orderText += \n🏪 Павильон: ${ctx.session.pavilion}\n📞 Телефон: ${ctx.session.phone};

    // Отправляем админу
    bot.telegram.sendMessage(process.env.ADMIN_ID, orderText);

    // Подтверждение пользователю
    ctx.session.cart = [];
    return ctx.reply('✅ Ваш заказ принят! Ожидайте звонка.');
  }
  return next();
});

// Запуск Express сервера для вебхука
const app = express();
app.use(express.json());

app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.send('Бот работает!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🌐 Server running on port ${PORT}`);

  // Устанавливаем webhook
  await bot.telegram.setWebhook(`${process.env.RENDER_EXTERNAL_URL}/bot${process.env.BOT_TOKEN}`);
});