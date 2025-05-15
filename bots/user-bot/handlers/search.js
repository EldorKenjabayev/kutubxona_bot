// bots/user-bot/handlers/search.js
const { Markup } = require('telegraf');
const db = require('../../../database/models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');

// Sahifa boshiga nechta natija ko'rsatish
const RESULTS_PER_PAGE = 5;

/**
 * Qidiruv uchun handler
 */
const handleSearch = async (ctx) => {
  try {
    // Agar foydalanuvchi ro'yxatdan o'tmagan bo'lsa
    if (!ctx.state.user) {
      return ctx.reply('Iltimos, avval ro\'yxatdan o\'ting.');
    }
    
    // Agar bu callback query emas, balki oddiy habar bo'lsa
    if (!ctx.callbackQuery) {
      // Foydalanuvchiga qidiruv so'rovini kiritishni taklif qilish
      ctx.session.searchMode = true;
      return ctx.reply('Qidirmoqchi bo\'lgan kitob nomi yoki muallifini kiriting:');
    }
    
    await ctx.answerCbQuery();
  } catch (error) {
    logger.error(`Qidiruv boshlanishida xatolik: ${error.message}`);
    return ctx.reply('Qidiruv boshlanishida xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Qidiruv so'rovi uchun handler
 */
const handleSearchQuery = async (ctx, page = 1) => {
  try {
    // Agar foydalanuvchi ro'yxatdan o'tmagan bo'lsa
    if (!ctx.state.user) {
      return ctx.reply('Iltimos, avval ro\'yxatdan o\'ting.');
    }
    
    const query = ctx.message.text.trim();
    
    if (query.length < 3) {
      return ctx.reply('Iltimos, kamida 3 ta belgi kiriting.');
    }
    
    // Qidiruv rejimini o'chirish
    ctx.session.searchMode = false;
    
    // Kitoblarni qidirish
    const where = {
      [Op.or]: [
        { title: { [Op.iLike]: `%${query}%` } },
        { author: { [Op.iLike]: `%${query}%` } }
      ]
    };
    
    // Jami natijalar sonini olish
    const totalResults = await db.Book.count({ where });
    const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
    
    // Agar natijalar bo'lmasa
    if (totalResults === 0) {
      return ctx.reply(`"${query}" so'rovi bo'yicha natijalar topilmadi.`);
    }
    
    // Joriy sahifani saqlash
    ctx.session.currentPage = page;
    ctx.session.totalPages = totalPages;
    ctx.session.pageType = 'search';
    ctx.session.searchQuery = query;
    
    // Sahifa uchun natijalarni olish
    const books = await db.Book.findAll({
      where,
      attributes: ['id', 'title', 'author', 'copies', 'availableCopies'],
      limit: RESULTS_PER_PAGE,
      offset: (page - 1) * RESULTS_PER_PAGE,
      order: [['title', 'ASC']]
    });
    
    // Natijalar ro'yxatini ko'rsatish
    let message = `🔍 "${query}" qidirish natijalari (${page}/${totalPages}):\n\n`;
    books.forEach((book, index) => {
      const bookNumber = (page - 1) * RESULTS_PER_PAGE + index + 1;
      const availability = book.availableCopies > 0 ? '✅ Mavjud' : '❌ Band qilingan';
      message += `${bookNumber}. "${book.title}" - ${book.author}\n`;
      message += `   ${availability} (${book.availableCopies}/${book.copies})\n\n`;
    });
    
    message += 'Kitob haqida to\'liq ma\'lumot olish uchun raqamini tanlang:';
    
    // Kitoblar raqamlari uchun tugmalar
    const bookButtons = books.map((book, index) => {
      const bookNumber = (page - 1) * RESULTS_PER_PAGE + index + 1;
      return { text: bookNumber.toString(), callback_data: `book_${book.id}` };
    });
    
    // Klaviatura yaratish
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
    
    // Xabarni yuborish
    return ctx.reply(message, { 
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    logger.error(`Qidiruv natijalarini olishda xatolik: ${error.message}`);
    return ctx.reply('Qidiruv natijalarini olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Qidiruv natijalari sahifasini o'zgartirish uchun handler
 */
const handleSearchPagination = async (ctx, page) => {
  try {
    await ctx.answerCbQuery();
    
    const query = ctx.session.searchQuery;
    if (!query) {
      return ctx.reply('Qidiruv so\'rovi topilmadi. Iltimos, qaytadan qidiruv qiling.');
    }
    
    // Kitoblarni qidirish
    const where = {
      [Op.or]: [
        { title: { [Op.iLike]: `%${query}%` } },
        { author: { [Op.iLike]: `%${query}%` } }
      ]
    };
    
    // Jami natijalar sonini olish
    const totalResults = await db.Book.count({ where });
    const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
    
    // Joriy sahifani saqlash
    ctx.session.currentPage = page;
    ctx.session.totalPages = totalPages;
    ctx.session.pageType = 'search';
    
    // Sahifa uchun natijalarni olish
    const books = await db.Book.findAll({
      where,
      attributes: ['id', 'title', 'author', 'copies', 'availableCopies'],
      limit: RESULTS_PER_PAGE,
      offset: (page - 1) * RESULTS_PER_PAGE,
      order: [['title', 'ASC']]
    });
    
    // Natijalar ro'yxatini ko'rsatish
    let message = `🔍 "${query}" qidirish natijalari (${page}/${totalPages}):\n\n`;
    books.forEach((book, index) => {
      const bookNumber = (page - 1) * RESULTS_PER_PAGE + index + 1;
      const availability = book.availableCopies > 0 ? '✅ Mavjud' : '❌ Band qilingan';
      message += `${bookNumber}. "${book.title}" - ${book.author}\n`;
      message += `   ${availability} (${book.availableCopies}/${book.copies})\n\n`;
    });
    
    message += 'Kitob haqida to\'liq ma\'lumot olish uchun raqamini tanlang:';
    
    // Kitoblar raqamlari uchun tugmalar
    const bookButtons = books.map((book, index) => {
      const bookNumber = (page - 1) * RESULTS_PER_PAGE + index + 1;
      return { text: bookNumber.toString(), callback_data: `book_${book.id}` };
    });
    
    // Klaviatura yaratish
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
    
    // Xabarni tahrirlash yoki yangidan yuborish
    try {
      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, { 
          reply_markup: { inline_keyboard: keyboard }
        });
      } else {
        await ctx.reply(message, { 
          reply_markup: { inline_keyboard: keyboard }
        });
      }
    } catch (error) {
      logger.error(`Xabarni tahrirlashda xatolik: ${error.message}`);
      await ctx.reply(message, { 
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  } catch (error) {
    logger.error(`Qidiruv sahifasini o'zgartirishda xatolik: ${error.message}`);
    return ctx.reply('Qidiruv sahifasini o\'zgartirishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

module.exports = { handleSearch, handleSearchQuery, handleSearchPagination };