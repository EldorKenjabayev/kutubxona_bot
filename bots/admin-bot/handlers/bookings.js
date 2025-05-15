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
    
    // Faqat band qilingan yoki olib ketilgan kitoblarni olish
    const totalBookings = await db.Booking.count({
      where: {
        status: ['booked', 'taken']
      }
    });
    
    const totalPages = Math.ceil(totalBookings / BOOKINGS_PER_PAGE);
    
    // Agar band qilishlar bo'lmasa
    if (totalBookings === 0) {
      return ctx.reply('Hozircha band qilingan kitoblar yo\'q.');
    }
    
    // Joriy sahifani saqlash
    ctx.session.currentPage = page;
    ctx.session.totalPages = totalPages;
    ctx.session.pageType = 'bookings';
    
    // Sahifa uchun band qilishlarni olish
    const bookings = await db.Booking.findAll({
      where: {
        status: ['booked', 'taken']
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
    let message = `🔒 Band qilingan kitoblar (${page}/${totalPages}):\n\n`;
    
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
    
    // Raqam tugmalarini qator qilib joylashtirish (5 tadan)
    const keyboard = [];
    for (let i = 0; i < bookingButtons.length; i += 5) {
      keyboard.push(bookingButtons.slice(i, i + 5));
    }
    
    return ctx.reply(message, getPaginationKeyboard(page, totalPages, 'bookings'));
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

module.exports = { handleBookings, handleBookingDetails, handleConfirmTaken, handleCancelBooking };