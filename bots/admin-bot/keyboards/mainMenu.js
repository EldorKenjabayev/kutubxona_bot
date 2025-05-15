// bots/admin-bot/keyboards/mainMenu.js
const { Markup } = require('telegraf');

// Admin menyu klaviaturasi
const adminMenuKeyboard = {
  keyboard: [
    ['➕ Kitob qo\'shish', '📚 Kitoblar ro\'yxati'],
    ['🔒 Band qilingan kitoblar', '📊 Statistika'],
    ['👥 Foydalanuvchilar']
  ],
  resize_keyboard: true
};

module.exports = { adminMenuKeyboard };