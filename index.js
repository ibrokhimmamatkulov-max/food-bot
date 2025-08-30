require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const path = require('path');
const fs = require('fs');

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

// Загружаем меню
const menu = JSON.parse(fs.readFileSync(path.join(__dirname, 'menu.json'), 'utf-8'));

// Хранилище заказов
const userOrders = {};

// Кнопка "Меню" рядом с вводом текста
bot.telegram.setMyCommands([{ command: 'menu', description: 'Открыть меню' }]);

// Обработка команды /menu
bot.command('menu', (ctx) => {
  ctx.reply('Выберите действие:', Markup.inlineKeyboard([
    [Markup.button.webApp('Открыть меню', process.env.MINIAPP_URL)],
    [Markup.button.callback('Заказать', 'order')]
  ]));
});

// Обработка inline кнопки "Заказать"
bot.action('order', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session = {}; // сбросим сессию
  ctx.session.step = 'pavilion';
  await ctx.reply('Введите номер павильона:');
});

// Обработка сообщений после "Заказать"
bot.on('text', async (ctx) => {
  if (!ctx.session) ctx.session = {};

  if (ctx.session.step === 'pavilion') {
    ctx.session.pavilion = ctx.message.text;
    ctx.session.step = 'phone';
    return ctx.reply('Введите номер телефона:');
  }

  if (ctx.session.step === 'phone') {
    ctx.session.phone = ctx.message.text;
    ctx.session.step = null;

    // Отправка админу
    const orderMsg = `📦 Новый заказ

Павильон: ${ctx.session.pavilion}
Телефон: ${ctx.session.phone}`;
    await bot.telegram.sendMessage(process.env.ADMIN_ID, orderMsg);

    return ctx.reply('✅ Ваш заказ принят!');
  }
});

// Обработка данных из mini app
bot.on('web_app_data', async (ctx) => {
  const data = JSON.parse(ctx.webAppData.data);
  ctx.session = { step: 'pavilion', order: data };
  await ctx.reply('Введите номер павильона:');
});

// Запуск express
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('Food Bot is running');
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

bot.launch();
