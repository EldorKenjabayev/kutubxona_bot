// bots/admin-bot/handlers/searchUsers.js
const { Markup } = require('telegraf');
const db = require('../../../database/models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');

// Sahifa boshiga nechta foydalanuvchi ko'rsatish
const USERS_PER_PAGE = 5;

/**
 * Foydalanuvchilarni qidirish uchun handler
 */
const handleSearch = async (ctx) => {
  try {
    // Agar bu callback query emas, balki oddiy habar bo'lsa
    if (!ctx.callbackQuery) {
      // Foydalanuvchiga qidiruv so'rovini kiritishni taklif qilish
      ctx.session.adminSearchMode = true;
      return ctx.reply('Qidirmoqchi bo\'lgan foydalanuvchi ismini yoki familiyasini kiriting:');
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
    const query = ctx.message.text.trim();
    
    if (query.length < 2) {
      return ctx.reply('Iltimos, kamida 2 ta belgi kiriting.');
    }
    
    // Qidiruv rejimini o'chirish
    ctx.session.adminSearchMode = false;
    
    // Foydalanuvchilarni qidirish
    const where = {
      [Op.or]: [
        { firstName: { [Op.iLike]: `%${query}%` } },
        { lastName: { [Op.iLike]: `%${query}%` } },
        { phoneNumber: { [Op.iLike]: `%${query}%` } },
        { passportNumber: { [Op.iLike]: `%${query}%` } }
      ]
    };
    
    // Jami natijalar sonini olish
    const totalResults = await db.User.count({ where });
    const totalPages = Math.ceil(totalResults / USERS_PER_PAGE);
    
    // Agar natijalar bo'lmasa
    if (totalResults === 0) {
      return ctx.reply(`"${query}" so'rovi bo'yicha foydalanuvchilar topilmadi.`);
    }
    
    // Joriy sahifani saqlash
    ctx.session.currentPage = page;
    ctx.session.totalPages = totalPages;
    ctx.session.pageType = 'search_users';
    ctx.session.searchQuery = query;
    
    // Sahifa uchun natijalarni olish
    const users = await db.User.findAll({
      where,
      limit: USERS_PER_PAGE,
      offset: (page - 1) * USERS_PER_PAGE,
      order: [['firstName', 'ASC']]
    });
    
    // Natijalar ro'yxatini ko'rsatish
    let message = `🔍 "${query}" qidirish natijalari (${page}/${totalPages}):\n\n`;
    
    users.forEach((user, index) => {
      const userNumber = (page - 1) * USERS_PER_PAGE + index + 1;
      const registerDate = new Date(user.registeredAt).toLocaleDateString('uz-UZ');
      const isAdmin = user.isAdmin ? ' (Admin)' : '';
      
      message += `${userNumber}. ${user.firstName} ${user.lastName}${isAdmin}\n`;
      message += `   📱 Tel: ${user.phoneNumber}\n`;
      message += `   🆔 Pasport: ${user.passportNumber}\n`;
      message += `   📅 Ro'yxatdan o'tgan: ${registerDate}\n\n`;
    });
    
    message += 'Foydalanuvchi haqida to\'liq ma\'lumot olish uchun raqamini tanlang:';
    
    // Foydalanuvchilar raqamlari uchun tugmalar
    const userButtons = users.map((user, index) => {
      const userNumber = (page - 1) * USERS_PER_PAGE + index + 1;
      return { text: userNumber.toString(), callback_data: `user_${user.id}` };
    });
    
    // Klaviatura yaratish
    const keyboard = [];
    
    // Foydalanuvchilar raqamlarini 1-qator qilib joylashtirish
    keyboard.push(userButtons);
    
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
    
    // Foydalanuvchilarni qidirish
    const where = {
      [Op.or]: [
        { firstName: { [Op.iLike]: `%${query}%` } },
        { lastName: { [Op.iLike]: `%${query}%` } },
        { phoneNumber: { [Op.iLike]: `%${query}%` } },
        { passportNumber: { [Op.iLike]: `%${query}%` } }
      ]
    };
    
    // Jami natijalar sonini olish
    const totalResults = await db.User.count({ where });
    const totalPages = Math.ceil(totalResults / USERS_PER_PAGE);
    
    // Joriy sahifani saqlash
    ctx.session.currentPage = page;
    ctx.session.totalPages = totalPages;
    ctx.session.pageType = 'search_users';
    
    // Sahifa uchun natijalarni olish
    const users = await db.User.findAll({
      where,
      limit: USERS_PER_PAGE,
      offset: (page - 1) * USERS_PER_PAGE,
      order: [['firstName', 'ASC']]
    });
    
    // Natijalar ro'yxatini ko'rsatish
    let message = `🔍 "${query}" qidirish natijalari (${page}/${totalPages}):\n\n`;
    
    users.forEach((user, index) => {
      const userNumber = (page - 1) * USERS_PER_PAGE + index + 1;
      const registerDate = new Date(user.registeredAt).toLocaleDateString('uz-UZ');
      const isAdmin = user.isAdmin ? ' (Admin)' : '';
      
      message += `${userNumber}. ${user.firstName} ${user.lastName}${isAdmin}\n`;
      message += `   📱 Tel: ${user.phoneNumber}\n`;
      message += `   🆔 Pasport: ${user.passportNumber}\n`;
      message += `   📅 Ro'yxatdan o'tgan: ${registerDate}\n\n`;
    });
    
    message += 'Foydalanuvchi haqida to\'liq ma\'lumot olish uchun raqamini tanlang:';
    
    // Foydalanuvchilar raqamlari uchun tugmalar
    const userButtons = users.map((user, index) => {
      const userNumber = (page - 1) * USERS_PER_PAGE + index + 1;
      return { text: userNumber.toString(), callback_data: `user_${user.id}` };
    });
    
    // Klaviatura yaratish
    const keyboard = [];
    
    // Foydalanuvchilar raqamlarini 1-qator qilib joylashtirish
    keyboard.push(userButtons);
    
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

/**
 * Band qilingan kitoblarni foydalanuvchi uchun ko'rish
 */
const handleUserActiveBooking = async (ctx, userId) => {
  try {
    // Foydalanuvchining aktiv band qilishlarini olish
    const activeBooking = await db.Booking.findOne({
      where: {
        userId: userId,
        status: ['booked', 'taken']
      },
      include: [
        { model: db.User, as: 'user' },
        { model: db.Book, as: 'book' }
      ]
    });
    
    // Agar aktiv band qilish bo'lmasa
    if (!activeBooking) {
      return ctx.reply(`Bu foydalanuvchida hozirda aktiv band qilingan kitoblar yo'q.`);
    }
    
    const user = activeBooking.user;
    const book = activeBooking.book;
    
    let message = `"${book.title}" kitobining band qilinishi:\n\n`;
    message += `👤 Foydalanuvchi: ${user.firstName} ${user.lastName}\n`;
    message += `📱 Telefon: ${user.phoneNumber}\n`;
    message += `🆔 Pasport: ${user.passportNumber}\n\n`;
    
    // Status bo'yicha ma'lumot qo'shish
    if (activeBooking.status === 'booked') {
      const expiresDate = new Date(activeBooking.expiresAt).toLocaleDateString('uz-UZ');
      const expiresTime = new Date(activeBooking.expiresAt).toLocaleTimeString('uz-UZ');
      const bookingDate = new Date(activeBooking.bookedAt).toLocaleDateString('uz-UZ');
      
      message += `📅 Band qilingan: ${bookingDate}\n`;
      message += `⏳ Ekspiratsiya: ${expiresDate} ${expiresTime}\n`;
      message += `ℹ️ Status: Band qilingan (olib ketilmagan)\n\n`;
      message += `Kitob olib ketilganini tasdiqlaysizmi?`;
      
      // Klaviatura tugmalarini yaratish
      const keyboard = [
        [
          { text: '✅ Tasdiqlash', callback_data: `booking_${activeBooking.id}_confirm` },
          { text: '❌ Bekor qilish', callback_data: `booking_${activeBooking.id}_cancel` }
        ],
        [{ text: '🔙 Orqaga', callback_data: 'back_to_search' }]
      ];
      
      await ctx.reply(message, {
        reply_markup: { inline_keyboard: keyboard }
      });
    } else if (activeBooking.status === 'taken') {
      const takenDate = new Date(activeBooking.takenAt).toLocaleDateString('uz-UZ');
      const returnDate = new Date(activeBooking.returnDate).toLocaleDateString('uz-UZ');
      
      message += `📅 Olib ketilgan: ${takenDate}\n`;
      message += `🔄 Qaytarish: ${returnDate}\n`;
      message += `ℹ️ Status: Olib ketilgan\n\n`;
      message += `Kitob qaytarilganini tasdiqlaysizmi?`;
      
      // Klaviatura tugmalarini yaratish
      const keyboard = [
        [
          { text: '✅ Qaytarildi', callback_data: `booking_${activeBooking.id}_returned` },
          { text: '❌ Qaytarilmadi', callback_data: `booking_${activeBooking.id}_not_returned` }
        ],
        [{ text: '🔙 Orqaga', callback_data: 'back_to_search' }]
      ];
      
      await ctx.reply(message, {
        reply_markup: { inline_keyboard: keyboard }
      });
    }
    
    return true;
  } catch (error) {
    logger.error(`Foydalanuvchining aktiv band qilishlarini olishda xatolik: ${error.message}`);
    return ctx.reply('Foydalanuvchining band qilishlarini olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

module.exports = { 
  handleSearch, 
  handleSearchQuery, 
  handleSearchPagination, 
  handleUserActiveBooking 
};