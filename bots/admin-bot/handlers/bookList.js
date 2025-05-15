// bots/admin-bot/handlers/bookList.js
const db = require('../../../database/models');
const { adminMenuKeyboard } = require('../keyboards/mainMenu');
const logger = require('../../../utils/logger');

// Sahifa boshiga nechta kitob ko'rsatish
const BOOKS_PER_PAGE = 5;

/**
 * Kitoblar ro'yxati uchun handler
 */
const handleBookList = async (ctx, page = 1) => {
  try {
    logger.info(`BOOKLIST: Starting with page ${page}`);
    
    // Page raqami NaN bo'lmasligi uchun tekshirish
    if (isNaN(page)) {
      page = 1;
      logger.warn('BOOKLIST: page is NaN, setting to default 1');
    }
    
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
    }
    
    // Jami kitoblar sonini olish
    const totalBooks = await db.Book.count();
    const totalPages = Math.ceil(totalBooks / BOOKS_PER_PAGE);
    
    logger.info(`BOOKLIST: Found ${totalBooks} books, ${totalPages} pages total`);
    
    // Agar kitoblar bo'lmasa
    if (totalBooks === 0) {
      return ctx.reply('Hali kitoblar mavjud emas. "➕ Kitob qo\'shish" orqali kitoblar qo\'shing.');
    }
    
    // Joriy sahifani saqlash
    ctx.session.currentPage = page;
    ctx.session.totalPages = totalPages;
    ctx.session.pageType = 'books';
    
    // Sahifa uchun kitoblarni olish
    const offset = (page - 1) * BOOKS_PER_PAGE;
    logger.info(`BOOKLIST: Fetching books with limit ${BOOKS_PER_PAGE}, offset ${offset}`);
    
    const books = await db.Book.findAll({
      attributes: ['id', 'title', 'author', 'copies', 'availableCopies'],
      limit: BOOKS_PER_PAGE,
      offset: offset,
      order: [['title', 'ASC']]
    });
    
    logger.info(`BOOKLIST: Found ${books.length} books for page ${page}`);
    
    // Kitoblar ro'yxatini ko'rsatish
    let message = `📚 Kitoblar ro'yxati (${page}/${totalPages}):\n\n`;
    books.forEach((book, index) => {
      const bookNumber = (page - 1) * BOOKS_PER_PAGE + index + 1;
      message += `${bookNumber}. "${book.title}" - ${book.author}\n`;
      message += `   📚 Nusxalar: ${book.availableCopies}/${book.copies}\n\n`;
    });
    
    message += 'Kitob haqida to\'liq ma\'lumot olish uchun raqamini tanlang:';
    
    // Kitoblar raqamlari uchun tugmalar
    const keyboard = [];
    
    // Kitob raqamlari - 1-qator
    const bookButtons = books.map((book, index) => {
      const bookNumber = (page - 1) * BOOKS_PER_PAGE + index + 1;
      return { text: bookNumber.toString(), callback_data: `book_${book.id}` };
    });
    
    // Kitob raqamlarini qator qilib joylashtirish
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
    
    // Reply markupni yaratish
    const replyMarkup = {
      inline_keyboard: keyboard
    };
    
    logger.info(`BOOKLIST: Sending message with ${keyboard.length} keyboard rows`);
    
    // Xabarni yuborish - callbackQuery bo'lsa edit qilish
    if (ctx.callbackQuery) {
      try {
        // Mavjud xabarni tahrirlash
        await ctx.editMessageText(message, { reply_markup: replyMarkup });
      } catch (editError) {
        logger.error(`BOOKLIST: Error editing message: ${editError.message}`);
        // Tahrirlash imkoni bo'lmasa, yangi xabar yuborish
        await ctx.reply(message, { reply_markup: replyMarkup });
      }
    } else {
      // Yangi xabar yuborish
      await ctx.reply(message, { reply_markup: replyMarkup });
    }
    
  } catch (error) {
    logger.error('BOOKLIST: Error getting books:', error);
    return ctx.reply('Kitoblar ro\'yxatini olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Kitob haqida ma'lumot olish uchun handler
 */
const handleBookDetails = async (ctx) => {
  try {
    logger.info('BOOKDETAILS: Handler started');
    await ctx.answerCbQuery();
    
    // Kitob ID sini olish
    const bookId = ctx.match[1];
    logger.info(`BOOKDETAILS: Requested book ID: ${bookId}`);
    
    // Kitobni bazadan olish
    const book = await db.Book.findByPk(bookId);
    if (!book) {
      logger.warn(`BOOKDETAILS: Book ID ${bookId} not found`);
      return ctx.reply('Kitob topilmadi.');
    }
    
    // Band qilingan nusxalarni hisoblash
    const bookedCopies = book.copies - book.availableCopies;
    
    // Kitob haqida ma'lumot ko'rsatish
    let message = `📖 "${book.title}"\n\n`;
    message += `👤 Muallif: ${book.author}\n`;
    message += `📚 Nusxalar soni: ${book.copies}\n`;
    message += `📊 Mavjud nusxalar: ${book.availableCopies}\n`;
    message += `🔒 Band qilingan nusxalar: ${bookedCopies}\n`;
    
    // Kitob tahrirlash/o'chirish uchun inline tugmalar
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✏️ Tahrirlash', callback_data: `book_${book.id}_edit` },
          { text: '🗑️ O\'chirish', callback_data: `book_${book.id}_delete` }
        ],
        [{ text: '🔙 Orqaga', callback_data: 'back_to_books' }]
      ]
    };
    
    logger.info(`BOOKDETAILS: Sending details for "${book.title}"`);
    
    // Agar kitob rasmi bo'lsa, uni yuborish
    if (book.imageId) {
      logger.info(`BOOKDETAILS: Book has image, ID: ${book.imageId}`);
      await ctx.replyWithPhoto(book.imageId, {
        caption: message,
        reply_markup: keyboard
      });
    } else {
      logger.info(`BOOKDETAILS: Book has no image`);
      await ctx.reply(message, {
        reply_markup: keyboard
      });
    }
  } catch (error) {
    logger.error('BOOKDETAILS: Error getting book details:', error);
    return ctx.reply('Kitob haqida ma\'lumot olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Kitobni o'chirish
 */
const handleBookDelete = async (ctx) => {
  try {
    logger.info('BOOKDELETE: Handler started');
    const bookId = ctx.match[1];
    logger.info(`BOOKDELETE: Requested to delete book ID: ${bookId}`);
    
    // Kitobni olish
    const book = await db.Book.findByPk(bookId);
    if (!book) {
      return ctx.answerCbQuery('Kitob topilmadi!');
    }
    
    // Kitob band qilinganligini tekshirish
    const hasBookings = await db.Booking.findOne({
      where: {
        bookId: bookId,
        status: ['booked', 'taken']
      }
    });
    
    if (hasBookings) {
      return ctx.answerCbQuery('Bu kitob band qilingan, o\'chirib bo\'lmaydi!');
    }
    
    // O'chirish uchun tasdiqlash
    await ctx.answerCbQuery();
    
    // Tasdiqlash klaviaturasi
    const confirmKeyboard = {
      inline_keyboard: [
        [
          { text: '✅ Ha', callback_data: `confirm_delete_book_${bookId}` },
          { text: '❌ Yo\'q', callback_data: 'back_to_books' }
        ]
      ]
    };
    
    await ctx.reply(`"${book.title}" kitobini o'chirishni tasdiqlaysizmi?`, {
      reply_markup: confirmKeyboard
    });
    
  } catch (error) {
    logger.error('BOOKDELETE: Error deleting book:', error);
    return ctx.answerCbQuery('Xatolik yuz berdi!');
  }
};

/**
 * Kitobni o'chirishni tasdiqlash
 */
const handleConfirmBookDelete = async (ctx) => {
  try {
    logger.info('BOOKDELETECONFIRM: Handler started');
    const bookId = ctx.match[1];
    logger.info(`BOOKDELETECONFIRM: Confirming deletion of book ID: ${bookId}`);
    
    // Kitobni olish
    const book = await db.Book.findByPk(bookId);
    if (!book) {
      return ctx.answerCbQuery('Kitob topilmadi!');
    }
    
    // Kitobni o'chirish
    await book.destroy();
    
    await ctx.answerCbQuery('Kitob muvaffaqiyatli o\'chirildi!');
    await ctx.reply(`"${book.title}" kitobini muvaffaqiyatli o'chirildi.`);
    
    // Kitoblar ro'yxatiga qaytish
    return handleBookList(ctx);
  } catch (error) {
    logger.error('BOOKDELETECONFIRM: Error confirming book deletion:', error);
    return ctx.answerCbQuery('Kitobni o\'chirishda xatolik yuz berdi!');
  }
};

module.exports = { handleBookList, handleBookDetails, handleBookDelete, handleConfirmBookDelete };