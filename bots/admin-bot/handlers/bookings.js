// bots/admin-bot/handlers/bookings.js
const { Markup } = require('telegraf');
const db = require('../../../database/models');
const { getPaginationKeyboard } = require('../../user-bot/keyboards/pagination');
const { getBookingActionsKeyboard } = require('../keyboards/bookActions');
const { Op } = require('sequelize');
const { addDays } = require('../../../utils/dateUtils');

// Sahifa boshiga nechta band qilish ko'rsatish
const BOOKINGS_PER_PAGE = 5;

/**
 * Band qilingan kitoblar uchun handler
 */
const handleBookings = async (ctx, page = 1) => {
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
    }
    
    // Keyboard yaratish - band qilingan va olib ketilgan kitoblar uchun
    const mainKeyboard = {
      inline_keyboard: [
        [
          { text: '🔒 Band qilingan kitoblar', callback_data: 'show_booked' },
          { text: '📖 Olib ketilgan kitoblar', callback_data: 'show_taken' }
        ],
        [{ text: '🔙 Menyuga qaytish', callback_data: 'back_to_menu' }]
      ]
    };
    
    // Agar bu callback emas bo'lsa, asosiy menyuni ko'rsatish
    if (!ctx.callbackQuery || ctx.callbackQuery.data === 'bookings_main') {
      return ctx.reply('Band qilingan kitoblar bo\'limiga xush kelibsiz. Nimani ko\'rmoqchisiz?', {
        reply_markup: mainKeyboard
      });
    }
    
    // Agar kelgan callback ma'lumotlari band qilingan yoki olib ketilgan kitoblarni ko'rsatish bo'lsa
    if (!ctx.session.bookingType && ['show_booked', 'show_taken'].includes(ctx.callbackQuery.data)) {
      ctx.session.bookingType = ctx.callbackQuery.data === 'show_booked' ? 'booked' : 'taken';
    }
    
    // Qaysi turdagi kitoblarni ko'rsatish
    const bookingType = ctx.session.bookingType || 'booked';
    
    // Faqat band qilingan yoki olib ketilgan kitoblarni olish
    const totalBookings = await db.Booking.count({
      where: {
        status: bookingType
      }
    });
    
    const totalPages = Math.ceil(totalBookings / BOOKINGS_PER_PAGE);
    
    // Agar band qilishlar bo'lmasa
    if (totalBookings === 0) {
      let message = '';
      if (bookingType === 'booked') {
        message = 'Hozircha band qilingan kitoblar yo\'q.';
      } else {
        message = 'Hozircha olib ketilgan kitoblar yo\'q.';
      }
      
      return ctx.reply(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Orqaga', callback_data: 'bookings_main' }]
          ]
        }
      });
    }
    
    // Joriy sahifani saqlash
    ctx.session.currentPage = page;
    ctx.session.totalPages = totalPages;
    ctx.session.pageType = 'bookings';
    
    // Sahifa uchun band qilishlarni olish
    const bookings = await db.Booking.findAll({
      where: {
        status: bookingType
      },
      limit: BOOKINGS_PER_PAGE,
      offset: (page - 1) * BOOKINGS_PER_PAGE,
      order: [
        ['createdAt', 'DESC']
      ],
      include: [
        { model: db.User, as: 'user' },
        { model: db.Book, as: 'book' }
      ]
    });
    
    // Band qilishlar ro'yxatini ko'rsatish
    let messageTitle = bookingType === 'booked' ? 
      `🔒 Band qilingan kitoblar (${page}/${totalPages}):` : 
      `📖 Olib ketilgan kitoblar (${page}/${totalPages}):`;
    
    let message = `${messageTitle}\n\n`;
    
    bookings.forEach((booking, index) => {
      const bookingNumber = (page - 1) * BOOKINGS_PER_PAGE + index + 1;
      const user = booking.user;
      const book = booking.book;
      const bookingDate = new Date(booking.bookedAt).toLocaleDateString('uz-UZ');
      
      message += `${bookingNumber}. "${book.title}"\n`;
      message += `   👤 Foydalanuvchi: ${user.firstName} ${user.lastName}\n`;
      message += `   📱 Telefon: ${user.phoneNumber}\n`;
      message += `   🆔 Pasport: ${user.passportNumber}\n`;
      
      if (booking.status === 'booked') {
        const expiresDate = new Date(booking.expiresAt).toLocaleDateString('uz-UZ');
        const expiresTime = new Date(booking.expiresAt).toLocaleTimeString('uz-UZ');
        message += `   📅 Band qilingan: ${bookingDate}\n`;
        message += `   ⏳ Ekspiratsiya: ${expiresDate} ${expiresTime}\n`;
        message += `   ℹ️ Status: Band qilingan (olib ketilmagan)\n`;
      } else if (booking.status === 'taken') {
        const takenDate = new Date(booking.takenAt).toLocaleDateString('uz-UZ');
        const returnDate = new Date(booking.returnDate).toLocaleDateString('uz-UZ');
        message += `   📅 Olib ketilgan: ${takenDate}\n`;
        message += `   🔄 Qaytarish: ${returnDate}\n`;
        message += `   ℹ️ Status: Olib ketilgan\n`;
      }
      
      message += '\n';
    });
    
    message += 'Bandni tasdiqlash yoki bekor qilish uchun raqamni tanlang:';
    
    // Band qilishlar raqamlari uchun tugmalar
    const bookingButtons = bookings.map((booking, index) => {
      const bookingNumber = (page - 1) * BOOKINGS_PER_PAGE + index + 1;
      return { text: bookingNumber.toString(), callback_data: `booking_${booking.id}` };
    });
    
    // Raqam tugmalarini qator qilib joylashtirish
    const keyboard = [];
    for (let i = 0; i < bookingButtons.length; i += 5) {
      keyboard.push(bookingButtons.slice(i, i + 5));
    }
    
    // Navigatsiya tugmalari
    const navButtons = [];
    if (page > 1) {
      navButtons.push({ text: '⬅️ Oldingi', callback_data: 'prev_page' });
    }
    if (page < totalPages) {
      navButtons.push({ text: '➡️ Keyingi', callback_data: 'next_page' });
    }
    if (navButtons.length > 0) {
      keyboard.push(navButtons);
    }
    
    // Orqaga qaytish tugmasi
    keyboard.push([{ text: '🔙 Orqaga', callback_data: 'bookings_main' }]);
    
    return ctx.reply(message, {
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } catch (error) {
    console.error('Band qilishlarni olishda xatolik:', error);
    return ctx.reply('Band qilishlarni olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};
/**
 * Band qilish tafsilotlari uchun handler
 */
const handleBookingDetails = async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    // Band qilish ID sini olish
    const bookingId = ctx.match[1];
    
    // Band qilishni bazadan olish
    const booking = await db.Booking.findOne({
      where: { id: bookingId },
      include: [
        { model: db.User, as: 'user' },
        { model: db.Book, as: 'book' }
      ]
    });
    
    if (!booking) {
      return ctx.reply('Band qilish topilmadi.');
    }
    
    const user = booking.user;
    const book = booking.book;
    const bookingDate = new Date(booking.bookedAt).toLocaleDateString('uz-UZ');
    
    let message = `🔒 "${book.title}" kitobining band qilinishi:\n\n`;
    message += `👤 Foydalanuvchi: ${user.firstName} ${user.lastName}\n`;
    message += `📱 Telefon: ${user.phoneNumber}\n`;
    message += `🆔 Pasport: ${user.passportNumber}\n\n`;
    
    if (booking.status === 'booked') {
      const expiresDate = new Date(booking.expiresAt).toLocaleDateString('uz-UZ');
      const expiresTime = new Date(booking.expiresAt).toLocaleTimeString('uz-UZ');
      message += `📅 Band qilingan: ${bookingDate}\n`;
      message += `⏳ Ekspiratsiya: ${expiresDate} ${expiresTime}\n`;
      message += `ℹ️ Status: Band qilingan (olib ketilmagan)\n\n`;
      message += `Kitob olib ketilganini tasdiqlaysizmi?`;
    } else if (booking.status === 'taken') {
      const takenDate = new Date(booking.takenAt).toLocaleDateString('uz-UZ');
      const returnDate = new Date(booking.returnDate).toLocaleDateString('uz-UZ');
      message += `📅 Olib ketilgan: ${takenDate}\n`;
      message += `🔄 Qaytarish: ${returnDate}\n`;
      message += `ℹ️ Status: Olib ketilgan\n\n`;
      message += `Bu kitob band qilingani tasdiqlangan.`;
    } else {
      message += `ℹ️ Status: ${booking.status}\n`;
    }
    
    await ctx.reply(message, {
      reply_markup: getBookingActionsKeyboard(booking)
    });
  } catch (error) {
    console.error('Band qilish tafsilotlarini olishda xatolik:', error);
    return ctx.reply('Band qilish tafsilotlarini olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Kitob olib ketilganini tasdiqlash uchun handler
 */
const handleConfirmTaken = async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    // Band qilish ID sini olish
    const bookingId = ctx.match[1];
    
    // Band qilishni bazadan olish
    const booking = await db.Booking.findOne({
      where: { 
        id: bookingId,
        status: 'booked'
      },
      include: [
        { model: db.User, as: 'user' },
        { model: db.Book, as: 'book' }
      ]
    });
    
    if (!booking) {
      return ctx.reply('Band qilish topilmadi yoki allaqachon tasdiqlangan.');
    }
    
    // Transaksiya boshlanishi
    const transaction = await db.sequelize.transaction();
    
    try {
      const now = new Date();
      
      // Band qilish statusini "taken" ga o'zgartirish
      await booking.update({
        status: 'taken',
        takenAt: now,
        returnDate: addDays(now, booking.durationDays)
      }, { transaction });
      
      await transaction.commit();
      
      // Foydalanuvchiga xabar yuborish
      const userBot = require('../../user-bot').bot;
      await userBot.telegram.sendMessage(booking.user.telegramId, 
        `📚 Kitob olish tasdiqlandi!\n\n`
        + `"${booking.book.title}" kitobini olganingiz tasdiqlandi.\n`
        + `📅 Olgan sana: ${now.toLocaleDateString('uz-UZ')}\n`
        + `🔄 Qaytarish sana: ${new Date(booking.returnDate).toLocaleDateString('uz-UZ')}\n\n`
        + `Iltimos, kitobni o'z vaqtida qaytaring.`
      );
      
      await ctx.reply(`"${booking.book.title}" kitobini ${booking.user.firstName} ${booking.user.lastName} olib ketganini muvaffaqiyatli tasdiqladingiz!`);
      
      // Band qilishlar ro'yxatiga qaytish
      return handleBookings(ctx);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Kitob olib ketilganini tasdiqlashda xatolik:', error);
    return ctx.reply('Kitob olib ketilganini tasdiqlashda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Band qilishni bekor qilish uchun handler
 */
const handleCancelBooking = async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    // Band qilish ID sini olish
    const bookingId = ctx.match[1];
    
    // Band qilishni bazadan olish
    const booking = await db.Booking.findOne({
      where: { 
        id: bookingId,
        status: 'booked'
      },
      include: [
        { model: db.User, as: 'user' },
        { model: db.Book, as: 'book' }
      ]
    });
    
    if (!booking) {
      return ctx.reply('Band qilish topilmadi yoki allaqachon bekor qilingan.');
    }
    
    // Transaksiya boshlanishi
    const transaction = await db.sequelize.transaction();
    
    try {
      // Band qilishni bekor qilish
      await booking.update({
        status: 'cancelled'
      }, { transaction });
      
      // Kitob nusxalari sonini oshirish
      await db.Book.update(
        { availableCopies: booking.book.availableCopies + 1 },
        { where: { id: booking.bookId }, transaction }
      );
      
      await transaction.commit();
      
      // Foydalanuvchiga xabar yuborish
      const userBot = require('../../user-bot').bot;
      await userBot.telegram.sendMessage(booking.user.telegramId, 
        `❌ Kitob band qilish bekor qilindi!\n\n`
        + `"${booking.book.title}" kitobini band qilish admin tomonidan bekor qilindi.`
      );
      
      await ctx.reply(`"${booking.book.title}" kitobini ${booking.user.firstName} ${booking.user.lastName} band qilishini muvaffaqiyatli bekor qildingiz!`);
      
      // Band qilishlar ro'yxatiga qaytish
      return handleBookings(ctx);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Band qilishni bekor qilishda xatolik:', error);
    return ctx.reply('Band qilishni bekor qilishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Kitob qaytarilganini tasdiqlash uchun handler
 */
const handleConfirmReturned = async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    // Band qilish ID sini olish
    const bookingId = ctx.match[1];
    
    // Band qilishni bazadan olish
    const booking = await db.Booking.findOne({
      where: { 
        id: bookingId,
        status: 'taken'
      },
      include: [
        { model: db.User, as: 'user' },
        { model: db.Book, as: 'book' }
      ]
    });
    
    if (!booking) {
      return ctx.reply('Band qilish topilmadi yoki kitob olib ketilmagan.');
    }
    
    // Transaksiya boshlanishi
    const transaction = await db.sequelize.transaction();
    
    try {
      // Band qilishni "returned" qilish
      await booking.update({
        status: 'returned',
        returnedAt: new Date()
      }, { transaction });
      
      // Kitob nusxalari sonini oshirish
      await db.Book.update(
        { availableCopies: booking.book.availableCopies + 1 },
        { where: { id: booking.bookId }, transaction }
      );
      
      await transaction.commit();
      
      // Foydalanuvchiga xabar yuborish
      const userBot = require('../../user-bot').bot;
      await userBot.telegram.sendMessage(booking.user.telegramId, 
        `✅ Kitob qaytarilgani tasdiqlandi!\n\n`
        + `"${booking.book.title}" kitobini muvaffaqiyatli qaytardingiz.\n`
        + `Kitobxonligingiz uchun rahmat!`
      );
      
      await ctx.reply(`"${booking.book.title}" kitobini ${booking.user.firstName} ${booking.user.lastName} qaytarganini muvaffaqiyatli tasdiqladingiz!`);
      
      // Band qilishlar ro'yxatiga qaytish
      return handleBookings(ctx);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Kitob qaytarilganini tasdiqlashda xatolik:', error);
    return ctx.reply('Kitob qaytarilganini tasdiqlashda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Kitob qaytarilmaganini tasdiqlash uchun handler
 */
const handleConfirmNotReturned = async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    // Band qilish ID sini olish
    const bookingId = ctx.match[1];
    
    // Band qilishni bazadan olish
    const booking = await db.Booking.findOne({
      where: { 
        id: bookingId,
        status: 'taken'
      },
      include: [
        { model: db.User, as: 'user' },
        { model: db.Book, as: 'book' }
      ]
    });
    
    if (!booking) {
      return ctx.reply('Band qilish topilmadi yoki kitob olib ketilmagan.');
    }
    
    // Foydalanuvchini olish
    const user = booking.user;
    
    // BlackList service ni chaqirish
    const BlackListService = require('../../../services/blacklistService');
    
    // Foydalanuvchining kitob qaytarmaslik holatlarini tekshirish
    const notReturnedCount = await BlackListService.getUserViolationCount(user.id, 'not_returned');
    
    // Foydalanuvchiga ogohlantirish yuborish
    const userBot = require('../../user-bot').bot;
    await userBot.telegram.sendMessage(user.telegramId, 
      `❗️ OGOHLANTIRISH: Kitobni qaytarishingiz kerak!\n\n`
      + `Siz "${booking.book.title}" kitobini qaytarish muddati o'tganiga qaramay qaytarmadingiz.\n`
      + `Bu sizning ${notReturnedCount + 1}-chi ogohlantirishingiz.\n\n`
      + `❗️ Agar siz kitoblarni 3 marta o'z vaqtida qaytarmasangiz, botdan foydalanish huquqidan mahrum bo'lasiz.\n\n`
      + `Iltimos, kitobni tezda qaytaring.`
    );
    
    // Agar 3 marta bo'lsa, qora ro'yxatga qo'shish
    if (notReturnedCount >= 2) {
      // Qora ro'yxatga qo'shish
      await BlackListService.addUserToBlackList(user.id, 'not_returned');
      
      // Foydalanuvchiga xabar yuborish
      await userBot.telegram.sendMessage(user.telegramId, 
        `⛔️ Siz qora ro'yxatga tushirildingiz!\n\n`
        + `Siz kitoblarni muntazam ravishda o'z vaqtida qaytarmaganligi sababli, botdan foydalanish huquqidan mahrum bo'ldingiz.\n\n`
        + `Iltimos, kutubxona administratoriga murojaat qiling.`
      );
    }
    
    await ctx.reply(`"${booking.book.title}" kitobini ${user.firstName} ${user.lastName} qaytarmaganligi qayd qilindi!\n\nFoydalanuvchiga ogohlantirish yuborildi.`);
    
    // Band qilishlar ro'yxatiga qaytish
    return handleBookings(ctx);
  } catch (error) {
    console.error('Kitob qaytarilmaganini tasdiqlashda xatolik:', error);
    return ctx.reply('Kitob qaytarilmaganini tasdiqlashda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};



// Add this to the exports at the bottom:
module.exports = { 
  handleBookings, 
  handleBookingDetails, 
  handleConfirmTaken, 
  handleCancelBooking,
  handleConfirmReturned,
  handleConfirmNotReturned
};