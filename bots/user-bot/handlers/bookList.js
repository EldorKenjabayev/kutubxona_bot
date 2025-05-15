// bots/user-bot/handlers/bookList.js
const db = require('../../../database/models');
const { getPaginationKeyboard } = require('../keyboards/pagination');
const { getBookActionsKeyboard } = require('../keyboards/bookList');
const logger = require('../../../utils/logger');

// Sahifa boshiga nechta kitob ko'rsatish
const BOOKS_PER_PAGE = 5;

/**
 * Kitoblar ro'yxati uchun handler
 */
const handleBookList = async (ctx, page = 1) => {
  try {
    // Page raqami NaN bo'lmasligi uchun tekshirish
    if (isNaN(page)) {
      page = 1;
      logger.warn('handleBookList: page is NaN, setting to default 1');
    }
    
    // Agar foydalanuvchi ro'yxatdan o'tmagan bo'lsa
    if (!ctx.state.user) {
      return ctx.reply('Iltimos, avval ro\'yxatdan o\'ting.');
    }
    
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
    }
    
    // Jami kitoblar sonini olish
    const totalBooks = await db.Book.count();
    const totalPages = Math.ceil(totalBooks / BOOKS_PER_PAGE);
    
    // Agar kitoblar bo'lmasa
    if (totalBooks === 0) {
      return ctx.reply('Hali kitoblar mavjud emas.');
    }
    
    // Joriy sahifani saqlash
    ctx.session.currentPage = page;
    ctx.session.totalPages = totalPages;
    ctx.session.pageType = 'books';
    
    // Sahifa uchun kitoblarni olish
    const offset = (page - 1) * BOOKS_PER_PAGE;
    logger.info(`Fetching books with limit: ${BOOKS_PER_PAGE}, offset: ${offset}`);
    
    const books = await db.Book.findAll({
      attributes: ['id', 'title', 'author', 'copies', 'availableCopies'],
      limit: BOOKS_PER_PAGE,
      offset: offset,
      order: [['title', 'ASC']]
    });
    
    // Kitoblar ro'yxatini ko'rsatish
    let message = `📚 Kitoblar ro'yxati (${page}/${totalPages}):\n\n`;
    books.forEach((book, index) => {
      const bookNumber = (page - 1) * BOOKS_PER_PAGE + index + 1;
      const availability = book.availableCopies > 0 ? '✅ Mavjud' : '❌ Band qilingan';
      message += `${bookNumber}. "${book.title}" - ${book.author}\n`;
      message += `   ${availability} (${book.availableCopies}/${book.copies})\n\n`;
    });
    
    message += 'Kitob haqida to\'liq ma\'lumot olish uchun raqamini tanlang:';
    
    // Kitoblar raqamlari uchun tugmalar
    const bookButtons = books.map((book, index) => {
      const bookNumber = (page - 1) * BOOKS_PER_PAGE + index + 1;
      return { text: bookNumber.toString(), callback_data: `book_${book.id}` };
    });
    
    // Reply markupni yaratish
    const keyboard = [];
    
    // Kitob raqamlarini 1-qator qilib joylashtirish
    keyboard.push(bookButtons);
    
    // Navigatsiya tugmalari - 2-qator
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
    
    // Asosiy menyuga qaytish - 3-qator
    keyboard.push([{ text: '🏠 Menyuga qaytish', callback_data: 'back_to_menu' }]);
    
    // Xabarni yuborish - callbackQuery bo'lsa edit qilish
    if (ctx.callbackQuery) {
      try {
        // Mavjud xabarni tahrirlash
        await ctx.editMessageText(message, { 
          reply_markup: { inline_keyboard: keyboard }
        });
      } catch (editError) {
        logger.error(`Error editing message: ${editError.message}`);
        // Tahrirlash imkoni bo'lmasa, yangi xabar yuborish
        await ctx.reply(message, { 
          reply_markup: { inline_keyboard: keyboard }
        });
      }
    } else {
      // Yangi xabar yuborish
      await ctx.reply(message, { 
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  } catch (error) {
    logger.error('Kitoblar ro\'yxatini olishda xatolik:', error);
    return ctx.reply('Kitoblar ro\'yxatini olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Kitob haqida ma'lumot olish uchun handler
 */
const handleBookDetails = async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    // Kitob ID sini olish
    const bookId = ctx.match[1];
    
    // Kitobni bazadan olish
    const book = await db.Book.findByPk(bookId);
    if (!book) {
      return ctx.reply('Kitob topilmadi.');
    }
    
    // Foydalanuvchining aktiv band qilishlari bor-yo'qligini tekshirish
    const hasActiveBooking = await db.Booking.findOne({
      where: {
        userId: ctx.state.user.id,
        status: ['booked', 'taken']
      }
    });
    
    // Kitob band qilinganligini tekshirish
    const isBookedByOthers = await db.Booking.findOne({
      where: {
        bookId: bookId,
        status: ['booked', 'taken']
      }
    });
    
    // Kitob haqida ma'lumot ko'rsatish
    let message = `📖 "${book.title}"\n\n`;
    message += `👤 Muallif: ${book.author}\n`;
    message += `📚 Nusxalar soni: ${book.copies}\n`;
    
    // Kitob mavjudligi holati
    let isAvailable = book.availableCopies > 0 && !hasActiveBooking;
    
    if (book.availableCopies > 0) {
      message += `✅ Mavjud: ${book.availableCopies}/${book.copies}\n\n`;
    } else {
      message += `❌ Band qilingan: ${book.availableCopies}/${book.copies}\n\n`;
    }
    
    // Agar foydalanuvchining aktiv band qilishi bo'lsa
    if (hasActiveBooking) {
      const activeBook = await db.Book.findByPk(hasActiveBooking.bookId);
      message += `❗️ Siz allaqachon "${activeBook.title}" kitobini band qilgansiz.\n`;
      message += `Yangi kitob band qilish uchun avval oldingi kitobni qaytaring yoki band qilishni bekor qiling.\n\n`;
      isAvailable = false;
    }
    
    // Agar kitob band qilingan bo'lsa
    if (isBookedByOthers && book.availableCopies === 0) {
      message += `ℹ️ Bu kitob hozirda barcha nusxalari band qilingan.\n\n`;
    }
    
    // Agar kitob rasmi bo'lsa, uni yuborish
    if (book.imageId) {
      await ctx.replyWithPhoto(book.imageId, {
        caption: message,
        reply_markup: getBookActionsKeyboard(book, isAvailable)
      });
    } else {
      await ctx.reply(message, {
        reply_markup: getBookActionsKeyboard(book, isAvailable)
      });
    }
  } catch (error) {
    logger.error('Kitob haqida ma\'lumot olishda xatolik:', error);
    return ctx.reply('Kitob haqida ma\'lumot olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

module.exports = { handleBookList, handleBookDetails };