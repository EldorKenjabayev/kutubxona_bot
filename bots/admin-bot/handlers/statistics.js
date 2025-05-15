// bots/admin-bot/handlers/statistics.js
const db = require('../../../database/models');
const { Op } = require('sequelize');
const { Markup } = require('telegraf');
const logger = require('../../../utils/logger');

/**
 * Statistika uchun handler
 */
const handleStatistics = async (ctx) => {
  try {
    // Eng ko'p o'qilgan kitoblar
    const topBooks = await getTopBooks();
    
    // Eng faol foydalanuvchilar
    const topUsers = await getTopUsers();
    
    // Jami statistikani ko'rsatish
    let message = '📊 *KUTUBXONA STATISTIKASI*\n\n';
    
    // Umumiy statistika
    const totalBooks = await db.Book.count();
    const totalUsers = await db.User.count();
    const activeBookings = await db.Booking.count({
      where: {
        status: ['booked', 'taken']
      }
    });
    const completedBookings = await db.Booking.count({
      where: {
        status: 'returned'
      }
    });
    
    message += '*Umumiy ko\'rsatkichlar:*\n';
    message += `📚 Jami kitoblar: ${totalBooks}\n`;
    message += `👥 Jami foydalanuvchilar: ${totalUsers}\n`;
    message += `🔄 Joriy band qilingan kitoblar: ${activeBookings}\n`;
    message += `✅ O'qib tugatilgan kitoblar: ${completedBookings}\n\n`;
    
    // Eng ko'p o'qilgan kitoblar
    message += '*TOP 5 eng ko\'p o\'qilgan kitoblar:*\n';
    
    if (topBooks.length === 0) {
      message += 'Hali statistika mavjud emas.\n';
    } else {
      topBooks.forEach((book, index) => {
        message += `${index + 1}. "${book.title}" - ${book.author} (${book.bookingCount} marta)\n`;
      });
    }
    
    message += '\n';
    
    // Eng faol foydalanuvchilar
    message += '*TOP 3 eng faol foydalanuvchilar:*\n';
    
    if (topUsers.length === 0) {
      message += 'Hali statistika mavjud emas.\n';
    } else {
      topUsers.forEach((user, index) => {
        message += `${index + 1}. ${user.firstName} ${user.lastName} (${user.bookingCount} kitob)\n`;
      });
    }
    
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Statistikani olishda xatolik:', error);
    await ctx.reply('Statistikani olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

/**
 * Eng ko'p o'qilgan kitoblarni olish
 */
const getTopBooks = async () => {
  try {
    const result = await db.sequelize.query(`
      SELECT 
        b.book_id, 
        COUNT(b.book_id) as booking_count,
        bk.title,
        bk.author
      FROM 
        bookings b
      JOIN 
        books bk ON b.book_id = bk.id
      WHERE 
        b.status IN ('taken', 'returned')
      GROUP BY 
        b.book_id, bk.title, bk.author
      ORDER BY 
        booking_count DESC
      LIMIT 5
    `, { type: db.sequelize.QueryTypes.SELECT });
    
    return result.map(item => ({
      bookId: item.book_id,
      title: item.title,
      author: item.author,
      bookingCount: parseInt(item.booking_count)
    }));
  } catch (error) {
    logger.error(`Eng ko'p o'qilgan kitoblarni olishda xatolik: ${error.message}`);
    return [];
  }
};

/**
 * Eng faol foydalanuvchilarni olish
 */
const getTopUsers = async () => {
  try {
    const result = await db.sequelize.query(`
      SELECT 
        b.user_id, 
        COUNT(b.user_id) as booking_count,
        u.first_name,
        u.last_name
      FROM 
        bookings b
      JOIN 
        users u ON b.user_id = u.id
      WHERE 
        b.status IN ('taken', 'returned')
      GROUP BY 
        b.user_id, u.first_name, u.last_name
      ORDER BY 
        booking_count DESC
      LIMIT 3
    `, { type: db.sequelize.QueryTypes.SELECT });
    
    return result.map(item => ({
      userId: item.user_id,
      firstName: item.first_name,
      lastName: item.last_name,
      bookingCount: parseInt(item.booking_count)
    }));
  } catch (error) {
    logger.error(`Eng faol foydalanuvchilarni olishda xatolik: ${error.message}`);
    return [];
  }
};

module.exports = { handleStatistics };