const { Telegraf, Markup } = require("telegraf");
const express = require("express");
const path = require("path");
require("dotenv").config();

const bot = new Telegraf("8392926117:AAE3cBrj4eEm7Zvo3OVqFbEc43Mkbx_EOPE");
const app = express();

app.use(express.static(path.join(__dirname, "public")));
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// === Хранилище заказов во временной памяти ===
const orders = {};
const ADMIN_ID = "5568760903";

// === Кнопка меню рядом с вводом текста ===
bot.telegram.setMyCommands([
  { command: "menu", description: "📋 Открыть меню" },
]);

// === Команда меню ===
bot.command("menu", (ctx) => {
  ctx.reply(
    "📋 Добро пожаловать! Выберите действие:",
    Markup.inlineKeyboard([
      [Markup.button.webApp("🍔 Открыть меню", "https://food-bot-miniapp.onrender.com")],
      [Markup.button.callback("🛒 Заказать", "make_order")],
    ])
  );
});

// === Кнопка в чате "Заказать" ===
bot.action("make_order", (ctx) => {
  const userId = ctx.from.id;
  orders[userId] = { step: "pavilion" };
  ctx.reply("🏢 Введите номер павильона:");
});

// === Обработка сообщений пользователя ===
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;

  if (orders[userId]) {
    const step = orders[userId].step;

    if (step === "pavilion") {
      orders[userId].pavilion = ctx.message.text;
      orders[userId].step = "phone";
      return ctx.reply("📱 Теперь введите ваш номер телефона:");
    }

    if (step === "phone") {
      orders[userId].phone = ctx.message.text;
      orders[userId].step = "done";

      // Отправляем заказ админу
      await ctx.telegram.sendMessage(
        ADMIN_ID,
        `📦 Новый заказ!\n\n👤 Клиент: ${ctx.from.first_name}\n🏢 Павильон: ${orders[userId].pavilion}\n📱 Телефон: ${orders[userId].phone}`
      );

      await ctx.reply("✅ Спасибо! Ваш заказ отправлен администратору.");
      delete orders[userId];
      return;
    }
  }
});

// === Запуск бота ===
if (process.env.RENDER_EXTERNAL_URL) {
  bot.telegram.setWebhook(`${process.env.RENDER_EXTERNAL_URL}/bot`);
  app.use(bot.webhookCallback("/bot"));
} else {
  bot.launch();
  console.log("🤖 Bot started with long polling");
}
