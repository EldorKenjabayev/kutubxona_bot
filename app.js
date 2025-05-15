// app.js - Loglarni qo'shish uchun yangilangan
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const db = require('./database/models');
const { startUserBot } = require('./bots/user-bot');
const { startAdminBot } = require('./bots/admin-bot');
const { startBookingJobs } = require('./jobs/bookingExpirationJob');
const logger = require('./utils/logger');
const config = require('./config/config');

// Express serverini yaratish
const app = express();

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

// Konfiguratsiya printlash (debug uchun)
logger.info("USER_BOT_TOKEN length: " + (process.env.USER_BOT_TOKEN ? process.env.USER_BOT_TOKEN.length : 'undefined'));
logger.info("ADMIN_BOT_TOKEN length: " + (process.env.ADMIN_BOT_TOKEN ? process.env.ADMIN_BOT_TOKEN.length : 'undefined'));
logger.info("Ma'lumotlar bazasi: " + process.env.DB_NAME);

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
      await startUserBot();
      logger.info("User bot muvaffaqiyatli ishga tushdi!");
    } catch (userBotError) {
      logger.error("User botni ishga tushirishda xatolik: " + userBotError.message);
      logger.error(userBotError.stack);
    }
    
    // Admin botni ishga tushirish
    try {
      logger.info("Admin botni ishga tushirish boshlanmoqda...");
      await startAdminBot();
      logger.info("Admin bot muvaffaqiyatli ishga tushdi!");
    } catch (adminBotError) {
      logger.error("Admin botni ishga tushirishda xatolik: " + adminBotError.message);
      logger.error(adminBotError.stack);
    }
    
    // Band qilish jobs larni ishga tushirish
    try {
      startBookingJobs();
      logger.info("Band qilish ishlarini tekshirish jarayoni ishga tushdi");
    } catch (jobsError) {
      logger.error("Band qilish ishlarini tekshirish jarayonini ishga tushirishda xatolik: " + jobsError.message);
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

module.exports = app;