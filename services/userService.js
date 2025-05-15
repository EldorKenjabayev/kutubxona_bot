// services/userService.js
const db = require('../database/models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Foydalanuvchilar bilan ishlash service klassi
 */
class UserService {
  /**
   * Barcha foydalanuvchilarni olish
   * @param {Object} options - Filterlar va paginatsiya
   * @returns {Promise<Array>} Foydalanuvchilar ro'yxati
   */
  static async getAllUsers(options = {}) {
    try {
      const { limit, offset, orderBy, search } = options;
      
      // Qidiruv uchun where
      let where = {};
      if (search) {
        where = {
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${search}%` } },
            { lastName: { [Op.iLike]: `%${search}%` } },
            { phoneNumber: { [Op.iLike]: `%${search}%` } },
            { passportNumber: { [Op.iLike]: `%${search}%` } }
          ]
        };
      }
      
      // Order by
      let order = [['registeredAt', 'DESC']];
      if (orderBy) {
        order = orderBy;
      }
      
      // Foydalanuvchilarni olish
      const users = await db.User.findAndCountAll({
        where,
        limit: limit || undefined,
        offset: offset || 0,
        order
      });
      
      return users;
    } catch (error) {
      logger.error(`Foydalanuvchilarni olishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Foydalanuvchini olish
   * @param {Object} where - Qidiruv parametrlari
   * @returns {Promise<Object>} Foydalanuvchi
   */
  static async getUser(where) {
    try {
      const user = await db.User.findOne({ where });
      return user;
    } catch (error) {
      logger.error(`Foydalanuvchini olishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Foydalanuvchini yaratish
   * @param {Object} userData - Foydalanuvchi ma'lumotlari
   * @returns {Promise<Object>} Yaratilgan foydalanuvchi
   */
  static async createUser(userData) {
    try {
      // Foydalanuvchini bazadan tekshirish (mavjud yoki yo'qligi)
      const existingUser = await db.User.findOne({
        where: {
          [Op.or]: [
            { telegramId: userData.telegramId },
            { passportNumber: userData.passportNumber }
          ]
        }
      });
      
      if (existingUser) {
        throw new Error('Bu foydalanuvchi allaqachon ro\'yxatdan o\'tgan');
      }
      
      // Foydalanuvchini yaratish
      const user = await db.User.create({
        telegramId: userData.telegramId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        passportNumber: userData.passportNumber,
        isAdmin: userData.isAdmin || false,
        registeredAt: new Date()
      });
      
      logger.info(`Yangi foydalanuvchi ro'yxatdan o'tdi: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
      return user;
    } catch (error) {
      logger.error(`Foydalanuvchini yaratishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Foydalanuvchini yangilash
   * @param {Number} userId - Foydalanuvchi ID si
   * @param {Object} userData - Yangi foydalanuvchi ma'lumotlari
   * @returns {Promise<Object>} Yangilangan foydalanuvchi
   */
  static async updateUser(userId, userData) {
    try {
      // Foydalanuvchini olish
      const user = await db.User.findByPk(userId);
      if (!user) {
        throw new Error('Foydalanuvchi topilmadi');
      }
      
      // Foydalanuvchini yangilash
      await user.update(userData);
      
      // Yangilangan foydalanuvchini olish
      const updatedUser = await db.User.findByPk(userId);
      
      logger.info(`Foydalanuvchi yangilandi: ${updatedUser.firstName} ${updatedUser.lastName} (ID: ${updatedUser.id})`);
      return updatedUser;
    } catch (error) {
      logger.error(`Foydalanuvchini yangilashda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Foydalanuvchini admin qilish
   * @param {Number} userId - Foydalanuvchi ID si
   * @returns {Promise<Object>} Yangilangan foydalanuvchi
   */
  static async makeAdmin(userId) {
    try {
      // Foydalanuvchini olish
      const user = await db.User.findByPk(userId);
      if (!user) {
        throw new Error('Foydalanuvchi topilmadi');
      }
      
      // Foydalanuvchini admin qilish
      await user.update({ isAdmin: true });
      
      logger.info(`Foydalanuvchi admin qilindi: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
      return user;
    } catch (error) {
      logger.error(`Foydalanuvchini admin qilishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Foydalanuvchi band qilishlarini olish
   * @param {Number} userId - Foydalanuvchi ID si
   * @param {String} status - Band qilish statusi (optional)
   * @returns {Promise<Array>} Band qilishlar ro'yxati
   */
  static async getUserBookings(userId, status = null) {
    try {
      // Where sharti
      const where = { userId };
      if (status) {
        where.status = status;
      }
      
      // Band qilishlarni olish
      const bookings = await db.Booking.findAll({
        where,
        include: [
          { model: db.Book, as: 'book' }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      return bookings;
    } catch (error) {
      logger.error(`Foydalanuvchi band qilishlarini olishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Foydalanuvchi aktiv band qilish borligini tekshirish
   * @param {Number} userId - Foydalanuvchi ID si
   * @returns {Promise<Boolean>} Band qilishi bormi
   */
  static async hasActiveBooking(userId) {
    try {
      // Band qilishni olish
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
   * Eng faol foydalanuvchilarni olish
   * @param {Number} limit - Nechta foydalanuvchi olish
   * @returns {Promise<Array>} Eng faol foydalanuvchilar
   */
  static async getTopUsers(limit = 3) {
    try {
      const result = await db.Booking.findAll({
        attributes: [
          'userId',
          [db.sequelize.fn('COUNT', db.sequelize.col('userId')), 'bookingCount']
        ],
        include: [
          {
            model: db.User,
            as: 'user',
            attributes: ['firstName', 'lastName']
          }
        ],
        where: {
          status: ['taken', 'returned']
        },
        group: ['userId', 'user.id'],
        order: [[db.sequelize.literal('bookingCount'), 'DESC']],
        limit
      });
      
      return result.map(item => ({
        userId: item.userId,
        firstName: item.user.firstName,
        lastName: item.user.lastName,
        bookingCount: parseInt(item.getDataValue('bookingCount'))
      }));
    } catch (error) {
      logger.error(`Eng faol foydalanuvchilarni olishda xatolik: ${error.message}`);
      throw error;
    }
  }
}

module.exports = UserService;