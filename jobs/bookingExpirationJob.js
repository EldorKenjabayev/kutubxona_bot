// jobs/bookingExpirationJob.js
const cron = require('node-cron');
const db = require('../database/models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * Band qilish muddati o'tgan kitoblarni avtomatik bekor qilish
 */
const checkExpiredBookings = async () => {
  try {
    logger.info('Band qilish muddati tekshirilmoqda...');
    
    // Muddati o'tgan band qilishlarni tekshirish
    const expiredBookings = await db.Booking.findAll({
      where: {
        status: 'booked',
        expiresAt: {
          [Op.lt]: new Date()
        }
      },
      include: [
        { model: db.User, as: 'user' },
        { model: db.Book, as: 'book' }
      ]
    });
    
    if (expiredBookings.length > 0) {
      logger.info(`${expiredBookings.length} ta band qilish muddati o'tgan.`);
      
      // Har bir band qilish uchun
      for (const booking of expiredBookings) {
        // Transaksiya boshlanishi
        const transaction = await db.sequelize.transaction();
        
        try {
          // Band qilishni "cancelled" qilish
          await booking.update({
            status: 'cancelled'
          }, { transaction });
          
          // Kitob nusxalari sonini oshirish
          await db.Book.update(
            { availableCopies: booking.book.availableCopies + 1 },
            { where: { id: booking.bookId }, transaction }
          );
          
          await transaction.commit();
          
          logger.info(`Booking #${booking.id} - "${booking.book.title}" muddati o'tganligi sababli bekor qilindi.`);
          
          // Foydalanuvchiga xabar yuborish
          try {
            const userBot = require('../bots/user-bot').bot;
            await userBot.telegram.sendMessage(booking.user.telegramId, 
              `⏰ Band qilish muddati o'tdi!\n\n`
              + `"${booking.book.title}" kitobini band qilish muddati o'tganligi sababli bekor qilindi. `
              + `Muddati: ${new Date(booking.expiresAt).toLocaleString('uz-UZ')}\n\n`
              + `Agar siz kitobni hali ham olmoqchi bo'lsangiz, iltimos qaytadan band qiling.`
            );
          } catch (notifyError) {
            logger.error(`Foydalanuvchiga xabar yuborishda xatolik: ${notifyError.message}`);
          }
        } catch (error) {
          await transaction.rollback();
          logger.error(`Band qilishni bekor qilishda xatolik: ${error.message}`);
        }
      }
    } else {
      logger.info('Muddati o`tgan band qilishlar topilmadi.');
    }
  } catch (error) {
    logger.error(`Band qilish muddatini tekshirishda xatolik: ${error.message}`);
  }
};

/**
 * Kitob qaytarish muddati yaqinlashayotgan foydalanuvchilarga eslatma yuborish
 */
const sendReturnReminders = async () => {
  try {
    logger.info('Kitob qaytarish eslatmalari tekshirilmoqda...');
    
    // Bugungi kun
    const today = new Date();
    
    // Eslatma uchun qaytarish muddati 
    const reminderDate = new Date();
    reminderDate.setDate(today.getDate() + config.booking.reminderBeforeDays);
    
    // Qaytarish vaqti yaqinlashgan band qilishlarni olish
    const dueBookings = await db.Booking.findAll({
      where: {
        status: 'taken',
        returnDate: {
          [Op.gte]: today,
          [Op.lt]: reminderDate
        },
        // Eslatma yuborilmagan
        reminderSent: {
          [Op.ne]: true
        }
      },
      include: [
        { model: db.User, as: 'user' },
        { model: db.Book, as: 'book' }
      ]
    });
    
    if (dueBookings.length > 0) {
      logger.info(`${dueBookings.length} ta kitob qaytarish muddati yaqinlashgan.`);
      
      // Har bir band qilish uchun
      for (const booking of dueBookings) {
        try {
          // Eslatma yuborildi deb belgilash
          await booking.update({
            reminderSent: true
          });
          
          // Foydalanuvchiga xabar yuborish
          const userBot = require('../bots/user-bot').bot;
          await userBot.telegram.sendMessage(booking.user.telegramId, 
            `⏰ Eslatma: Kitob qaytarish muddati yaqinlashmoqda!\n\n`
            + `"${booking.book.title}" kitobini qaytarish muddati: ${new Date(booking.returnDate).toLocaleDateString('uz-UZ')}\n\n`
            + `Iltimos, kitobni o'z vaqtida qaytaring.`
          );
          
          logger.info(`Booking #${booking.id} - "${booking.book.title}" uchun qaytarish eslatmasi yuborildi.`);
        } catch (error) {
          logger.error(`Eslatma yuborishda xatolik: ${error.message}`);
        }
      }
    } else {
      logger.info('Qaytarish muddati yaqinlashgan kitoblar topilmadi.');
    }
  } catch (error) {
    logger.error(`Qaytarish eslatmalarini tekshirishda xatolik: ${error.message}`);
  }
};

/**
 * Job larni ishga tushirish
 */
const startBookingJobs = () => {
  // Har 15 daqiqada band qilish muddati o'tganlarni tekshirish
  cron.schedule('*/15 * * * *', checkExpiredBookings);
  
  // Har kuni ertalab 9:00 da qaytarish eslatmalarini yuborish
  cron.schedule('0 9 * * *', sendReturnReminders);
  
  logger.info('Band qilish bilan bog\'liq jobs muvaffaqiyatli ishga tushdi.');
};

module.exports = { startBookingJobs, checkExpiredBookings, sendReturnReminders };