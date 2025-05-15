// bots/user-bot/scenes/bookBooking.js
const { Scenes, Markup } = require('telegraf');
const db = require('../../../database/models');
const { mainMenuKeyboard } = require('../keyboards/mainMenu');
const config = require('../../../config/config');

// Band qilish scenesi
const bookBookingScene = new Scenes.WizardScene(
  'bookBooking',
  // 1-qadam: Kitobni necha kunga band qilishni so'rash
  async (ctx) => {
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
    
    // Foydalanuvchining mavjud band qilishlarini tekshirish
    const existingBooking = await db.Booking.findOne({
      where: {
        userId: ctx.state.user.id,
        status: ['booked', 'taken']
      }
    });
    
    if (existingBooking) {
      const existingBook = await db.Book.findByPk(existingBooking.bookId);
      await ctx.reply(`Siz allaqachon "${existingBook.title}" kitobini band qilgansiz yoki olib ketgansiz. Yangi kitob band qilish uchun avval oldingi kitobni qaytaring yoki bekor qiling.`);
      return ctx.scene.leave();
    }
    
    // Kitobning mavjudligini tekshirish
    if (book.availableCopies <= 0) {
      await ctx.reply('Afsuski, bu kitobning barcha nusxalari band qilingan.');
      return ctx.scene.leave();
    }
    
    ctx.scene.state.book = book;
    
    // Band qilish uchun kun tanlov
    const buttons = [];
    for (let i = 1; i <= config.booking.maxBookingDuration; i++) {
      buttons.push(Markup.button.callback(`${i} kun`, `days_${i}`));
    }
    
    // Kunlar knopkalarini har satrda 5 tadan qilib joylashtirish
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 5) {
      keyboard.push(buttons.slice(i, i + 5));
    }
    keyboard.push([Markup.button.callback('Bekor qilish', 'cancel_booking')]);
    
    await ctx.reply(`"${book.title}" kitobini qancha kunga band qilmoqchisiz?`, 
      { reply_markup: Markup.inlineKeyboard(keyboard) }
    );
    
    return ctx.wizard.next();
  },
  
  // 2-qadam: Kunni olish va band qilishni saqlash
  async (ctx) => {
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
    
    try {
      const now = new Date();
      // Band qilish expiration vaqti (24 soat)
      const expiresAt = new Date(now.getTime() + config.booking.pickupTimeLimit * 60 * 60 * 1000);
      // Qaytarish vaqti
      const returnDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      
      // Band qilishni saqlash
      const booking = await db.Booking.create({
        userId: ctx.state.user.id,
        bookId: ctx.scene.state.book.id,
        status: 'booked',
        bookedAt: now,
        expiresAt: expiresAt,
        returnDate: returnDate,
        durationDays: days
      });
      
      // Kitobning mavjud nusxalar sonini kamaytirish
      await db.Book.update(
        { availableCopies: ctx.scene.state.book.availableCopies - 1 },
        { where: { id: ctx.scene.state.book.id } }
      );
      
      await ctx.answerCbQuery('Kitob muvaffaqiyatli band qilindi!');
      await ctx.reply(`"${ctx.scene.state.book.title}" kitobini muvaffaqiyatli band qildingiz!

⏳ Band qilindi: ${now.toLocaleDateString('uz-UZ')}
⏳ Ekspiratsiya vaqti: ${expiresAt.toLocaleDateString('uz-UZ')} (${expiresAt.toLocaleTimeString('uz-UZ')})
⏳ Qaytarish vaqti: ${returnDate.toLocaleDateString('uz-UZ')}

Eslatma: Agar kitobni 24 soat ichida olib ketmasangiz, band qilish avtomatik bekor qilinadi.`);
      
      await ctx.reply('Bosh menyu:', { reply_markup: mainMenuKeyboard });
      
      return ctx.scene.leave();
    } catch (error) {
      console.error('Kitobni band qilishda xatolik:', error);
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