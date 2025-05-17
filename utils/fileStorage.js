// utils/fileStorage.js (xato tuzatilgan)
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

// Rasmlar saqlanadigan papka
const UPLOAD_DIR = path.join(__dirname, '../uploads/images');

// Papkani yaratish (agar mavjud bo'lmasa)
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  logger.info(`Rasmlar uchun papka yaratildi: ${UPLOAD_DIR}`);
}

/**
 * Telegramdan rasmni yuklab olish va mahalliy saqlash
 * @param {String} fileId - Telegram fayl ID'si
 * @param {Object} botInstance - Telegram bot instance
 * @returns {Promise<String>} - Saqlangan fayl manzili
 */
async function downloadAndSaveTelegramImage(fileId, botInstance) {
  try {
    if (!botInstance) {
      throw new Error('Bot instance is not provided');
    }
    
    // Telegram serveridan fayl haqida ma'lumot olish
    const fileInfo = await botInstance.getFile(fileId);
    
    if (!fileInfo || !fileInfo.file_path) {
      throw new Error('Could not get file info from Telegram');
    }
    
    // Bot tokenini olish
    const botToken = botInstance.token;
    if (!botToken) {
      throw new Error('Bot token not available');
    }
    
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;
    
    // Yangi fayl nomi yaratish (takrorlanmas)
    const fileName = `${uuidv4()}.jpg`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // Fayl mazmunini yuklab olish
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream'
    });
    
    // Faylni saqlash
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        logger.info(`Rasm muvaffaqiyatli saqlandi: ${filePath}`);
        resolve(fileName); // Faqat fayl nomini qaytaramiz
      });
      writer.on('error', (err) => {
        logger.error(`Rasmni saqlashda xatolik: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    logger.error(`Rasmni yuklashda xatolik: ${error.message}`);
    throw error;
  }
}

/**
 * Faylni o'qish uchun to'liq yo'lni olish
 * @param {String} fileName - Fayl nomi
 * @returns {String} - Faylning to'liq yo'li
 */
function getImagePath(fileName) {
  return path.join(UPLOAD_DIR, fileName);
}

/**
 * Faylni o'chirish
 * @param {String} fileName - Fayl nomi
 * @returns {Promise<Boolean>} - O'chirish natijasi
 */
async function deleteImage(fileName) {
  if (!fileName) return false;
  
  const filePath = path.join(UPLOAD_DIR, fileName);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Rasm o'chirildi: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Rasmni o'chirishda xatolik: ${error.message}`);
    return false;
  }
}

module.exports = {
  downloadAndSaveTelegramImage,
  getImagePath,
  deleteImage
};