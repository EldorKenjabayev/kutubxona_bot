// bots/user-bot/keyboards/bookList.js
const { Markup } = require('telegraf');

/**
 * Kitob uchun inline tugmalar yaratish
 * @param {Object} book - Kitob ma'lumotlari
 * @param {boolean} isAvailable - Kitob mavjudligi
 * @returns {Object} Inline tugmalar
 */
const getBookActionsKeyboard = (book, isAvailable = true) => {
  const buttons = [];
  
  if (isAvailable) {
    buttons.push(Markup.button.callback('✅ Band qilish', `book_${book.id}_reserve`));
  }
  
  buttons.push(Markup.button.callback('🔙 Orqaga', 'back_to_books'));
  
  return Markup.inlineKeyboard([buttons]);
};

module.exports = { getBookActionsKeyboard };