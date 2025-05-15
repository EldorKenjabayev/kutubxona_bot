// bots/user-bot/handlers/bookings.js
const { Markup } = require('telegraf');
const db = require('../../../database/models');
const { mainMenuKeyboard } = require('../keyboards/mainMenu');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');

/**
 * Band qilingan kitoblar uchun handler
 */
const handleBookings = async (ctx) => {
  try {
    // Agar foydalanuvchi ro'yxatdan o'tmagan bo'lsa
    if (!ctx.state.user) {
      return ctx.reply('Iltimos, avval ro\'yxatdan o\'ting.');
    }
    
    // Foydalanuvchining barcha band qilishlarini olish
    const bookings = await db.Booking.findAll({
      where: { userId: ctx.state.user.id },
      include: [
        { model: db.Book, as: 'book' }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Faol (booked, taken) va tarix (returned, cancelled) band qilishlarini ajratish
    const activeBookings = bookings.filter(booking => 
      booking.status === 'booked' || booking.status === 'taken'
    );
    
    const historyBookings = bookings.filter(booking => 
      booking.status === 'returned' || booking.status === 'cancelled'
    );
    
    // Agar band qilingan kitoblar bo'lmasa
    if (bookings.length === 0) {
      return ctx.reply('📌 Siz hali hech qanday kitob band qilmagansiz.');
    }
    
    // Faol band qilishlar
    if (activeBookings.length > 0) {
      let message = '📌 FAOL BAND QILISHLAR:\n\n';
      
      activeBookings.forEach((booking, index) => {
        const book = booking.book;
        const bookingDate = new Date(booking.bookedAt).toLocaleDateString('uz-UZ');
        
        message += `${index + 1}. "${book.title}" - ${book.author}\n`;
        message += `   📅 Band qilingan: ${bookingDate}\n`;
        
        if (booking.status === 'booked') {
          const expiresDate = new Date(booking.expiresAt).toLocaleDateString('uz-UZ');
          const expiresTime = new Date(booking.expiresAt).toLocaleTimeString('uz-UZ');
          message += `   ⏳ Ekspiratsiya vaqti: ${expiresDate} ${expiresTime}\n`;
          message += `   ℹ️ Status: Band qilingan (olib ketilmagan)\n`;
        } else if (booking.status === 'taken') {
          const returnDate = new Date(booking.returnDate).toLocaleDateString('uz-UZ');
          message += `   🔄 Qaytarish vaqti: ${returnDate}\n`;
          message += `   ℹ️ Status: Olib ketilgan\n`;
        }
      });
      
      // Agar faol band qilish bo'lsa va statusı "booked" bo'lsa - bekor qilish tugmasini ko'rsatish
      if (activeBookings.length > 0 && activeBookings[0].status === 'booked') {
        // Inline keyboard yaratish - Telegraf v4 syntaxisida
        const inlineKeyboard = Markup.inlineKeyboard([
          [Markup.button.callback('❌ Band qilishni bekor qilish', `cancel_booking_${activeBookings[0].id}`)]
        ]);
        
        logger.info(`Creating inline keyboard with cancel button for booking ID: ${activeBookings[0].id}`);
        
        await ctx.reply(message, inlineKeyboard);
      } else {
        await ctx.reply(message);
      }
    }
    
    // Tarixdagi band qilishlar
    if (historyBookings.length > 0) {
      let historyMessage = '📚 O\'QILGAN KITOBLAR TARIXI:\n\n';
      
      historyBookings.forEach((booking, index) => {
        const book = booking.book;
        const returnedDate = booking.returnedAt ? 
          new Date(booking.returnedAt).toLocaleDateString('uz-UZ') : 
          'Qaytarilmagan';
        
        historyMessage += `${index + 1}. "${book.title}" - ${book.author}\n`;
        
        if (booking.status === 'returned') {
          historyMessage += `   ✅ Qaytarilgan: ${returnedDate}\n`;
        } else if (booking.status === 'cancelled') {
          historyMessage += `   ❌ Bekor qilingan\n`;
        }
        
        historyMessage += '\n';
      });
      
      await ctx.reply(historyMessage);
    }
  } catch (error) {
    logger.error(`Band qilishlarni olishda xatolik: ${error.message}`);
    return ctx.reply('Band qilishlarni olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
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
    logger.info(`Attempting to cancel booking ID: ${bookingId}`);
    
    // Band qilishni bazadan olish
    const booking = await db.Booking.findOne({
      where: { 
        id: bookingId,
        userId: ctx.state.user.id,
        status: 'booked'
      },
      include: [{ model: db.Book, as: 'book' }]
    });
    
    if (!booking) {
      return ctx.reply('Band qilish topilmadi yoki allaqachon bekor qilingan.');
    }
    
    // Kitobni olishda DB transaksiya bilan ishlash kerak
    const transaction = await db.sequelize.transaction();
    
    try {
      // Band qilishni bekor qilish
      await booking.update({ status: 'cancelled' }, { transaction });
      
      // Kitob nusxalari sonini oshirish
      await db.Book.update(
        { availableCopies: booking.book.availableCopies + 1 },
        { where: { id: booking.bookId }, transaction }
      );
      
      await transaction.commit();
      logger.info(`Successfully cancelled booking ID: ${bookingId}`);
      
      await ctx.reply(`"${booking.book.title}" kitobini band qilish bekor qilindi.`);
      
      // Band qilishlar ro'yxatini yangilash
      return handleBookings(ctx);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error(`Band qilishni bekor qilishda xatolik: ${error.message}`);
    return ctx.reply('Band qilishni bekor qilishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

module.exports = { handleBookings, handleCancelBooking };