// bots/admin-bot/keyboards/bookActions.js
const { Markup } = require('telegraf');

/**
 * Kitob harakatlari uchun inline tugmalar yaratish
 * @param {Object} book - Kitob ma'lumotlari
 * @returns {Object} Inline tugmalar
 */
const getBookActionsKeyboard = (book) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✏️ Tahrirlash', `book_${book.id}_edit`),
      Markup.button.callback('🗑️ O\'chirish', `book_${book.id}_delete`)
    ],
    [Markup.button.callback('🔙 Orqaga', 'back_to_books')]
  ]);
};

/**
 * Band qilish harakatlari uchun inline tugmalar yaratish
 * @param {Object} booking - Band qilish ma'lumotlari
 * @returns {Object} Inline tugmalar
 */
const getBookingActionsKeyboard = (booking) => {
  // Agar booking statusi "booked" bo'lsa, tasdiqlash va bekor qilish tugmalarini ko'rsatish
  if (booking.status === 'booked') {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Tasdiqlash', `booking_${booking.id}_confirm`),
        Markup.button.callback('❌ Bekor qilish', `booking_${booking.id}_cancel`)
      ],
      [Markup.button.callback('🔙 Orqaga', 'back_to_bookings')]
    ]);
  } 
  // Agar status "taken" bo'lsa, qaytarildi va qaytarilmadi tugmalarini ko'rsatish
  else if (booking.status === 'taken') {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Qaytarildi', `booking_${booking.id}_returned`),
        Markup.button.callback('❌ Qaytarilmadi', `booking_${booking.id}_not_returned`)
      ],
      [Markup.button.callback('🔙 Orqaga', 'back_to_bookings')]
    ]);
  }
  
  // Agar boshqa status bo'lsa, faqat orqaga tugmasini ko'rsatish
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Orqaga', 'back_to_bookings')]
  ]);
};
module.exports = { getBookActionsKeyboard, getBookingActionsKeyboard };