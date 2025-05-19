// services/bookingService.js
const db = require('../database/models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { addDays } = require('../utils/dateUtils');
const config = require('../config/config');

/**
 * Band qilishlar bilan ishlash service klassi
 */
class BookingService {
  /**
   * Barcha band qilishlarni olish
   * @param {Object} options - Filterlar va paginatsiya
   * @returns {Promise<Array>} Band qilishlar ro'yxati
   */
  static async getAllBookings(options = {}) {
    try {
      const { limit, offset, orderBy, status, userId, bookId } = options;
      
      // Qidiruv uchun where
      let where = {};
      
      if (status) {
        where.status = status;
      }
      
      if (userId) {
        where.userId = userId;
      }
      
      if (bookId) {
        where.bookId = bookId;
      }
      
      // Order by
      let order = [['createdAt', 'DESC']];
      if (orderBy) {
        order = orderBy;
      }
      
      // Band qilishlarni olish
      const bookings = await db.Booking.findAndCountAll({
        where,
        limit: limit || undefined,
        offset: offset || 0,
        order,
        include: [
          { model: db.User, as: 'user' },
          { model: db.Book, as: 'book' }
        ]
      });
      
      return bookings;
    } catch (error) {
      logger.error(`Band qilishlarni olishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Band qilishni yaratish
   * @param {Object} bookingData - Band qilish ma'lumotlari
   * @returns {Promise<Object>} Yaratilgan band qilish
   */
  static async createBooking(bookingData) {
    const transaction = await db.sequelize.transaction();
    
    try {
      const { userId, bookId, durationDays } = bookingData;
      
      // Foydalanuvchini tekshirish
      const user = await db.User.findByPk(userId);
      if (!user) {
        throw new Error('Foydalanuvchi topilmadi');
      }
      
      // Kitobni tekshirish
      const book = await db.Book.findByPk(bookId);
      if (!book) {
        throw new Error('Kitob topilmadi');
      }
      
      // Kitob mavjudligini tekshirish
      if (book.availableCopies <= 0) {
        throw new Error('Kitob mavjud emas');
      }
      
      // Foydalanuvchining mavjud band qilishlarini tekshirish
      const hasActiveBooking = await this.userHasActiveBooking(userId);
      if (hasActiveBooking) {
        throw new Error('Foydalanuvchi allaqachon kitob band qilgan');
      }
      
      const now = new Date();
      // Band qilish expiration vaqti (24 soat)
      const expiresAt = addDays(now, config.booking.pickupTimeLimit / 24);
      // Qaytarish vaqti
      const returnDate = addDays(now, durationDays);
      
      // Band qilishni yaratish
      const booking = await db.Booking.create({
        userId,
        bookId,
        status: 'booked',
        bookedAt: now,
        expiresAt,
        returnDate,
        durationDays,
        reminderSent: false // Eslatma yuborilmagani aniq belgilanmoqda
      }, { transaction });
      
      // Kitobning mavjud nusxalar sonini kamaytirish
      await db.Book.update(
        { availableCopies: book.availableCopies - 1 },
        { where: { id: bookId }, transaction }
      );
      
      await transaction.commit();
      
      logger.info(`Yangi band qilish yaratildi: User #${userId}, Book #${bookId}, ID: ${booking.id}`);
      
      // Yangi yaratilgan band qilishni to'liq ma'lumotlar bilan olish
      const newBooking = await db.Booking.findOne({
        where: { id: booking.id },
        include: [
          { model: db.User, as: 'user' },
          { model: db.Book, as: 'book' }
        ]
      });
      
      return newBooking;
    } catch (error) {
      await transaction.rollback();
      logger.error(`Band qilishni yaratishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Band qilishni bekor qilish
   * @param {Number} bookingId - Band qilish ID si
   * @returns {Promise<Object>} Yangilangan band qilish
   */
  static async cancelBooking(bookingId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Band qilishni olish
      const booking = await db.Booking.findOne({
        where: { 
          id: bookingId,
          status: 'booked'
        },
        include: [{ model: db.Book, as: 'book' }]
      });
      
      if (!booking) {
        throw new Error('Band qilish topilmadi yoki allaqachon bekor qilingan');
      }
      
      // Band qilishni bekor qilish
      await booking.update({
        status: 'cancelled'
      }, { transaction });
      
      // Kitob nusxalari sonini oshirish
      await db.Book.update(
        { availableCopies: booking.book.availableCopies + 1 },
        { where: { id: booking.bookId }, transaction }
      );
      
      await transaction.commit();
      
      logger.info(`Band qilish bekor qilindi: ID: ${bookingId}`);
      return booking;
    } catch (error) {
      await transaction.rollback();
      logger.error(`Band qilishni bekor qilishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Kitob olinganini tasdiqlash
   * @param {Number} bookingId - Band qilish ID si
   * @returns {Promise<Object>} Yangilangan band qilish
   */
  static async confirmBookingTaken(bookingId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Band qilishni olish
      const booking = await db.Booking.findOne({
        where: { 
          id: bookingId,
          status: 'booked'
        }
      });
      
      if (!booking) {
        throw new Error('Band qilish topilmadi yoki allaqachon tasdiqlangan');
      }
      
      const now = new Date();
      
      // Band qilish statusini "taken" ga o'zgartirish
      await booking.update({
        status: 'taken',
        takenAt: now,
        returnDate: addDays(now, booking.durationDays),
        reminderSent: false // Qaytarish eslatmasi yuborilmagan
      }, { transaction });
      
      await transaction.commit();
      
      logger.info(`Kitob olib ketilgani tasdiqlandi: Booking ID: ${bookingId}`);
      
      // Yangilangan band qilishni olish
      const updatedBooking = await db.Booking.findOne({
        where: { id: bookingId },
        include: [
          { model: db.User, as: 'user' },
          { model: db.Book, as: 'book' }
        ]
      });
      
      return updatedBooking;
    } catch (error) {
      await transaction.rollback();
      logger.error(`Kitob olib ketilganini tasdiqlashda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Kitob qaytarilganini tasdiqlash
   * @param {Number} bookingId - Band qilish ID si
   * @returns {Promise<Object>} Yangilangan band qilish
   */
  static async confirmBookingReturned(bookingId) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Band qilishni olish
      const booking = await db.Booking.findOne({
        where: { 
          id: bookingId,
          status: 'taken'
        },
        include: [{ model: db.Book, as: 'book' }]
      });
      
      if (!booking) {
        throw new Error('Band qilish topilmadi yoki kitob olib ketilmagan');
      }
      
      // Band qilishni qaytarildi deb belgilash
      await booking.update({
        status: 'returned',
        returnedAt: new Date()
      }, { transaction });
      
      // Kitob nusxalari sonini oshirish
      await db.Book.update(
        { availableCopies: booking.book.availableCopies + 1 },
        { where: { id: booking.bookId }, transaction }
      );
      
      await transaction.commit();
      
      logger.info(`Kitob qaytarilgani tasdiqlandi: Booking ID: ${bookingId}`);
      
      // Yangilangan band qilishni olish
      const updatedBooking = await db.Booking.findOne({
        where: { id: bookingId },
        include: [
          { model: db.User, as: 'user' },
          { model: db.Book, as: 'book' }
        ]
      });
      
      return updatedBooking;
    } catch (error) {
      await transaction.rollback();
      logger.error(`Kitob qaytarilganini tasdiqlashda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Foydalanuvchining aktiv band qilishi bor-yo'qligini tekshirish
   * @param {Number} userId - Foydalanuvchi ID si
   * @returns {Promise<Boolean>} Aktiv band qilish bormi
   */
  static async userHasActiveBooking(userId) {
    try {
      const booking = await db.Booking.findOne({
        where: {
          userId,
          status: ['booked', 'taken']
        }
      });
      
      return !!booking;
    } catch (error) {
      logger.error(`Foydalanuvchi aktiv band qilishini tekshirishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Muddati o'tgan band qilishlarni olish
   * @returns {Promise<Array>} Muddati o'tgan band qilishlar
   */
  static async getExpiredBookings() {
    try {
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
      
      return expiredBookings;
    } catch (error) {
      logger.error(`Muddati o'tgan band qilishlarni olishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Qaytarish vaqti yaqinlashgan band qilishlarni olish
   * @param {Number} daysBeforeReturn - Qaytarish oldidan necha kun
   * @returns {Promise<Array>} Qaytarish vaqti yaqinlashgan band qilishlar
   */
  static async getDueForReturnBookings(daysBeforeReturn = 1) {
    try {
      // Bugungi kun
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Bugun sananing boshlanish vaqti
      
      // Eslatma uchun qaytarish muddati 
      const reminderDate = addDays(today, daysBeforeReturn);
      reminderDate.setHours(23, 59, 59, 999); // Eslatma sananing so'nggi vaqti
      
      logger.info(`Qaytarish eslatmalari uchun sana oralig'i: ${today.toISOString()} dan ${reminderDate.toISOString()} gacha`);
      
      // Qaytarish vaqti yaqinlashgan band qilishlarni olish
      const dueBookings = await db.Booking.findAll({
        where: {
          status: 'taken',
          returnDate: {
            [Op.gte]: today,
            [Op.lt]: reminderDate
          },
          // Eslatma yuborilmagan
          reminderSent: false
        },
        include: [
          { model: db.User, as: 'user' },
          { model: db.Book, as: 'book' }
        ]
      });
      
      logger.info(`Qaytarish eslatmalari uchun ${dueBookings.length} ta band qilish topildi`);
      
      return dueBookings;
    } catch (error) {
      logger.error(`Qaytarish vaqti yaqinlashgan band qilishlarni olishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Eslatma yuborilganligini belgilash
   * @param {Number} bookingId - Band qilish ID si
   * @returns {Promise<Boolean>} - Yuborish natijasi
   */
  static async markReminderSent(bookingId) {
    try {
      const result = await db.Booking.update(
        { reminderSent: true },
        { where: { id: bookingId } }
      );
      
      logger.info(`Band qilish ID: ${bookingId} uchun eslatma yuborilgani belgilandi (${result[0]} qator yangilandi)`);
      return result[0] > 0;
    } catch (error) {
      logger.error(`Eslatma yuborilganligini belgilashda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Band qilish haqida ma'lumot olish
   * @param {Number} bookingId - Band qilish ID si
   * @returns {Promise<Object>} Band qilish ma'lumotlari
   */
  static async getBookingDetails(bookingId) {
    try {
      const booking = await db.Booking.findOne({
        where: { id: bookingId },
        include: [
          { model: db.User, as: 'user' },
          { model: db.Book, as: 'book' }
        ]
      });
      
      if (!booking) {
        throw new Error('Band qilish topilmadi');
      }
      
      return booking;
    } catch (error) {
      logger.error(`Band qilish ma'lumotlarini olishda xatolik: ${error.message}`);
      throw error;
    }
  }
}

module.exports = BookingService;