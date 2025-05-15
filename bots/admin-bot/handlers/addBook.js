// bots/admin-bot/handlers/addBook.js
const { Markup } = require('telegraf');

/**
 * Kitob qo'shish uchun handler
 */
const handleAddBook = async (ctx) => {
  try {
    return ctx.scene.enter('addBook');
  } catch (error) {
    console.error('Kitob qo\'shishda xatolik:', error);
    await ctx.reply('Kitob qo\'shishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

module.exports = { handleAddBook };