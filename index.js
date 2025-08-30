require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const express = require('express');

// ====== ENV ======
const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_ID = process.env.ADMIN_ID || '';
const MINIAPP_URL = process.env.MINIAPP_URL || 'https://food-bot-miniapp.onrender.com';
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не задан. Установите переменную окружения BOT_TOKEN.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ====== STATE (session) ======
bot.use(session());

function ensureSession(ctx) {
  if (!ctx.session) ctx.session = {};
  if (!ctx.session.order) ctx.session.order = { items: [], total: 0, step: null, pavilion: null, phone: null };
}

// ====== Keyboards ======
const replyKbWithWebApp = () =>
  Markup.keyboard([Markup.button.webApp('🍽 Меню', MINIAPP_URL)]).resize();

const inlineMenuKb = () =>
  Markup.inlineKeyboard([
    [Markup.button.webApp('🍽 Открыть меню', MINIAPP_URL)],
    [Markup.button.webApp('🛒 Корзина', `${MINIAPP_URL}?cart=1`)],
  ]);

// ====== Helpers ======
function formatOrder(order, from) {
  const lines = [];
  lines.push(`🔔 <b>Новый заказ</b>`);
  if (from) {
    lines.push(`👤 Пользователь: <a href="tg://user?id=${from.id}">${from.first_name || ''} ${from.last_name || ''}</a> (@${from.username || '—'})`);
  }
  if (order.items?.length) {
    lines.push(`\n<b>Состав:</b>`);
    for (const it of order.items) {
      lines.push(`• ${it.title} × ${it.qty} = ${Number(it.price) * Number(it.qty)} сум`);
    }
  } else {
    lines.push(`\n(Пустой заказ — данные из мини‑приложения не получены)`);
  }
  lines.push(`\n🏬 Павильон: ${order.pavilion || '—'}`);
  lines.push(`📞 Телефон: ${order.phone || '—'}`);
  lines.push(`\n💰 Итого: ${order.total || 0} сум`);
  return lines.join('\n');
}

// ====== Bot Handlers ======
bot.start(async (ctx) => {
  ensureSession(ctx);
  try {
    await ctx.reply(
      '👋 Привет! Нажми кнопку ниже, чтобы открыть меню. После оформления заказа я спрошу номер павильона и телефон.',
      { ...replyKbWithWebApp() }
    );
    await ctx.reply('Или используй кнопки ниже:', inlineMenuKb());
  } catch (e) {
    console.error('start err:', e);
  }
});

bot.command('menu', async (ctx) => {
  try {
    await ctx.reply('Открыть меню или корзину:', inlineMenuKb());
  } catch (e) {
    console.error('menu err:', e);
  }
});

// Получение данных из мини‑приложения (tg.WebApp.sendData)
bot.on('message', async (ctx, next) => {
  ensureSession(ctx);
  const msg = ctx.message;
  if (msg && msg.web_app_data && msg.web_app_data.data) {
    try {
      const data = JSON.parse(msg.web_app_data.data);
      // ожидаем формат { items: [{id,title,price,qty}], total: number }
      ctx.session.order.items = Array.isArray(data.items) ? data.items : [];
      ctx.session.order.total = Number(data.total) || 0;
      ctx.session.order.step = 'ask_pavilion';
      await ctx.reply('🧾 Заказ получен. Укажите, пожалуйста, номер павильона:');
      return;
    } catch (e) {
      console.error('web_app_data parse error:', e);
      await ctx.reply('Не удалось обработать данные из мини‑приложения. Попробуйте ещё раз.');
      return;
    }
  }
  return next();
});

// Последовательность вопросов
bot.on('text', async (ctx, next) => {
  ensureSession(ctx);
  const step = ctx.session.order.step;
  const text = (ctx.message.text || '').trim();

  if (step === 'ask_pavilion') {
    ctx.session.order.pavilion = text;
    ctx.session.order.step = 'ask_phone';
    await ctx.reply('📞 Укажите номер телефона для связи (например, +99890...):');
    return;
  }

  if (step === 'ask_phone') {
    ctx.session.order.phone = text;
    ctx.session.order.step = null; // конец
    const orderText = formatOrder(ctx.session.order, ctx.from);

    // Отправляем админу
    if (ADMIN_ID) {
      try {
        await ctx.telegram.sendMessage(ADMIN_ID, orderText, { parse_mode: 'HTML', disable_web_page_preview: true });
      } catch (e) {
        console.error('send to admin err:', e);
      }
    }
    await ctx.reply('✅ Спасибо! Ваш заказ отправлен. Мы скоро свяжемся с вами.');
    return;
  }

  return next();
});

// Ответ на любые callback (если появятся)
bot.on('callback_query', async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch {}
});

// Запуск бота
(async () => {
  await bot.launch();
  console.log('🤖 Бот запущен (long polling). Если видите ошибку 409 — остановите локальный экземпляр бота.');
})();

// ====== Simple HTTP server for Render health checks ======
const app = express();
app.get('/', (req, res) => {
  res.send('Food Bot is running. Откройте меню в Telegram.');
});
app.get('/healthz', (req, res) => res.send('ok'));
app.listen(PORT, () => console.log(`🌐 HTTP server on :${PORT}`));

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
