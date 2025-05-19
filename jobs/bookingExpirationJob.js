// jobs/bookingExpirationJob.js - Tuzatilgan versiya
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
            
            if (userBot && userBot.telegram) {
              await userBot.telegram.sendMessage(booking.user.telegramId, 
                `⏰ Band qilish muddati o'tdi!\n\n`
                + `"${booking.book.title}" kitobini band qilish muddati o'tganligi sababli bekor qilindi. `
                + `Muddati: ${new Date(booking.expiresAt).toLocaleString('uz-UZ')}\n\n`
                + `Agar siz kitobni hali ham olmoqchi bo'lsangiz, iltimos qaytadan band qiling.`
              );
            } else {
              logger.error('User bot not properly initialized for notifications');
            }
            
            // No-show tracking
            const BlackListService = require('../services/blacklistService');
            const notPickedUpCount = await BlackListService.getUserViolationCount(booking.user.id, 'not_picked_up');
            logger.info(`User ${booking.user.id} has ${notPickedUpCount} not-picked-up violations`);
            
            // Add this violation to the record
            await BlackListService.addUserToBlackList(booking.user.id, 'not_picked_up');
            
            // If this is the 3rd violation, blacklist the user
            if (notPickedUpCount >= 2) { // 0-indexed: 0, 1, 2 = 3 violations
              logger.warn(`User ${booking.user.id} has reached maximum not-picked-up violations. Blacklisting.`);
              
              // Add to blacklist with special permanent status
              await BlackListService.addUserToBlackList(booking.user.id, 'blacklisted_permanent');
              
              // Notify user about blacklisting
              if (userBot && userBot.telegram) {
                await userBot.telegram.sendMessage(booking.user.telegramId, 
                  `⛔️ Siz qora ro'yxatga tushirildingiz!\n\n`
                  + `Siz band qilgan kitoblaringizni muntazam ravishda olmay qo'yganingiz sababli, botdan foydalanish huquqidan mahrum bo'ldingiz.\n\n`
                  + `Iltimos, kutubxona administratoriga murojaat qiling.`
                );
              }
            }
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
    
    logger.info(`Bugungi sana: ${today.toISOString()}, Eslatma chegarasi: ${reminderDate.toISOString()}`);
    
    // Qaytarish vaqti yaqinlashgan band qilishlarni olish
    const dueBookings = await db.Booking.findAll({
      where: {
        status: 'taken',
        returnDate: {
          [Op.gte]: today,
          [Op.lt]: reminderDate
        },
        reminderSent: false // MUHIM O'ZGARTIRISH: reminderSent Booking modelida
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
          
          if (userBot && userBot.telegram) {
            await userBot.telegram.sendMessage(booking.user.telegramId, 
              `⏰ Eslatma: Kitob qaytarish muddati yaqinlashmoqda!\n\n`
              + `"${booking.book.title}" kitobini qaytarish muddati: ${new Date(booking.returnDate).toLocaleDateString('uz-UZ')}\n\n`
              + `Bu muddat ${config.booking.reminderBeforeDays} kundan keyin tugaydi.\n\n`
              + `Iltimos, kitobni o'z vaqtida qaytaring.`
            );
            
            logger.info(`Booking #${booking.id} - "${booking.book.title}" uchun qaytarish eslatmasi yuborildi.`);
          } else {
            logger.error('User bot not properly initialized for sending reminders');
          }
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

// Job larni ishga tushirish
const startBookingJobs = () => {
  // Har 15 daqiqada band qilish muddati o'tganlarni tekshirish
  cron.schedule('*/15 * * * *', async () => {
    try {
      await checkExpiredBookings();
    } catch (error) {
      logger.error(`Error running expired bookings check: ${error.message}`);
    }
  });
  
  // Har kuni ertalab 9:00 da qaytarish eslatmalarini yuborish
  cron.schedule('0 9 * * *', async () => {
    try {
      await sendReturnReminders();
    } catch (error) {
      logger.error(`Error running return reminders: ${error.message}`);
    }
  });
  
  logger.info('Band qilish bilan bog\'liq jobs muvaffaqiyatli ishga tushdi.');
};

module.exports = { 
  startBookingJobs, 
  checkExpiredBookings, 
  sendReturnReminders 
};