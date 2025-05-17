// app.js (yangilangan - bot ishga tushirish qismi olib tashlangan)
require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const db = require('./database/models');
const logger = require('./utils/logger');
const config = require('./config/config');
const fileUpload = require('express-fileupload');

// Express serverini yaratish
const app = express();

// Log direktoriyasini tekshirish va yaratish
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Uploads direktoriyasini tekshirish va yaratish
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const uploadsImagesDir = path.join(__dirname, 'uploads/images');
if (!fs.existsSync(uploadsImagesDir)) {
  fs.mkdirSync(uploadsImagesDir);
}

// Static papkani yaratish
const staticDir = path.join(__dirname, 'static');
if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir);
}

// Konfiguratsiya ma'lumotlarini global o'zgaruvchiga saqlash
global.config = config;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  abortOnLimit: true
}));

// Static papka
app.use('/static', express.static(path.join(__dirname, 'static')));

// Image routes
app.use('/images', require('./routes/imageRoutes'));

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
    
    // ⚠️ BOT ISHGA TUSHIRISH KODI OLIB TASHLANDI ⚠️
    // User bot va Admin bot endi alohida ishga tushirilishi kerak
    
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