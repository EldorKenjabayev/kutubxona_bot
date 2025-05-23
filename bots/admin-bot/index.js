// bots/admin-bot/index.js - To'liq qayta ko'rilgan versiya
const { Telegraf, session, Scenes } = require('telegraf');
const logger = require('../../utils/logger');
const config = require('../../config/config');

// Sceneler
const { addBookScene } = require('./scenes/addBook');
const { editBookScene } = require('./scenes/editBook');

// Handlerlar
const { handleStart, validateAdmin } = require('./handlers/admin');
const { handleAddBook } = require('./handlers/addBook');
const { handleBookList, handleBookDetails, handleBookDelete, handleConfirmBookDelete } = require('./handlers/bookList');
const { handleBookingDetails, handleConfirmTaken, handleCancelBooking, handleConfirmReturned, handleConfirmNotReturned, handleBookings } = require('./handlers/bookings');
const { handleStatistics } = require('./handlers/statistics');
const { handleUserList, handleUserDetails, handleMakeAdmin } = require('./handlers/users');
const { handleBlackList, handleRemoveFromBlackList } = require('./handlers/blacklist');
const { handleSearch, handleSearchQuery, handleSearchPagination, handleUserActiveBooking } = require('./handlers/searchUsers');

// Klaviaturalar
const { adminMenuKeyboard } = require('./keyboards/mainMenu');

// Bot yaratish
let bot = null;

