// user-bot.js - отдельный файл для запуска пользовательского бота
require('dotenv').config();
const logger = require('./utils/logger');
const db = require('./database/models');

async function startServer() {
  try {
    // Синхронизация БД 
    await db.sequelize.sync();
    logger.info('База данных успешно синхронизирована');
    
    // Запуск пользовательского бота
    const { startUserBot } = require('./bots/user-bot');
    await startUserBot();
    logger.info('Пользовательский бот успешно запущен');
  } catch (error) {
    logger.error('Ошибка при запуске: ' + error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Запуск сервера
startServer();

// Обработчики остановки процесса
process.on('SIGINT', () => {
  logger.info('Сервер останавливается (SIGINT)');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Сервер останавливается (SIGTERM)');
  process.exit(0);
});

// Глобальный обработчик ошибок
process.on('uncaughtException', (err) => {
  logger.error('Неожиданная ошибка: ' + err.message);
  logger.error(err.stack);
}); 