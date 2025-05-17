// routes/imageRoutes.js (yangilangan)
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { getImagePath } = require('../utils/fileStorage');

// No-image rasm yo'lini aniqlash
const DEFAULT_NO_IMAGE = path.join(__dirname, '../static/no-image.jpg');
const UPLOADS_NO_IMAGE = path.join(__dirname, '../uploads/images/no-image.jpg');

// Rasmni ko'rsatish uchun handler
router.get('/:imageName', (req, res) => {
  try {
    const imageName = req.params.imageName;
    
    // Agar so'ralgan rasm 'no-image.jpg' bo'lsa
    if (imageName === 'no-image.jpg') {
      // Avval static papkadagi no-image.jpg ni tekshirish
      if (fs.existsSync(DEFAULT_NO_IMAGE)) {
        logger.info(`No-image faylini ko'rsatish: ${DEFAULT_NO_IMAGE}`);
        return res.sendFile(DEFAULT_NO_IMAGE);
      } 
      // So'ng uploads/images papkasidagi no-image.jpg ni tekshirish
      else if (fs.existsSync(UPLOADS_NO_IMAGE)) {
        logger.info(`No-image faylini ko'rsatish: ${UPLOADS_NO_IMAGE}`);
        return res.sendFile(UPLOADS_NO_IMAGE);
      }
      // Hech qanday no-image topilmasa
      else {
        logger.warn(`No-image fayli topilmadi. Na ${DEFAULT_NO_IMAGE} na ${UPLOADS_NO_IMAGE}`);
        return res.status(404).send('No-image fayli topilmadi');
      }
    }
    
    // Normal rasm uchun yo'l aniqlab olish
    const imagePath = getImagePath(imageName);
    
    // Fayl mavjudligini tekshirish
    if (fs.existsSync(imagePath)) {
      logger.info(`Rasmni ko'rsatish: ${imagePath}`);
      return res.sendFile(imagePath);
    } else {
      logger.warn(`Rasm topilmadi: ${imagePath}, no-image ko'rsatiladi`);
      
      // Avval static papkadagi no-image.jpg ni tekshirish
      if (fs.existsSync(DEFAULT_NO_IMAGE)) {
        return res.sendFile(DEFAULT_NO_IMAGE);
      } 
      // So'ng uploads/images papkasidagi no-image.jpg ni tekshirish
      else if (fs.existsSync(UPLOADS_NO_IMAGE)) {
        return res.sendFile(UPLOADS_NO_IMAGE);
      }
      // Hech qanday no-image topilmasa
      else {
        logger.error(`No-image fayli topilmadi!`);
        return res.status(404).send('Rasm topilmadi');
      }
    }
  } catch (error) {
    logger.error(`Rasmni ko'rsatishda xatolik: ${error.message}`);
    return res.status(500).send('Server xatosi');
  }
});

module.exports = router;