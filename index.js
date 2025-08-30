require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Хранилище заказов во временной памяти
let orders = {};

// Обработка данных из мини-приложения
app.post('/web-data', (req, res) => {
  const { userId, cart } = req.body;

  if (!userId || !cart || cart.length === 0) {
    return res.status(400).send('Invalid request');
  }

  orders[userId] = { cart, step: 'waiting_pavilion' };

  bot.telegram.sendMessage(
    userId,
    '📦 Ваш заказ принят! Укажите номер павильона:'
  );

  res.sendStatus(200);
});

// Обработка сообщений от пользователя (пошаговая цепочка)
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  if (!orders[userId]) return;

  if (orders[userId].step === 'waiting_pavilion') {
    orders[userId].pavilion = ctx.message.text;
    orders[userId].step = 'waiting_phone';
    return ctx.reply('Введите ваш номер телефона:');
  }

  if (orders[userId].step === 'waiting_phone') {
    orders[userId].phone = ctx.message.text;
    orders[userId].step = 'done';

    let orderText = '📦 Новый заказ!\n\n';
    orders[userId].cart.forEach((item, i) => {
      orderText += `${i + 1}. ${item.title} × ${item.quantity}\n`;
    });
    orderText += `\n🏬 Павильон: ${orders[userId].pavilion}`;
    orderText += `\n📞 Телефон: ${orders[userId].phone}`;

    // Отправляем админу
    await bot.telegram.sendMessage(process.env.ADMIN_ID, orderText);
    await ctx.reply('✅ Ваш заказ отправлен администратору! Спасибо!');

    delete orders[userId];
  }
});

// Кнопка "Меню"
bot.start((ctx) => {
  ctx.reply('Добро пожаловать! Откройте меню ниже 👇', Markup.keyboard([
    [Markup.button.webApp('🍴 Меню', process.env.APP_URL)]
  ]).resize());
});

// Запуск
bot.launch();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));
