// app.js - Xatoliklarni tuzatish uchun yangilangan versiya
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const db = require('./database/models');
const logger = require('./utils/logger');
const config = require('./config/config');

// Express serverini yaratish
const app = express();

// Log direktoriyasini tekshirish va yaratish
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Konfiguratsiya ma'lumotlarini global o'zgaruvchiga saqlash
global.config = config;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Asosiy rout
app.get('/', (req, res) => {
  res.send('Kutubxona Bot serveri ishlamoqda!');
});

// Server ishga tushirish
const PORT = config.server.port;

// Bot tokenlarini tekshirish
logger.info("USER_BOT_TOKEN uzunligi: " + (process.env.USER_BOT_TOKEN ? process.env.USER_BOT_TOKEN.length : 'aniqlanmadi'));
logger.info("ADMIN_BOT_TOKEN uzunligi: " + (process.env.ADMIN_BOT_TOKEN ? process.env.ADMIN_BOT_TOKEN.length : 'aniqlanmadi'));
logger.info("Ma'lumotlar bazasi: " + process.env.DB_NAME);

// Botlar config-dagi tokenlarini tekshirish 
logger.info("CONFIG USER_BOT_TOKEN mavjud: " + (config.userBot.token ? 'ha' : 'yo\'q'));
logger.info("CONFIG ADMIN_BOT_TOKEN mavjud: " + (config.adminBot.token ? 'ha' : 'yo\'q'));

// Ma'lumotlar bazasini sinxronlash va serverni ishga tushirish
const startServer = async () => {
  try {
    // Ma'lumotlar bazasini sinxronlash
    await db.sequelize.sync();
    logger.info('Ma\'lumotlar bazasi muvaffaqiyatli sinxronlashtirildi.');
    
    // HTTP serverni ishga tushirish
    app.listen(PORT, () => {
      logger.info(`Server ${PORT} portda ishga tushdi!`);
    });
    
    // User botni ishga tushirish
    try {
      logger.info("User botni ishga tushirish boshlanmoqda...");
      const { startUserBot } = require('./bots/user-bot');
      await startUserBot();
      logger.info("User bot muvaffaqiyatli ishga tushdi!");
    } catch (userBotError) {
      logger.error("User botni ishga tushirishda xatolik: " + userBotError.message);
      logger.error(userBotError.stack);
    }
    
    // Admin botni ishga tushirish
    try {
      logger.info("Admin botni ishga tushirish boshlanmoqda...");
      const { startAdminBot } = require('./bots/admin-bot');
      
      // MUHIM: Admin botga shunday yo'naltiramiz
      if (!startAdminBot) {
        throw new Error("startAdminBot funksiyasi topilmadi! ./bots/admin-bot dan to'g'ri export qilinganiga ishonch hosil qiling.");
      }
      
      // Admin bot tokenini tekshirish
      if (!process.env.ADMIN_BOT_TOKEN && !config.adminBot.token) {
        logger.error("ADMIN_BOT_TOKEN aniqlanmadi! Na .env faylida, na config.js faylida.");
        throw new Error("ADMIN_BOT_TOKEN aniqlanmadi!");
      }
      
      // Botni ishga tushirishga urinish
      const adminBotStarted = await startAdminBot();
      if (adminBotStarted) {
        logger.info("Admin bot muvaffaqiyatli ishga tushdi!");
      } else {
        logger.error("Admin bot ishga tushmadi, lekin xatolik chiqmadi");
      }
    } catch (adminBotError) {
      logger.error("Admin botni ishga tushirishda xatolik: " + adminBotError.message);
      logger.error(adminBotError.stack);
    }
    
    // Band qilish jobs larni ishga tushirish
    try {
      logger.info("Band qilish ishlarini tekshirish jarayoni ishga tushirish boshlanmoqda...");
      const { startBookingJobs } = require('./jobs/bookingExpirationJob');
      startBookingJobs();
      logger.info("Band qilish ishlarini tekshirish jarayoni ishga tushdi");
    } catch (jobsError) {
      logger.error("Band qilish ishlarini tekshirish jarayonini ishga tushirishda xatolik: " + jobsError.message);
      logger.error(jobsError.stack);
    }
    
  } catch (error) {
    logger.error(`Serverni ishga tushirishda xatolik: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
};

// Serverni ishga tushirish
startServer();

// Jarayonni to'xtatish obrabotchiklari
process.on('SIGINT', () => {
  logger.info('Server to\'xtatilmoqda (SIGINT)');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Server to\'xtatilmoqda (SIGTERM)');
  process.exit(0);
});

// Global xatoliklarni tutib olish
process.on('uncaughtException', (err) => {
  logger.error('Kutilmagan xatolik: ' + err.message);
  logger.error(err.stack);
});

module.exports = app;