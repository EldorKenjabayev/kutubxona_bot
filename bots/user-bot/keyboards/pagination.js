// bots/user-bot/keyboards/pagination.js
const { Markup } = require('telegraf');

/**
 * Paginatsiya uchun inline tugmalar yaratish
 * @param {number} currentPage - Joriy sahifa
 * @param {number} totalPages - Jami sahifalar soni
 * @param {string} type - Paginatsiya turi (books, search, usw.) 
 * @returns {Object} Inline tugmalar
 */
const getPaginationKeyboard = (currentPage, totalPages, type = 'books') => {
  const buttons = [];
  
  // Sahifa raqamlari
  const pageButtons = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageButtons.push(Markup.button.callback(`${i}${i === currentPage ? ' ✓' : ''}`, `${type}_page_${i}`));
  }
  
  if (pageButtons.length > 0) {
    buttons.push(pageButtons);
  }
  
  // Oldingi/keyingi sahifa tugmalari
  const navigationButtons = [];
  
  if (currentPage > 1) {
    navigationButtons.push(Markup.button.callback('⬅️ Oldingi', 'prev_page'));
  }
  
  if (currentPage < totalPages) {
    navigationButtons.push(Markup.button.callback('Keyingi ➡️', 'next_page'));
  }
  
  if (navigationButtons.length > 0) {
    buttons.push(navigationButtons);
  }
  
  // Orqaga qaytish tugmasi
  buttons.push([Markup.button.callback('🔙 Menyuga qaytish', 'back_to_menu')]);
  
  return Markup.inlineKeyboard(buttons);
};

module.exports = { getPaginationKeyboard };