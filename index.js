require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID;

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Загружаем меню
let menu = JSON.parse(fs.readFileSync(path.join(__dirname, 'menu.json'), 'utf-8'));

// Команда /start
bot.start((ctx) => {
  ctx.reply(
    'Добро пожаловать! 👋\nНажмите кнопку ниже, чтобы открыть меню.',
    Markup.keyboard([['📖 Меню']]).resize()
  );
});

// Кнопка "📖 Меню"
bot.hears('📖 Меню', (ctx) => {
  ctx.reply(
    'Откройте меню:',
    Markup.inlineKeyboard([
      Markup.button.webApp('Открыть меню', process.env.MINIAPP_URL)
    ])
  );
});

// Обработка данных из мини-приложения
bot.on('web_app_data', async (ctx) => {
  try {
    const data = JSON.parse(ctx.message.web_app_data.data);

    if (!datadata.cart.length === 0) {
      return ctx.reply('❌ Корзина пуста.');
    }

    // Сохраняем заказ во временное хранилище (memory)
    ctx.session = { cart: data.cart };
    await ctx.reply('📝 Укажите номер павильона:');
    ctx.session.step = 'pavilion';
  } catch (e) {
    console.error(e);
    ctx.reply('Ошибка при обработке данных заказа.');
  }
});

// Логика пошагового ввода
bot.on('text', async (ctx) => {
  if (!ctx.session || !ctx.session.step) return;

  if (ctx.session.step === 'pavilion') {
    ctx.session.pavilion = ctx.message.text;
    ctx.session.step = 'phone';
    return ctx.reply('📞 Теперь введите номер телефона:');
  }

  if (ctx.session.step === 'phone') {
    ctx.session.phone = ctx.message.text;

    // Формируем заказ
    let orderText = "📦 Новый заказ!\n\n";
    ctx.session.cart.forEach((item, i) => {
    orderText += ${i + 1}. ${item.title} × ${item.quantity}\n;

    orderText += \n🏬 Павильон: ${ctx.session.pavilion};
    orderText += \n📞 Телефон: ${ctx.session.phone};

    // Отправляем админу
    await bot.telegram.sendMessage(ADMIN_ID, orderText);

    // Подтверждение клиенту
    await ctx.reply('✅ Ваш заказ принят! Ожидайте звонка.');

    // Сброс сессии
    ctx.session = null;
  }
});

// Запуск
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
  bot.launch();
});

// Корректное завершение
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));