const express = require("express");
const { Telegraf } = require("telegraf");
require("dotenv").config();

const TOKEN = process.env.BOT_TOKEN || "8392926117:AAE3cBrj4eEm7Zvo3OVqFbEc43Mkbx_EOPE";
const bot = new Telegraf(TOKEN);
const app = express();

// === маршруты для вебхука ===
app.use(bot.webhookCallback("/secret-path"));

// устанавливаем вебхук
bot.telegram.setWebhook("https://food-bot-backend-gfh7.onrender.com/secret-path");

// простой роут для проверки работы
app.get("/", (req, res) => {
  res.send("🤖 Bot is running via Render + Webhook!");
});

// === твои команды ===
bot.start((ctx) => ctx.reply("Привет! Я бот для заказов 🍔"));
bot.command("menu", (ctx) => ctx.reply("📋 Меню пока тестовое"));
bot.on("text", (ctx) => ctx.reply(`Вы написали: ${ctx.message.text}`));

// === запуск сервера ===
app.listen(3000, () => {
  console.log("🌐 Server running on port 3000");
});
