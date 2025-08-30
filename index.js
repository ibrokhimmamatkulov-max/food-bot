require('dotenv').config();
const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;
const APP_URL = process.env.APP_URL;

let menu = JSON.parse(fs.readFileSync('menu.json', 'utf8'));

// Команда /start
bot.start((ctx) => {
  ctx.reply(
    'Добро пожаловать! Нажмите кнопку, чтобы открыть меню.',
    Markup.keyboard([
      [Markup.button.webApp('📋 Меню', APP_URL)]
    ]).resize()
  );
});

// Обработка заказа из webApp
bot.on('web_app_data', async (ctx) => {
  try {
    const data = JSON.parse(ctx.message.web_app_data.data);
    if (data.type === 'order') {
      ctx.reply('Введите номер павильона:');
      ctx.session = { order: data.order, step: 'pavilion' };
    }
  } catch (err) {
    console.error(err);
  }
});

bot.on('text', async (ctx) => {
  if (!ctx.session) return;
  if (ctx.session.step === 'pavilion') {
    ctx.session.pavilion = ctx.message.text;
    ctx.reply('Введите номер телефона:');
    ctx.session.step = 'phone';
  } else if (ctx.session.step === 'phone') {
    ctx.session.phone = ctx.message.text;
    const orderText = ctx.session.order.map(
      (item) => `${item.name} x${item.quantity}`
    ).join('\n');

    await bot.telegram.sendMessage(
      ADMIN_ID,
      `📦 Новый заказ:\n${orderText}\n🏬 Павильон: ${ctx.session.pavilion}\n📞 Телефон: ${ctx.session.phone}`
    );
    ctx.reply('✅ Спасибо! Ваш заказ отправлен.');
    ctx.session = null;
  }
});

// Express webhook
app.use(express.json());
app.post(`/bot${process.env.BOT_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body, res);
});

app.get('/', (req, res) => res.send('Bot is running!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🌐 Server running on port ${PORT}`);
  await bot.telegram.setWebhook(`${process.env.RENDER_EXTERNAL_URL}/bot${process.env.BOT_TOKEN}`);
});
