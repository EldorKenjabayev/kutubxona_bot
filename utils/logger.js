// utils/logger.js
const winston = require('winston');
const path = require('path');

// Log fayllarini saqlash uchun papka
const logDir = path.join(__dirname, '../logs');

// Winston logger yaratish
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
      )
    }),
    // File transport - barcha loglar
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log')
    }),
    // File transport - faqat xatolar
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    })
  ]
});

module.exports = logger; 