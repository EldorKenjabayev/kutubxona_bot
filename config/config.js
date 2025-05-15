// config/config.js
require('dotenv').config();

module.exports = {
  // Bot konfiguratsiyasi
  userBot: {
    token: process.env.USER_BOT_TOKEN,
    name: 'kutuxona_online_www_bot'
  },
  adminBot: {
    token: process.env.ADMIN_BOT_TOKEN,
    name: 'kutubxona_adminnn_bot'
  },
  
  // Server konfiguratsiyasi
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
  },
  
  // Band qilish vaqtlari bilan bog'liq konfiguratsiya
  booking: {
    pickupTimeLimit: 24, // Soatlarda (kitob olib ketish uchun)
    maxBookingDuration: 10, // Kunlarda (eng ko'p band qilish muddati)
    reminderBeforeDays: 1 // Kitob qaytarish vaqti yaqinlashganda eslatma
  }
};