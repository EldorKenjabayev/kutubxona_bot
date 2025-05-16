// bots/admin-bot/handlers/admin.js - To'g'rilandi
const { Markup } = require('telegraf');
const db = require('../../../database/models');
const { adminMenuKeyboard } = require('../keyboards/mainMenu');
const logger = require('../../../utils/logger');
const config = require('../../../config/config');

/**
 * /start komandasi uchun handler
 */
const handleStart = async (ctx) => {
  try {
    await ctx.reply(`Salom ${ctx.state.user.firstName}! Kutubxona admin paneliga xush kelibsiz.`, {
      reply_markup: adminMenuKeyboard
    });
  } catch (error) {
    logger.error('Start komandasida xatolik:', error);
    await ctx.reply('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Admin ekanligini tekshirish uchun middleware
 */
const validateAdmin = async (ctx, next) => {
  try {
    // Foydalanuvchini olish
    const user = await db.User.findOne({ 
      where: { 
        telegramId: ctx.from.id.toString() 
      } 
    });
    
    // Agar foydalanuvchi topilmasa yoki admin bo'lmasa
    if (!user || !user.isAdmin) {
      return ctx.reply('Bu bot faqat kutubxona adminlari uchun mo\'ljallangan. Iltimos, kutubxona foydalanuvchi botidan foydalaning.');
    }
    
    // Foydalanuvchi ma'lumotlarini saqlash
    ctx.state.user = user;
    
    return next();
  } catch (error) {
    logger.error('Admin tekshirishda xatolik:', error);
    return ctx.reply('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Foydalanuvchini admin qilish uchun handler
 */
const handleMakeAdmin = async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    // Foydalanuvchi ID sini olish
    const userId = ctx.match[1];
    
    // Foydalanuvchini bazadan olish
    const user = await db.User.findByPk(userId);
    if (!user) {
      return ctx.reply('Foydalanuvchi topilmadi.');
    }
    
    // Foydalanuvchi allaqachon admin ekanligini tekshirish
    if (user.isAdmin) {
      return ctx.reply(`${user.firstName} ${user.lastName} allaqachon admin huquqlariga ega.`);
    }
    
    // Foydalanuvchini admin qilish
    await user.update({ isAdmin: true });
    
    logger.info(`Foydalanuvchi admin qilindi: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    
    await ctx.reply(`${user.firstName} ${user.lastName} muvaffaqiyatli admin qilindi!`);
    
    // Foydalanuvchiga xabar yuborish
    try {
      const userBot = require('../../user-bot').bot;
      await userBot.telegram.sendMessage(user.telegramId, 
        `🎉 Tabriklaymiz! Siz kutubxona tizimida admin huquqlarini oldingiz.\n\n`
        + `Admin bot: @${config.adminBot.name}`
      );
    } catch (notifyError) {
      logger.error(`Foydalanuvchiga admin qilingani haqida xabar yuborishda xatolik: ${notifyError.message}`);
    }
  } catch (error) {
    logger.error('Admin qilishda xatolik:', error);
    return ctx.reply('Admin qilishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

module.exports = { handleStart, validateAdmin, handleMakeAdmin };