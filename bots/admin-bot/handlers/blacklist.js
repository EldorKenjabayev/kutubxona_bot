// bots/admin-bot/handlers/blacklist.js
const { Markup } = require('telegraf');
const db = require('../../../database/models');
const BlackListService = require('../../../services/blacklistService');
const logger = require('../../../utils/logger');

// Sahifa boshiga nechta foydalanuvchi ko'rsatish
const USERS_PER_PAGE = 5;

/**
 * Qora ro'yxat uchun handler
 */
const handleBlackList = async (ctx, page = 1) => {
  try {
    logger.info(`BLACKLIST: Starting with page ${page}`);
    
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
    }
    
    // Jami qora ro'yxatdagi foydalanuvchilar sonini olish
    const blacklistData = await BlackListService.getBlackListUsers({
      active: true
    });
    
    const totalBlacklisted = blacklistData.count;
    const totalPages = Math.ceil(totalBlacklisted / USERS_PER_PAGE);
    
    logger.info(`BLACKLIST: Found ${totalBlacklisted} blacklisted users, ${totalPages} pages total`);
    
    // Agar qora ro'yxatda foydalanuvchilar bo'lmasa
    if (totalBlacklisted === 0) {
      return ctx.reply('Hozircha qora ro\'yxatda foydalanuvchilar yo\'q.');
    }
    
    // Joriy sahifani saqlash
    ctx.session.currentPage = page;
    ctx.session.totalPages = totalPages;
    ctx.session.pageType = 'blacklist';
    
    // Sahifa uchun foydalanuvchilarni olish
    const blacklistedUsers = await BlackListService.getBlackListUsers({
      limit: USERS_PER_PAGE,
      offset: (page - 1) * USERS_PER_PAGE,
      active: true
    });
    
    // Qora ro'yxat foydalanuvchilarini ko'rsatish
    let message = `⛔️ Qora ro'yxatdagi foydalanuvchilar (${page}/${totalPages}):\n\n`;
    
    blacklistedUsers.rows.forEach((blacklist, index) => {
      const userNumber = (page - 1) * USERS_PER_PAGE + index + 1;
      const user = blacklist.user;
      const bannedDate = new Date(blacklist.bannedAt).toLocaleDateString('uz-UZ');
      
      message += `${userNumber}. ${user.firstName} ${user.lastName}\n`;
      message += `   📱 Tel: ${user.phoneNumber}\n`;
      message += `   🆔 Pasport: ${user.passportNumber}\n`;
      message += `   📅 Qora ro'yxatga tushgan: ${bannedDate}\n`;
      message += `   ⚠️ Sabab: ${getReason(blacklist.reason)}\n\n`;
    });
    
    message += 'Foydalanuvchini qora ro\'yxatdan chiqarish uchun raqamini tanlang:';
    
    // Foydalanuvchilar raqamlari uchun tugmalar
    const userButtons = blacklistedUsers.rows.map((blacklist, index) => {
      const userNumber = (page - 1) * USERS_PER_PAGE + index + 1;
      return { 
        text: userNumber.toString(), 
        callback_data: `blacklist_user_${blacklist.userId}` 
      };
    });
    
    // Raqam tugmalarini qator qilib joylashtirish
    const keyboard = [];
    for (let i = 0; i < userButtons.length; i += 5) {
      keyboard.push(userButtons.slice(i, i + 5));
    }
    
    // Navigatsiya tugmalari
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
    
    // Asosiy menyuga qaytish
    keyboard.push([{ text: '🏠 Menyuga qaytish', callback_data: 'back_to_menu' }]);
    
    // Reply markupni yaratish
    const replyMarkup = {
      inline_keyboard: keyboard
    };
    
    // Xabarni yuborish - callbackQuery bo'lsa edit qilish
    if (ctx.callbackQuery) {
      try {
        // Mavjud xabarni tahrirlash
        await ctx.editMessageText(message, { reply_markup: replyMarkup });
      } catch (editError) {
        logger.error(`BLACKLIST: Error editing message: ${editError.message}`);
        // Tahrirlash imkoni bo'lmasa, yangi xabar yuborish
        await ctx.reply(message, { reply_markup: replyMarkup });
      }
    } else {
      // Yangi xabar yuborish
      await ctx.reply(message, { reply_markup: replyMarkup });
    }
  } catch (error) {
    logger.error('BLACKLIST: Error getting blacklisted users:', error);
    return ctx.reply('Qora ro\'yxatdagi foydalanuvchilarni olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Qora ro'yxat sababi nomi
 * @param {String} reason - Sabab kodi
 * @returns {String} Sabab nomi
 */
const getReason = (reason) => {
  switch(reason) {
    case 'not_returned':
      return 'Kitobni qaytarmaslik';
    case 'not_picked_up':
      return 'Band qilingan kitobni olmaslik';
    default:
      return reason;
  }
};

/**
 * Foydalanuvchini qora ro'yxatdan chiqarish uchun handler
 */
const handleRemoveFromBlackList = async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    // Foydalanuvchi ID sini olish
    const userId = ctx.match[1];
    
    // Foydalanuvchini qora ro'yxatdan chiqarish
    const result = await BlackListService.removeUserFromBlackList(userId);
    
    if (!result) {
      return ctx.reply('Foydalanuvchi qora ro\'yxatda topilmadi.');
    }
    
    // Foydalanuvchini olish
    const user = await db.User.findByPk(userId);
    
    if (!user) {
      return ctx.reply('Foydalanuvchi topilmadi.');
    }
    
    // Foydalanuvchiga xabar yuborish
    try {
      const userBot = require('../../user-bot').bot;
      await userBot.telegram.sendMessage(user.telegramId, 
        `🎉 Siz qora ro'yxatdan chiqarildingiz!\n\n`
        + `Endi siz botdan yana foydalanishingiz mumkin. Iltimos, bundan keyin kutubxona qoidalariga rioya qiling.`
      );
    } catch (notifyError) {
      logger.error(`Foydalanuvchiga qora ro'yxatdan chiqarilgani haqida xabar yuborishda xatolik: ${notifyError.message}`);
    }
    
    await ctx.reply(`${user.firstName} ${user.lastName} muvaffaqiyatli qora ro'yxatdan chiqarildi!`);
    
    // Qora ro'yxat sahifasiga qaytish
    return handleBlackList(ctx);
  } catch (error) {
    logger.error(`Qora ro'yxatdan chiqarishda xatolik: ${error.message}`);
    return ctx.reply('Qora ro\'yxatdan chiqarishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

module.exports = { handleBlackList, handleRemoveFromBlackList };