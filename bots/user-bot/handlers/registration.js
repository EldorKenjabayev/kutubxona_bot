// bots/user-bot/handlers/registration.js
const { Markup } = require('telegraf');
const db = require('../../../database/models');
const { mainMenuKeyboard } = require('../keyboards/mainMenu');
const logger = require('../../../utils/logger');

/**
 * /start komandasi uchun handler
 */
const handleStart = async (ctx) => {
  try {
    // Foydalanuvchi ro'yxatdan o'tganmi yoki yo'qligini tekshirish
    const user = await db.User.findOne({ where: { telegramId: ctx.from.id.toString() } });
    
    if (user) {
      // Agar foydalanuvchi ro'yxatdan o'tgan bo'lsa
      await ctx.reply(`Salom, ${user.firstName}! Kutubxona botga xush kelibsiz.`, {
        reply_markup: mainMenuKeyboard
      });
    } else {
      // Agar foydalanuvchi ro'yxatdan o'tmagan bo'lsa
      // Qo'lda ro'yxatdan o'tishni boshlash
      logger.info(`Yangi foydalanuvchi: ${ctx.from.id} ro'yxatdan o'tish boshlanyapti`);
      return ctx.scene.enter('registration');
    }
  } catch (error) {
    logger.error('Start komandasida xatolik:', error);
    await ctx.reply('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Ro'yxatdan o'tish uchun handler
 */
const handleRegistration = async (ctx) => {
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
    }
    return ctx.scene.enter('registration');
  } catch (error) {
    logger.error('Ro\'yxatdan o\'tishda xatolik:', error);
    await ctx.reply('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

module.exports = { handleStart, handleRegistration };