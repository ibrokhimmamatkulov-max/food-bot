require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const express = require('express');

// === CONFIG ===
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const ADMIN_ID = Number(process.env.ADMIN_ID || 5568760903);
const WEBAPP_URL = process.env.WEBAPP_URL || "https://food-bot-miniapp.onrender.com";
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN) {
  console.error("❌ BOT_TOKEN is not set. Add it in Render -> Environment.");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// --- simple in-memory session ---
bot.use(session({
  defaultSession: () => ({
    step: null,
    orderDraft: null
  })
}));

// Set default Menu Button (the one near the input field)
async function setDefaultMenuButton() {
  try {
    await bot.telegram.setChatMenuButton({
      menu_button: {
        type: 'web_app',
        text: 'Menu',
        web_app: { url: WEBAPP_URL }
      }
    });
    console.log("✅ Default Menu Button set to:", WEBAPP_URL);
  } catch (e) {
    console.error("⚠️ Failed to set chat menu button:", e.message);
  }
}

// /start handler (also shows an inline button inside chat)
bot.start(async (ctx) => {
  await setDefaultMenuButton();
  await ctx.reply(
    'Добро пожаловать! Нажмите кнопку ниже, чтобы открыть меню.',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Открыть меню', web_app: { url: WEBAPP_URL } }]
        ]
      }
    }
  );
});

// Handle data sent from the WebApp (cart submit)
bot.on('message', async (ctx, next) => {
  const msg = ctx.message;
  if (msg && msg.web_app_data && msg.web_app_data.data) {
    try {
      const data = JSON.parse(msg.web_app_data.data);
      // expected: { items: [...], total: number }
      ctx.session.orderDraft = {
        items: Array.isArray(data.items) ? data.items : [],
        total: Number(data.total || 0)
      };
      ctx.session.step = 'pavilion';
      await ctx.reply('Укажите номер павильона:');
      return;
    } catch (e) {
      console.error("Parse web_app_data error:", e);
      await ctx.reply('Не удалось обработать заказ, попробуйте ещё раз из меню.');
      return;
    }
  }
  return next();
});

// Text flow for pavilion -> phone -> send to admin
bot.on('text', async (ctx, next) => {
  const state = ctx.session;
  const text = (ctx.message.text || '').trim();

  if (state.step === 'pavilion') {
    // save pavilion, ask phone
    state.orderDraft = state.orderDraft || { items: [], total: 0 };
    state.orderDraft.pavilion = text;
    state.step = 'phone';
    await ctx.reply('Введите номер телефона:');
    return;
  }

  if (state.step === 'phone') {
    state.orderDraft.phone = text;
    // send order to admin
    const order = state.orderDraft;
    const itemsText = order.items.map(it => `• ${it.title} x${it.qty} — ${it.price}₽`).join('\n') || '—';
    const summary =
`🧾 Новый заказ
От: @${ctx.from.username || '-'} (id ${ctx.from.id})
Павильон: ${order.pavilion || '-'}
Телефон: ${order.phone || '-'}

Позиции:
${itemsText}

Итого: ${order.total || 0}₽`;

    try {
      await ctx.telegram.sendMessage(ADMIN_ID, summary);
    } catch (e) {
      console.error("Failed to notify admin:", e.message);
    }

    await ctx.reply('Спасибо! Заказ отправлен администратору ✅');
    // reset session
    state.step = null;
    state.orderDraft = null;
    return;
  }

  return next();
});

// Fallback for other messages
bot.hears(/меню|menu|start/i, async (ctx) => {
  await ctx.reply('Откройте меню по кнопке ниже или в кнопке рядом с полем ввода.', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Открыть меню', web_app: { url: WEBAPP_URL } }]
      ]
    }
  });
});

// --- Mini health server so Render has a process and a health endpoint ---
const app = express();
app.get('/healthz', (req, res) => res.send('ok'));
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

bot.launch().then(async () => {
  await setDefaultMenuButton();
  console.log('🤖 Бот запущен. WebApp URL:', WEBAPP_URL);
}).catch((e) => {
  console.error('Bot launch error:', e);
  process.exit(1);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));