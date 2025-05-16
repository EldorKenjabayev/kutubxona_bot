// bots/admin-bot/index.js
const { Telegraf, session, Scenes } = require('telegraf');
const config = require('../../config/config');
const db = require('../../database/models');
const logger = require('../../utils/logger');

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

// Klaviaturalar
const { adminMenuKeyboard } = require('./keyboards/mainMenu');

// Bot yaratish
const bot = new Telegraf(config.adminBot.token);

// Middleware'lar
bot.use(session());

// Scene managerni o'rnatish
const stage = new Scenes.Stage([addBookScene, editBookScene]);
bot.use(stage.middleware());

// Asosiy middleware: admin ekanligini tekshirish
bot.use(async (ctx, next) => {
  logger.info(`ADMIN BOT: Received update type: ${ctx.updateType}`);
  
  if (ctx.from) {
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
      return ctx.reply('Bu bot faqat kutubxona adminlari uchun. Iltimos, kutubxona userbot dan foydalaning: @KutubxonaUserBot');
    }
    
    logger.info(`ADMIN BOT: Admin user: ${user.firstName} ${user.lastName}`);
  }
  
  return next();
});

// Start komasai
bot.start(handleStart);

// Asosiy menyu handerlari
bot.hears('➕ Kitob qo\'shish', handleAddBook);
bot.hears('📚 Kitoblar ro\'yxati', handleBookList);
bot.hears('🔒 Band qilingan kitoblar', handleBookings);
bot.hears('📊 Statistika', handleStatistics);
bot.hears('👥 Foydalanuvchilar', handleUserList);
// Action handlerlar qismiga qo'shing
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

bot.action(/^booking_(\d+)_confirm$/, handleConfirmTaken);
bot.action(/^booking_(\d+)_cancel$/, handleCancelBooking);

bot.action(/^user_(\d+)$/, handleUserDetails);
bot.action(/^make_admin_(\d+)$/, handleMakeAdmin);
// BlackList handerlari
const { handleBlackList, handleRemoveFromBlackList } = require('./handlers/blacklist');

// BlackList tugmasini ushlab olish
bot.hears('⛔️ Qora ro\'yxat', handleBlackList);

// BlackList callback handerlari
bot.action(/^blacklist_user_(\d+)$/, handleRemoveFromBlackList);
bot.action(/^blacklist_page_(\d+)$/, (ctx) => handleBlackList(ctx, parseInt(ctx.match[1])));

// Update pagination handler
bot.action('prev_page', (ctx) => {
  const currentPage = ctx.session.currentPage || 1;
  logger.info(`Previous page, current: ${currentPage}, type: ${ctx.session.pageType}`);
  
  if (currentPage > 1) {
    // Sahifa turiga qarab handler tanlash
    if (ctx.session.pageType === 'books') {
      return handleBookList(ctx, currentPage - 1);
    } else if (ctx.session.pageType === 'users') {
      return handleUserList(ctx, currentPage - 1);
    } else if (ctx.session.pageType === 'bookings') {
      return handleBookings(ctx, currentPage - 1);
    } else if (ctx.session.pageType === 'blacklist') {
      return handleBlackList(ctx, currentPage - 1);
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
    // Sahifa turiga qarab handler tanlash
    if (ctx.session.pageType === 'books') {
      return handleBookList(ctx, currentPage + 1);
    } else if (ctx.session.pageType === 'users') {
      return handleUserList(ctx, currentPage + 1);
    } else if (ctx.session.pageType === 'bookings') {
      return handleBookings(ctx, currentPage + 1);
    } else if (ctx.session.pageType === 'blacklist') {
      return handleBlackList(ctx, currentPage + 1);
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
  // Go back to the bookings main menu
  ctx.session.bookingType = null;
  return handleBookings(ctx);
});

bot.action('back_to_menu', (ctx) => {
  logger.info('ADMIN BOT: Back to menu action');
  return ctx.reply('Admin menyu:', { reply_markup: adminMenuKeyboard });
});

// Paginatsiya handerlari
bot.action(/^books_page_(\d+)$/, (ctx) => {
  logger.info(`ADMIN BOT: Books page ${ctx.match[1]} selected`);
  return handleBookList(ctx, parseInt(ctx.match[1]));
});

bot.action(/^users_page_(\d+)$/, (ctx) => {
  logger.info(`ADMIN BOT: Users page ${ctx.match[1]} selected`);
  return handleUserList(ctx, parseInt(ctx.match[1]));
});

bot.action(/^bookings_page_(\d+)$/, (ctx) => {
  logger.info(`ADMIN BOT: Bookings page ${ctx.match[1]} selected`);
  return handleBookings(ctx, parseInt(ctx.match[1]));
});

bot.action('prev_page', (ctx) => {
  const currentPage = ctx.session.currentPage || 1;
  logger.info(`ADMIN BOT: Previous page, current: ${currentPage}, type: ${ctx.session.pageType}`);
  
  if (currentPage > 1) {
    // Sahifa turiga qarab handler tanlash
    if (ctx.session.pageType === 'books') {
      return handleBookList(ctx, currentPage - 1);
    } else if (ctx.session.pageType === 'users') {
      return handleUserList(ctx, currentPage - 1);
    } else if (ctx.session.pageType === 'bookings') {
      return handleBookings(ctx, currentPage - 1);
    }
  } else {
    return ctx.answerCbQuery('Bu birinchi sahifa');
  }
});

bot.action('next_page', (ctx) => {
  const currentPage = ctx.session.currentPage || 1;
  const totalPages = ctx.session.totalPages || 1;
  logger.info(`ADMIN BOT: Next page, current: ${currentPage}, total: ${totalPages}, type: ${ctx.session.pageType}`);
  
  if (currentPage < totalPages) {
    // Sahifa turiga qarab handler tanlash
    if (ctx.session.pageType === 'books') {
      return handleBookList(ctx, currentPage + 1);
    } else if (ctx.session.pageType === 'users') {
      return handleUserList(ctx, currentPage + 1);
    } else if (ctx.session.pageType === 'bookings') {
      return handleBookings(ctx, currentPage + 1);
    }
  } else {
    return ctx.answerCbQuery('Bu oxirgi sahifa');
  }
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
// Bot ishga tushirish
const startAdminBot = async () => {
  try {
    await bot.launch();
    logger.info(`ADMIN BOT: ${config.adminBot.name} muvaffaqiyatli ishga tushdi!`);
  } catch (error) {
    logger.error(`ADMIN BOT: Botni ishga tushirishda xatolik: ${error.message}`);
    logger.error(error.stack);
  }
};

// Xatoliklarni tutib olish
bot.catch((err, ctx) => {
  logger.error(`ADMIN BOT: Error processing update ${ctx.updateType}: ${err.message}`);
  logger.error(err.stack);
  
  // Foydalanuvchiga xatolik haqida xabar berish
  ctx.reply('Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring yoki administratorga murojaat qiling.');
});

module.exports = { startAdminBot, bot };