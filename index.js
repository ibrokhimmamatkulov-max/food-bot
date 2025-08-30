require('dotenv').config();
const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const menu = JSON.parse(fs.readFileSync(path.join(__dirname, 'menu.json'), 'utf8'));

app.get('/menu', (req, res) => {
  res.json(menu);
});

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply('Добро пожаловать! Нажмите кнопку ниже, чтобы открыть меню.', 
    Markup.keyboard([['Открыть меню']]).resize()
  );
});

bot.hears('Открыть меню', (ctx) => {
  ctx.reply('Откройте меню кнопкой ниже:', 
    Markup.inlineKeyboard([
      Markup.button.webApp('Открыть меню', process.env.MINIAPP_URL)
    ])
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

bot.launch().then(() => console.log("🤖 Bot started"));
