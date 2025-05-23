// bots/user-bot/keyboards/pagination.js
const { Markup } = require('telegraf');

/**
 * Paginatsiya uchun inline tugmalar yaratish
 * @param {number} currentPage - Joriy sahifa
 * @param {number} totalPages - Jami sahifalar soni
 * @param {string} type - Paginatsiya turi (books, search, etc.) 
 * @returns {Object} Inline tugmalar
 */
const getPaginationKeyboard = (currentPage, totalPages, type = 'books') => {
  const keyboard = [];
  
  // Sahifa raqamlari
  const pageButtons = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageButtons.push(Markup.button.callback(`${i}${i === currentPage ? ' ✓' : ''}`, `${type}_page_${i}`));
  }
  
  if (pageButtons.length > 0) {
    keyboard.push(pageButtons);
  }
  
  // Oldingi/keyingi sahifa tugmalari
  const navigationButtons = [];
  
  if (currentPage > 1) {
    navigationButtons.push(Markup.button.callback('⬅️ Oldingi', 'prev_page'));
  }
  
  if (currentPage < totalPages) {
    navigationButtons.push(Markup.button.callback('➡️ Keyingi', 'next_page'));
  }
  
  if (navigationButtons.length > 0) {
    keyboard.push(navigationButtons);
  }
  
  // Back link based on the type
  let backText = '🔙 Menyuga qaytish';
  let backAction = 'back_to_menu';
  
  if (type === 'books' || type === 'search') {
    backText = '🔙 Menyuga qaytish';
    backAction = 'back_to_menu';
  } else if (type === 'bookings') {
    backText = '🔙 Orqaga';
    backAction = 'bookings_main';
  } else if (type === 'blacklist') {
    backText = '🔙 Menyuga qaytish';
    backAction = 'back_to_menu';
  }
  
  keyboard.push([Markup.button.callback(backText, backAction)]);
  
  return {
    inline_keyboard: keyboard
  };
};

module.exports = { getPaginationKeyboard };