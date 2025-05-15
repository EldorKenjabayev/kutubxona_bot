// test-bot.js
require('dotenv').config();
const { Telegraf } = require('telegraf');
const logger = require('./utils/logger');

// Tokenlarni tekshirish
const userBotToken = process.env.USER_BOT_TOKEN;
const adminBotToken = process.env.ADMIN_BOT_TOKEN;

logger.info("USER_BOT_TOKEN: " + userBotToken);
logger.info("ADMIN_BOT_TOKEN: " + adminBotToken);

// Sodda test botni yaratish
async function testUserBot() {
  try {
    const bot = new Telegraf(userBotToken);
    
    // Start komandasi uchun handler
    bot.start(async (ctx) => {
      await ctx.reply('Salom! Bu test USER bot. /start komandasi ishlamoqda!');
    });
    
    // Help komandasi uchun handler
    bot.help(async (ctx) => {
      await ctx.reply('Bu USER bot test rejimida ishlamoqda.');
    });
    
    // Botni ishga tushirish
    await bot.launch();
    logger.info('USER Test bot muvaffaqiyatli ishga tushdi!');
    
  } catch (error) {
    logger.error('USER Test botni ishga tushirishda xatolik:', error);
  }
}

// Sodda test admin botni yaratish
async function testAdminBot() {
  try {
    const bot = new Telegraf(adminBotToken);
    
    // Start komandasi uchun handler
    bot.start(async (ctx) => {
      await ctx.reply('Salom! Bu test ADMIN bot. /start komandasi ishlamoqda!');
    });
    
    // Help komandasi uchun handler
    bot.help(async (ctx) => {
      await ctx.reply('Bu ADMIN bot test rejimida ishlamoqda.');
    });
    
    // Botni ishga tushirish
    await bot.launch();
    logger.info('ADMIN Test bot muvaffaqiyatli ishga tushdi!');
    
  } catch (error) {
    logger.error('ADMIN Test botni ishga tushirishda xatolik:', error);
  }
}

// Testni boshlash
async function runTests() {
  try {
    logger.info("---- Test botlarni ishga tushirish ----");
    
    // User botni sinash
    await testUserBot();
    
    // Admin botni sinash
    await testAdminBot();
    
    logger.info("---- Botlar test qilindi ----");
  } catch (error) {
    logger.error("Test jarayonida xatolik:", error);
  }
}

// Testlarni ishga tushirish
runTests();