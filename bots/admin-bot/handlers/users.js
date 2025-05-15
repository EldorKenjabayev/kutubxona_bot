// bots/admin-bot/handlers/users.js
const db = require('../../../database/models');
const { Op } = require('sequelize');
const { Markup } = require('telegraf');
const logger = require('../../../utils/logger');

// Sahifa boshiga nechta foydalanuvchi ko'rsatish
const USERS_PER_PAGE = 5;

/**
 * Foydalanuvchilar ro'yxati uchun handler
 */
const handleUserList = async (ctx, page = 1) => {
  try {
    logger.info(`USERLIST: Starting with page ${page}`);
    
    // Page raqami NaN bo'lmasligi uchun tekshirish
    if (isNaN(page)) {
      page = 1;
      logger.warn('USERLIST: page is NaN, setting to default 1');
    }
    
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
    }
    
    // Jami foydalanuvchilar sonini olish
    const totalUsers = await db.User.count();
    const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);
    
    logger.info(`USERLIST: Found ${totalUsers} users, ${totalPages} pages total`);
    
    // Agar foydalanuvchilar bo'lmasa
    if (totalUsers === 0) {
      return ctx.reply('Hozircha foydalanuvchilar yo\'q.');
    }
    
    // Joriy sahifani saqlash
    ctx.session.currentPage = page;
    ctx.session.totalPages = totalPages;
    ctx.session.pageType = 'users';
    
    // Sahifa uchun foydalanuvchilarni olish
    const offset = (page - 1) * USERS_PER_PAGE;
    logger.info(`USERLIST: Fetching users with limit ${USERS_PER_PAGE}, offset ${offset}`);
    
    const users = await db.User.findAll({
      limit: USERS_PER_PAGE,
      offset: offset,
      order: [['registeredAt', 'DESC']]
    });
    
    logger.info(`USERLIST: Found ${users.length} users for page ${page}`);
    
    // Foydalanuvchilar ro'yxatini ko'rsatish
    let message = `👥 Foydalanuvchilar ro'yxati (${page}/${totalPages}):\n\n`;
    
    users.forEach((user, index) => {
      const userNumber = (page - 1) * USERS_PER_PAGE + index + 1;
      const registerDate = new Date(user.registeredAt).toLocaleDateString('uz-UZ');
      const isAdmin = user.isAdmin ? ' (Admin)' : '';
      
      message += `${userNumber}. ${user.firstName} ${user.lastName}${isAdmin}\n`;
      message += `   📱 Tel: ${user.phoneNumber}\n`;
      message += `   📅 Ro'yxatdan o'tgan: ${registerDate}\n\n`;
    });
    
    message += 'Foydalanuvchi haqida to\'liq ma\'lumot olish uchun raqamini tanlang:';
    
    // Raqam tugmalari uchun inline keyboard
    const keyboard = [];
    
    // Foydalanuvchi raqamlari - 1-qator
    const userButtons = users.map((user, index) => {
      const userNumber = (page - 1) * USERS_PER_PAGE + index + 1;
      return { text: userNumber.toString(), callback_data: `user_${user.id}` };
    });
    
    // Raqam tugmalarini qator qilib joylashtirish
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
    
    // Reply markupni yaratish
    const replyMarkup = {
      inline_keyboard: keyboard
    };
    
    logger.info(`USERLIST: Sending message with ${keyboard.length} keyboard rows`);
    
    // Xabarni yuborish - callbackQuery bo'lsa edit qilish
    if (ctx.callbackQuery) {
      try {
        // Mavjud xabarni tahrirlash
        await ctx.editMessageText(message, { reply_markup: replyMarkup });
      } catch (editError) {
        logger.error(`USERLIST: Error editing message: ${editError.message}`);
        // Tahrirlash imkoni bo'lmasa, yangi xabar yuborish
        await ctx.reply(message, { reply_markup: replyMarkup });
      }
    } else {
      // Yangi xabar yuborish
      await ctx.reply(message, { reply_markup: replyMarkup });
    }
    
  } catch (error) {
    logger.error('USERLIST: Error getting users:', error);
    return ctx.reply('Foydalanuvchilar ro\'yxatini olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Foydalanuvchi haqida ma'lumot olish uchun handler
 */
const handleUserDetails = async (ctx) => {
  try {
    logger.info('USERDETAILS: Handler started');
    await ctx.answerCbQuery();
    
    // Foydalanuvchi ID sini olish
    const userId = ctx.match[1];
    logger.info(`USERDETAILS: Requested user ID: ${userId}`);
    
    // Foydalanuvchini bazadan olish
    const user = await db.User.findByPk(userId);
    if (!user) {
      logger.warn(`USERDETAILS: User ID ${userId} not found`);
      return ctx.reply('Foydalanuvchi topilmadi.');
    }
    
    // Foydalanuvchining o'qigan kitoblari sonini olish
    const completedBooksCount = await db.Booking.count({
      where: {
        userId: user.id,
        status: 'returned'
      }
    });
    
    // Joriy band qilingan kitobni olish
    const activeBooking = await db.Booking.findOne({
      where: {
        userId: user.id,
        status: ['booked', 'taken']
      },
      include: [
        { model: db.Book, as: 'book' }
      ]
    });
    
    // Foydalanuvchi haqida ma'lumot ko'rsatish
    let message = `👤 *Foydalanuvchi ma'lumotlari:*\n\n`;
    message += `*Ism-familiya:* ${user.firstName} ${user.lastName}\n`;
    message += `*Telefon:* ${user.phoneNumber}\n`;
    message += `*Pasport:* ${user.passportNumber}\n`;
    message += `*Telegram ID:* ${user.telegramId}\n`;
    message += `*Ro'yxatdan o'tgan:* ${new Date(user.registeredAt).toLocaleDateString('uz-UZ')}\n`;
    message += `*Status:* ${user.isAdmin ? 'Admin' : 'Foydalanuvchi'}\n`;
    message += `*O'qigan kitoblar:* ${completedBooksCount}\n\n`;
    
    // Agar joriy band qilingan kitob bo'lsa
    if (activeBooking) {
      message += `*Joriy band qilingan kitob:*\n`;
      message += `"${activeBooking.book.title}" - ${activeBooking.book.author}\n`;
      
      if (activeBooking.status === 'booked') {
        const expiresDate = new Date(activeBooking.expiresAt).toLocaleDateString('uz-UZ');
        message += `Band qilingan (olib ketilmagan). Ekspiratsiya: ${expiresDate}\n`;
      } else if (activeBooking.status === 'taken') {
        const returnDate = new Date(activeBooking.returnDate).toLocaleDateString('uz-UZ');
        message += `Olib ketilgan. Qaytarish: ${returnDate}\n`;
      }
    } else {
      message += `*Joriy band qilingan kitob:* Yo'q\n`;
    }
    
    // Tugmalar - faqat orqaga qaytish
    const keyboard = [
      [{ text: '🔙 Orqaga', callback_data: 'back_to_users' }]
    ];
    
    // Xabarni jo'natish
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
    
  } catch (error) {
    logger.error('USERDETAILS: Error getting user details:', error);
    return ctx.reply('Foydalanuvchi ma\'lumotlarini olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Foydalanuvchini admin qilish uchun handler
 */
const handleMakeAdmin = async (ctx) => {
  try {
    logger.info('MAKEADMIN: Handler started');
    await ctx.answerCbQuery();
    
    // Foydalanuvchi ID sini olish
    const userId = ctx.match[1];
    logger.info(`MAKEADMIN: Making user ID ${userId} an admin`);
    
    // Foydalanuvchini bazadan olish
    const user = await db.User.findByPk(userId);
    if (!user) {
      logger.warn(`MAKEADMIN: User ID ${userId} not found`);
      return ctx.reply('Foydalanuvchi topilmadi.');
    }
    
    // Foydalanuvchini admin qilish
    await user.update({ isAdmin: true });
    logger.info(`MAKEADMIN: User ${user.firstName} ${user.lastName} is now admin`);
    
    await ctx.reply(`${user.firstName} ${user.lastName} muvaffaqiyatli admin qilindi!`);
    
    // Foydalanuvchiga xabar yuborish
    try {
      const userBot = require('../../user-bot').bot;
      await userBot.telegram.sendMessage(user.telegramId, 
        `🎉 Tabriklaymiz! Siz kutubxona tizimida admin huquqlarini oldingiz.\n\n`
        + `Admin bot: @${config.adminBot.name}`
      );
      logger.info(`MAKEADMIN: Notification sent to user ${user.telegramId}`);
    } catch (notifyError) {
      logger.error(`MAKEADMIN: Error sending notification: ${notifyError.message}`);
    }
    
    // Foydalanuvchilar ro'yxatiga qaytish
    return handleUserList(ctx);
  } catch (error) {
    logger.error(`MAKEADMIN: Error making user admin: ${error.message}`);
    return ctx.reply('Admin qilishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

module.exports = { handleUserList, handleUserDetails, handleMakeAdmin };