// Bot ishga tushirish
const startAdminBot = async () => {
  try {
    // Environment variables tekshirish
    const adminToken = process.env.ADMIN_BOT_TOKEN || config.adminBot.token;
    if (!adminToken) {
      throw new Error('ADMIN_BOT_TOKEN topilmadi! .env faylini tekshiring.');
    }
    
    logger.info(`ADMIN BOT: Token uzunligi ${adminToken.length}`);
    
    // Botni yaratish
    bot = new Telegraf(adminToken, { webhookReply: false });
    
    // Middleware'lar
    bot.use(session());
    
    // Scene managerni o'rnatish
    const stage = new Scenes.Stage([addBookScene, editBookScene]);
    bot.use(stage.middleware());
    
    // Asosiy middleware: admin ekanligini tekshirish
    bot.use(async (ctx, next) => {
      if (!ctx.from) {
        logger.warn('ADMIN BOT: ctx.from mavjud emas');
        return;
      }
      
      try {
        const db = require('../../database/models');
        const user = await db.User.findOne({ 
          where: { 
            telegramId: ctx.from.id.toString() 
          } 
        });
        
        // Foydalanuvchi ma'lumotlarini saqlash
        ctx.state.user = user;
        
        // Agar foydalanuvchi admin bo'lmasa, unda xabar berish
        if (!user || !user.isAdmin) {
          logger.warn(`ADMIN BOT: Non-admin user tried to access: ${ctx.from.id}`);
          return ctx.reply('Bu bot faqat kutubxona adminlari uchun. Iltimos, kutubxona userbot dan foydalaning: @kutuxona_online_www_bot');
        }
        
        logger.info(`ADMIN BOT: Admin user: ${user.firstName} ${user.lastName}`);
        return next();
      } catch (error) {
        logger.error(`ADMIN BOT middleware error: ${error.message}`);
        return ctx.reply('Server xatosi yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      }
    });
    
    // Start komasai
    bot.start(handleStart);
    
    // Asosiy menyu handerlari
    bot.hears('➕ Kitob qo\'shish', handleAddBook);
    bot.hears('📚 Kitoblar ro\'yxati', handleBookList);
    bot.hears('🔒 Band qilingan kitoblar', handleBookings);
    bot.hears('📊 Statistika', handleStatistics);
    bot.hears('👥 Foydalanuvchilar', handleUserList);
    bot.hears('⛔️ Qora ro\'yxat', handleBlackList);
    bot.hears('🔍 Foydalanuvchilarni qidirish', handleSearch);
    
    // Action handlerlar
    bot.action(/^booking_(\d+)$/, handleBookingDetails);
    bot.action(/^booking_(\d+)_confirm$/, handleConfirmTaken);
    bot.action(/^booking_(\d+)_cancel$/, handleCancelBooking);
    bot.action(/^booking_(\d+)_returned$/, handleConfirmReturned);
    bot.action(/^booking_(\d+)_not_returned$/, handleConfirmNotReturned);
    
    // Callback query handlerlar
    bot.action(/^book_(\d+)$/, handleBookDetails);
    bot.action(/^book_(\d+)_edit$/, (ctx) => ctx.scene.enter('editBook', { bookId: ctx.match[1] }));
    bot.action(/^book_(\d+)_delete$/, handleBookDelete);
    bot.action(/^confirm_delete_book_(\d+)$/, handleConfirmBookDelete);
    
    bot.action(/^user_(\d+)$/, async (ctx) => {
      const userId = ctx.match[1];
      const hasBookings = await handleUserActiveBooking(ctx, userId);
      
      if (!hasBookings) {
        return handleUserDetails(ctx);
      }
    });
    
    bot.action(/^make_admin_(\d+)$/, handleMakeAdmin);
    
    // BlackList callback handerlari
    bot.action(/^blacklist_user_(\d+)$/, handleRemoveFromBlackList);
    bot.action(/^blacklist_page_(\d+)$/, (ctx) => handleBlackList(ctx, parseInt(ctx.match[1])));
    
    // Search-related actions
    bot.action('back_to_search', (ctx) => {
      const currentPage = ctx.session.currentPage || 1;
      if (ctx.session.pageType === 'search_users') {
        return handleSearchPagination(ctx, currentPage);
      } else {
        return handleSearch(ctx);
      }
    });
    
    bot.action(/^search_users_page_(\d+)$/, (ctx) => {
      return handleSearchPagination(ctx, parseInt(ctx.match[1]));
    });
    
    // Pagination handler
    bot.action('prev_page', (ctx) => {
      const currentPage = ctx.session.currentPage || 1;
      logger.info(`Previous page, current: ${currentPage}, type: ${ctx.session.pageType}`);
      
      if (currentPage > 1) {
        if (ctx.session.pageType === 'books') {
          return handleBookList(ctx, currentPage - 1);
        } else if (ctx.session.pageType === 'users') {
          return handleUserList(ctx, currentPage - 1);
        } else if (ctx.session.pageType === 'bookings') {
          return handleBookings(ctx, currentPage - 1);
        } else if (ctx.session.pageType === 'blacklist') {
          return handleBlackList(ctx, currentPage - 1);
        } else if (ctx.session.pageType === 'search_users') {
          return handleSearchPagination(ctx, currentPage - 1);
        }
      } else {
        return ctx.answerCbQuery('Bu birinchi sahifa');
      }
    });
    
    bot.action('next_page', (ctx) => {
      const currentPage = ctx.session.currentPage || 1;
      const totalPages = ctx.session.totalPages || 1;
      logger.info(`Next page, current: ${currentPage}, total: ${totalPages}, type: ${ctx.session.pageType}`);
      
      if (currentPage < totalPages) {
        if (ctx.session.pageType === 'books') {
          return handleBookList(ctx, currentPage + 1);
        } else if (ctx.session.pageType === 'users') {
          return handleUserList(ctx, currentPage + 1);
        } else if (ctx.session.pageType === 'bookings') {
          return handleBookings(ctx, currentPage + 1);
        } else if (ctx.session.pageType === 'blacklist') {
          return handleBlackList(ctx, currentPage + 1);
        } else if (ctx.session.pageType === 'search_users') {
          return handleSearchPagination(ctx, currentPage + 1);
        }
      } else {
        return ctx.answerCbQuery('Bu oxirgi sahifa');
      }
    });
    
    // Orqaga tugmalari
    bot.action('back_to_books', (ctx) => {
      return handleBookList(ctx, ctx.session.currentPage || 1);
    });
    
    bot.action('back_to_users', (ctx) => {
      logger.info('ADMIN BOT: Back to users action');
      return handleUserList(ctx);
    });
    
    bot.action('back_to_bookings', (ctx) => {
      ctx.session.bookingType = null;
      return handleBookings(ctx);
    });
    
    bot.action('back_to_menu', (ctx) => {
      logger.info('ADMIN BOT: Back to menu action');
      return ctx.reply('Admin menyu:', { reply_markup: adminMenuKeyboard });
    });
    
    // Booking related actions
    bot.action('show_booked', (ctx) => {
      ctx.session.bookingType = 'booked';
      return handleBookings(ctx, 1);
    });
    
    bot.action('show_taken', (ctx) => {
      ctx.session.bookingType = 'taken';
      return handleBookings(ctx, 1);
    });
    
    bot.action('bookings_main', (ctx) => {
      ctx.session.bookingType = null;
      return handleBookings(ctx);
    });
    
    // Add handler for text messages to handle search queries
    bot.on('text', (ctx, next) => {
      // Check if in admin search mode
      if (ctx.session && ctx.session.adminSearchMode) {
        return handleSearchQuery(ctx);
      }
      return next();
    });
    
    // Xatoliklarni tutib olish
    bot.catch((err, ctx) => {
      logger.error(`ADMIN BOT: Error processing update ${ctx?.updateType}: ${err.message}`);
      logger.error(err.stack);
      
      // Foydalanuvchiga xatolik haqida xabar berish
      if (ctx && ctx.reply) {
        ctx.reply('Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring yoki administratorga murojaat qiling.');
      }
    });
    
    // Botni ishga tushirish
    logger.info("ADMIN BOT: Botni ishga tushirish...");
    
    // Токен для запуска
    logger.info(`ADMIN BOT: Ishlatilayotgan token: ${adminToken.substring(0, 5)}...${adminToken.substring(adminToken.length - 5)}`);
    
    try {
      // Добавляем дополнительные опции для запуска бота
      await bot.launch({
        allowedUpdates: ['message', 'callback_query', 'my_chat_member'],
        dropPendingUpdates: true
      });
      logger.info("ADMIN BOT: muvaffaqiyatli ishga tushdi!");
      return true;
    } catch (launchError) {
      logger.error(`ADMIN BOT: Launch error: ${launchError.message}`);
      logger.error(launchError.stack);
      throw launchError;
    }
  } catch (error) {
    logger.error(`ADMIN BOT: Botni ishga tushirishda xatolik: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
};

module.exports = { startAdminBot, bot };