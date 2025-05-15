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
    
    // Raqam tugmalarini qator qilib joylashtirish
    const keyboard = [];
    for (let i = 0; i < bookButtons.length; i += 5) {
      keyboard.push(bookButtons.slice(i, i + 5));
    }
    
    return ctx.reply(message, getPaginationKeyboard(page, totalPages, 'books'));
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
    
    // Kitob haqida ma'lumot ko'rsatish
    let message = `📖 "${book.title}"\n\n`;
    message += `👤 Muallif: ${book.author}\n`;
    message += `📚 Nusxalar soni: ${book.copies}\n`;
    message += `${book.availableCopies > 0 ? '✅ Mavjud' : '❌ Band qilingan'}: ${book.availableCopies}/${book.copies}\n`;
    
    // Agar kitob rasmi bo'lsa, uni yuborish
    if (book.imageId) {
      await ctx.replyWithPhoto(book.imageId, {
        caption: message,
        reply_markup: getBookActionsKeyboard(book, book.availableCopies > 0)
      });
    } else {
      await ctx.reply(message, {
        reply_markup: getBookActionsKeyboard(book, book.availableCopies > 0)
      });
    }
  } catch (error) {
    logger.error('Kitob haqida ma\'lumot olishda xatolik:', error);
    return ctx.reply('Kitob haqida ma\'lumot olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

module.exports = { handleBookList, handleBookDetails };