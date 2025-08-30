require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// Хранилище заказов
let orders = {};

// Обработка inline кнопки "Открыть меню"
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (data === 'open_menu') {
    await ctx.reply('Меню открыто! Теперь закажите блюда через Mini App.');
  }
});

// Обработка события из мини-приложения
app.post('/web-data', async (req, res) => {
  const { queryId, userId, items } = req.body;

  try {
    if (!items || items.length === 0) {
      return res.json({ ok: false });
    }

    // сохраняем заказ
    orders[userId] = { items, step: 'pavilion' };

    await bot.telegram.sendMessage(userId, 'Введите номер павильона:');
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.json({ ok: false });
  }
});

// Ловим ответы пользователя
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  if (!orders[userId]) return;

  if (orders[userId].step === 'pavilion') {
    orders[userId].pavilion = ctx.message.text;
    orders[userId].step = 'phone';
    await ctx.reply('Введите номер телефона:');
  } else if (orders[userId].step === 'phone') {
    orders[userId].phone = ctx.message.text;
    orders[userId].step = 'done';

    let orderText = `📦 Новый заказ!\n\n`;
    orders[userId].items.forEach((item, i) => {
      orderText += `${i + 1}. ${item.title} × ${item.quantity}\n`;
    });

    orderText += `\n🏬 Павильон: ${orders[userId].pavilion}`;
    orderText += `\n📞 Телефон: ${orders[userId].phone}`;

    // отправляем админу
    await bot.telegram.sendMessage(ADMIN_ID, orderText);
    await ctx.reply('✅ Заказ отправлен администратору! Спасибо!');

    delete orders[userId];
  }
});

// Webhook + сервер
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

bot.launch();
