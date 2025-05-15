// bots/user-bot/scenes/bookBooking.js
const { Scenes, Markup } = require('telegraf');
const db = require('../../../database/models');
const { mainMenuKeyboard } = require('../keyboards/mainMenu');
const config = require('../../../config/config');
const logger = require('../../../utils/logger');

// Band qilish scenesi
const bookBookingScene = new Scenes.WizardScene(
  'bookBooking',
  // 1-qadam: Kitobni necha kunga band qilishni so'rash
  async (ctx) => {
    try {
      // BookId olish
      const bookId = ctx.scene.state.bookId || (ctx.match && ctx.match[1]);
      
      if (!bookId) {
        await ctx.reply('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
        return ctx.scene.leave();
      }
      
      // Kitobni bazadan olish
      const book = await db.Book.findByPk(bookId);
      if (!book) {
        await ctx.reply('Kitob topilmadi. Iltimos qaytadan urinib ko\'ring.');
        return ctx.scene.leave();
      }
      
      // Foydalanuvchini olish
      const user = ctx.state.user;
      if (!user) {
        logger.error('User not found in context state');
        await ctx.reply('Xatolik yuz berdi: Foydalanuvchi topilmadi. Iltimos qaytadan urinib ko\'ring.');
        return ctx.scene.leave();
      }
      
      logger.info(`Booking process started for user ${user.id} (${user.firstName} ${user.lastName}) - Book ID: ${bookId}`);
      
      // Foydalanuvchining mavjud band qilishlarini tekshirish
      const existingBooking = await db.Booking.findOne({
        where: {
          userId: user.id,
          status: ['booked', 'taken']
        }
      });
      
      if (existingBooking) {
        const existingBook = await db.Book.findByPk(existingBooking.bookId);
        await ctx.reply(`Siz allaqachon "${existingBook.title}" kitobini band qilgansiz yoki olib ketgansiz. Yangi kitob band qilish uchun avval oldingi kitobni qaytaring yoki band qilishni bekor qiling.`);
        return ctx.scene.leave();
      }
      
      // Kitobning mavjudligini tekshirish
      if (book.availableCopies <= 0) {
        await ctx.reply('Afsuski, bu kitobning barcha nusxalari band qilingan.');
        return ctx.scene.leave();
      }
      
      // Saqlash uchun kontekstda saqlash
      ctx.scene.state.book = book;
      ctx.scene.state.userId = user.id;
      
      // Band qilish uchun kun tanlov - 1 dan 10 gacha kunlar
      const buttons = [];
      const maxDays = 10; // Maksimal 10 kun
      
      // Har bir kun uchun tugma yaratish
      for (let i = 1; i <= maxDays; i++) {
        buttons.push(Markup.button.callback(`${i} kun`, `days_${i}`));
      }
      
      // Kunlar knopkalarini har satrda 5 tadan qilib joylashtirish
      const keyboard = [];
      for (let i = 0; i < buttons.length; i += 5) {
        keyboard.push(buttons.slice(i, i + 5));
      }
      
      // Bekor qilish tugmasi
      keyboard.push([Markup.button.callback('❌ Bekor qilish', 'cancel_booking')]);
      
      logger.info(`User ${user.id} is booking book ${book.id} "${book.title}"`);
      
      await ctx.reply(`"${book.title}" kitobini qancha kunga band qilmoqchisiz?`, 
        { reply_markup: { inline_keyboard: keyboard } }
      );
      
      return ctx.wizard.next();
    } catch (error) {
      logger.error(`Error in booking first step: ${error.message}`);
      await ctx.reply('Kitobni band qilishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      return ctx.scene.leave();
    }
  },
  
  // 2-qadam: Kunni olish va band qilishni saqlash
  async (ctx) => {
    try {
      if (!ctx.callbackQuery) {
        await ctx.reply('Iltimos, knopkalardan birini tanlang.');
        return;
      }
      
      const data = ctx.callbackQuery.data;
      
      // Bekor qilish
      if (data === 'cancel_booking') {
        await ctx.answerCbQuery('Band qilish bekor qilindi');
        await ctx.reply('Kitobni band qilish bekor qilindi.');
        return ctx.scene.leave();
      }
      
      // Necha kunligini olish
      const daysMatch = data.match(/^days_(\d+)$/);
      if (!daysMatch) {
        await ctx.reply('Noto\'g\'ri tanlov. Iltimos, knopkalardan birini tanlang.');
        return;
      }
      
      const days = parseInt(daysMatch[1]);
      
      // Kitob va foydalanuvchi ID larini olish
      const bookId = ctx.scene.state.book.id;
      const userId = ctx.scene.state.userId;
      
      if (!bookId || !userId) {
        logger.error(`Missing book ID (${bookId}) or user ID (${userId}) in scene state`);
        await ctx.reply('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
        return ctx.scene.leave();
      }
      
      const now = new Date();
      // Band qilish ekspiratsiya vaqti (24 soat)
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 soat
      // Qaytarish vaqti
      const returnDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      
      // Band qilishni saqlash (transaksiya bilan)
      const transaction = await db.sequelize.transaction();
      
      try {
        // Band qilish yaratish
        const booking = await db.Booking.create({
          userId: userId,
          bookId: bookId,
          status: 'booked',
          bookedAt: now,
          expiresAt: expiresAt,
          returnDate: returnDate,
          durationDays: days
        }, { transaction });
        
        // Kitobning mavjud nusxalar sonini kamaytirish
        await db.Book.update(
          { availableCopies: ctx.scene.state.book.availableCopies - 1 },
          { where: { id: bookId }, transaction }
        );
        
        // Transaksiyani tasdiqlash
        await transaction.commit();
        
        await ctx.answerCbQuery('Kitob muvaffaqiyatli band qilindi!');
        
        logger.info(`User ${userId} successfully booked book ${bookId} for ${days} days`);
        
        // Muhim ma'lumotlar bilan xabar berish
        await ctx.reply(`"${ctx.scene.state.book.title}" kitobini muvaffaqiyatli band qildingiz!\n\n`
          + `⏳ Band qilindi: ${now.toLocaleDateString('uz-UZ')}\n`
          + `⏳ Ekspiratsiya vaqti: ${expiresAt.toLocaleDateString('uz-UZ')} (${expiresAt.toLocaleTimeString('uz-UZ')})\n`
          + `⏳ Qaytarish vaqti: ${returnDate.toLocaleDateString('uz-UZ')}\n\n`
          + `❗️ Eslatma: Agar kitobni 24 soat ichida olib ketmasangiz, band qilish avtomatik bekor qilinadi.\n`
          + `❗️ Har bir foydalanuvchi faqat bitta kitob band qilishi mumkin.`);
        
        await ctx.reply('Bosh menyu:', { reply_markup: mainMenuKeyboard });
        
        return ctx.scene.leave();
        
      } catch (transactionError) {
        // Xatolik bo'lsa transaksiyani bekor qilish
        await transaction.rollback();
        throw transactionError;
      }
    } catch (error) {
      logger.error(`Kitobni band qilishda xatolik: ${error.message}`);
      await ctx.reply('Kitobni band qilishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      return ctx.scene.leave();
    }
  }
);

// Scenedan chiqish handeri
bookBookingScene.action('cancel_booking', async (ctx) => {
  await ctx.answerCbQuery('Band qilish bekor qilindi');
  await ctx.reply('Kitobni band qilish bekor qilindi.');
  return ctx.scene.leave();
});

// Scenedan chiqish kommandasi
bookBookingScene.command('cancel', async (ctx) => {
  await ctx.reply('Kitobni band qilish bekor qilindi.');
  return ctx.scene.leave();
});

module.exports = { bookBookingScene };