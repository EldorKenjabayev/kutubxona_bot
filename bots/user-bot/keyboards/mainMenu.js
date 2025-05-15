// bots/user-bot/keyboards/mainMenu.js
const { Markup } = require('telegraf');

// Asosiy menyu klaviaturasi
const mainMenuKeyboard = {
  keyboard: [
    ['📚 Kitoblar ro\'yxati', '📌 Band qilingan kitoblar'],
    ['🔍 Qidiruv', 'ℹ️ Ma\'lumot']
  ],
  resize_keyboard: true
};

module.exports = { mainMenuKeyboard };