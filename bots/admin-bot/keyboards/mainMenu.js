// bots/admin-bot/keyboards/mainMenu.js
const { Markup } = require('telegraf');

// Admin menyu klaviaturasi
const adminMenuKeyboard = {
  keyboard: [
    ['➕ Kitob qo\'shish', '📚 Kitoblar ro\'yxati'],
    ['🔒 Band qilingan kitoblar', '📊 Statistika'],
    ['👥 Foydalanuvchilar', '⛔️ Qora ro\'yxat'],
    ['🔍 Foydalanuvchilarni qidirish']
  ],
  resize_keyboard: true
};
module.exports = { adminMenuKeyboard };