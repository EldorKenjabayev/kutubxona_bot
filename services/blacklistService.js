// services/blacklistService.js
const db = require('../database/models');
const logger = require('../utils/logger');

/**
 * Qora ro'yxat bilan ishlash service klassi
 */
class BlackListService {
  /**
   * Foydalanuvchini qora ro'yxatga qo'shish
   * @param {Number} userId - Foydalanuvchi ID si
   * @param {String} reason - Sabab
   * @returns {Promise<Object>} Yaratilgan qora ro'yxat
   */
  static async addUserToBlackList(userId, reason) {
    try {
      // Foydalanuvchini tekshirish
      const user = await db.User.findByPk(userId);
      if (!user) {
        throw new Error('Foydalanuvchi topilmadi');
      }
      
      // Qora ro'yxatga qo'shish
      const blackList = await db.BlackList.create({
        userId,
        reason,
        bannedAt: new Date(),
        isActive: true
      });
      
      logger.info(`Foydalanuvchi qora ro'yxatga qo'shildi: User ID: ${userId}, Sabab: ${reason}`);
      return blackList;
    } catch (error) {
      logger.error(`Qora ro'yxatga qo'shishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Foydalanuvchi qora ro'yxatda ekanligini tekshirish
   * @param {Number} userId - Foydalanuvchi ID si
   * @returns {Promise<Boolean>} Qora ro'yxatda bormi
   */
  static async isUserInBlackList(userId) {
    try {
      const blackList = await db.BlackList.findOne({
        where: {
          userId,
          isActive: true
        }
      });
      
      return !!blackList;
    } catch (error) {
      logger.error(`Qora ro'yxatni tekshirishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Foydalanuvchini qora ro'yxatdan chiqarish
   * @param {Number} userId - Foydalanuvchi ID si
   * @returns {Promise<Boolean>} Natija
   */
  static async removeUserFromBlackList(userId) {
    try {
      const result = await db.BlackList.update(
        { isActive: false },
        { where: { userId, isActive: true } }
      );
      
      if (result[0] > 0) {
        logger.info(`Foydalanuvchi qora ro'yxatdan chiqarildi: User ID: ${userId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error(`Qora ro'yxatdan chiqarishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Qora ro'yxatdagi foydalanuvchilarni olish
   * @param {Object} options - Filterlar va paginatsiya
   * @returns {Promise<Array>} Qora ro'yxat
   */
  static async getBlackListUsers(options = {}) {
    try {
      const { limit, offset, orderBy, active = true } = options;
      
      // Qidiruv uchun where
      let where = { isActive: active };
      
      // Order by
      let order = [['bannedAt', 'DESC']];
      if (orderBy) {
        order = orderBy;
      }
      
      // Qora ro'yxatni olish
      const blackList = await db.BlackList.findAndCountAll({
        where,
        limit: limit || undefined,
        offset: offset || 0,
        order,
        include: [{ model: db.User, as: 'user' }]
      });
      
      return blackList;
    } catch (error) {
      logger.error(`Qora ro'yxatni olishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Foydalanuvchining qora ro'yxatga tushish sabablari sonini olish
   * @param {Number} userId - Foydalanuvchi ID si
   * @param {String} reason - Sabab (optional)
   * @returns {Promise<Number>} Sabab soni
   */
  static async getUserViolationCount(userId, reason = null) {
    try {
      const where = { userId };
      
      if (reason) {
        where.reason = reason;
      }
      
      const count = await db.BlackList.count({ where });
      return count;
    } catch (error) {
      logger.error(`Qora ro'yxat sonini olishda xatolik: ${error.message}`);
      throw error;
    }
  }
}

module.exports = BlackListService;