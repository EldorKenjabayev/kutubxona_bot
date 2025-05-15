// services/bookService.js
const db = require('../database/models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Kitoblar bilan ishlash service klassi
 */
class BookService {
  /**
   * Barcha kitoblarni olish
   * @param {Object} options - Filterlar va paginatsiya
   * @returns {Promise<Array>} Kitoblar ro'yxati
   */
  static async getAllBooks(options = {}) {
    try {
      const { limit, offset, orderBy, search } = options;
      
      // Qidiruv uchun where
      let where = {};
      if (search) {
        where = {
          [Op.or]: [
            { title: { [Op.iLike]: `%${search}%` } },
            { author: { [Op.iLike]: `%${search}%` } }
          ]
        };
      }
      
      // Order by
      let order = [['title', 'ASC']];
      if (orderBy) {
        order = orderBy;
      }
      
      // Kitoblarni olish
      const books = await db.Book.findAndCountAll({
        where,
        limit: limit || undefined,
        offset: offset || 0,
        order
      });
      
      return books;
    } catch (error) {
      logger.error(`Kitoblarni olishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Kitob qo'shish
   * @param {Object} bookData - Kitob ma'lumotlari
   * @returns {Promise<Object>} Yaratilgan kitob
   */
  static async addBook(bookData) {
    try {
      // Kitobni yaratish
      const newBook = await db.Book.create({
        title: bookData.title,
        author: bookData.author,
        imageId: bookData.imageId || null,
        copies: bookData.copies || 1,
        availableCopies: bookData.copies || 1
      });
      
      logger.info(`Yangi kitob qo'shildi: "${newBook.title}" (ID: ${newBook.id})`);
      return newBook;
    } catch (error) {
      logger.error(`Kitob qo'shishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Kitobni yangilash
   * @param {Number} bookId - Kitob ID si
   * @param {Object} bookData - Yangi kitob ma'lumotlari
   * @returns {Promise<Object>} Yangilangan kitob
   */
  static async updateBook(bookId, bookData) {
    try {
      // Kitobni olish
      const book = await db.Book.findByPk(bookId);
      if (!book) {
        throw new Error('Kitob topilmadi');
      }
      
      // Band qilingan nusxalarni hisoblash
      const bookedCopies = book.copies - book.availableCopies;
      
      // Yangilanadigan ma'lumotlar
      const updateData = {};
      
      if (bookData.title !== undefined) {
        updateData.title = bookData.title;
      }
      
      if (bookData.author !== undefined) {
        updateData.author = bookData.author;
      }
      
      if (bookData.imageId !== undefined) {
        updateData.imageId = bookData.imageId;
      }
      
      if (bookData.copies !== undefined) {
        updateData.copies = bookData.copies;
        // Mavjud nusxalarni yangilash
        const newAvailableCopies = Math.max(0, bookData.copies - bookedCopies);
        updateData.availableCopies = newAvailableCopies;
      }
      
      // Kitobni yangilash
      await book.update(updateData);
      
      // Yangilangan kitobni olish
      const updatedBook = await db.Book.findByPk(bookId);
      
      logger.info(`Kitob yangilandi: "${updatedBook.title}" (ID: ${updatedBook.id})`);
      return updatedBook;
    } catch (error) {
      logger.error(`Kitobni yangilashda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Kitobni o'chirish
   * @param {Number} bookId - Kitob ID si
   * @returns {Promise<Boolean>} O'chirish natijasi
   */
  static async deleteBook(bookId) {
    try {
      // Kitobni olish
      const book = await db.Book.findByPk(bookId);
      if (!book) {
        throw new Error('Kitob topilmadi');
      }
      
      // Kitob band qilinganligini tekshirish
      const hasBookings = await db.Booking.findOne({
        where: {
          bookId,
          status: ['booked', 'taken']
        }
      });
      
      if (hasBookings) {
        throw new Error('Bu kitob band qilingan, o\'chirib bo\'lmaydi');
      }
      
      // Kitobni o'chirish
      await book.destroy();
      
      logger.info(`Kitob o'chirildi: "${book.title}" (ID: ${bookId})`);
      return true;
    } catch (error) {
      logger.error(`Kitobni o'chirishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Kitob mavjudligini tekshirish
   * @param {Number} bookId - Kitob ID si
   * @returns {Promise<Boolean>} Kitob mavjudmi
   */
  static async isBookAvailable(bookId) {
    try {
      const book = await db.Book.findByPk(bookId);
      if (!book) {
        return false;
      }
      
      return book.availableCopies > 0;
    } catch (error) {
      logger.error(`Kitob mavjudligini tekshirishda xatolik: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Eng ko'p o'qilgan kitoblarni olish
   * @param {Number} limit - Nechta kitob olish
   * @returns {Promise<Array>} Eng ko'p o'qilgan kitoblar
   */
  static async getTopBooks(limit = 5) {
    try {
      const result = await db.Booking.findAll({
        attributes: [
          'bookId',
          [db.sequelize.fn('COUNT', db.sequelize.col('bookId')), 'bookingCount']
        ],
        include: [
          {
            model: db.Book,
            as: 'book',
            attributes: ['title', 'author']
          }
        ],
        where: {
          status: ['taken', 'returned']
        },
        group: ['bookId', 'book.id'],
        order: [[db.sequelize.literal('bookingCount'), 'DESC']],
        limit
      });
      
      return result.map(item => ({
        bookId: item.bookId,
        title: item.book.title,
        author: item.book.author,
        bookingCount: parseInt(item.getDataValue('bookingCount'))
      }));
    } catch (error) {
      logger.error(`Eng ko'p o'qilgan kitoblarni olishda xatolik: ${error.message}`);
      throw error;
    }
  }
}

module.exports = BookService;