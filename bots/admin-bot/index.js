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
const { handleBookings, handleConfirmTaken, handleCancelBooking } = require('./handlers/bookings');
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

// Callback query handlerlar
bot.action(/^book_(\d+)$/, handleBookDetails);
bot.action(/^book_(\d+)_edit$/, (ctx) => ctx.scene.enter('editBook', { bookId: ctx.match[1] }));
bot.action(/^book_(\d+)_delete$/, handleBookDelete);
bot.action(/^confirm_delete_book_(\d+)$/, handleConfirmBookDelete);

bot.action(/^booking_(\d+)_confirm$/, handleConfirmTaken);
bot.action(/^booking_(\d+)_cancel$/, handleCancelBooking);

bot.action(/^user_(\d+)$/, handleUserDetails);
bot.action(/^make_admin_(\d+)$/, handleMakeAdmin);

// Orqaga tugmalari
bot.action('back_to_books', (ctx) => {
  logger.info('ADMIN BOT: Back to books action');
  return handleBookList(ctx);
});

bot.action('back_to_users', (ctx) => {
  logger.info('ADMIN BOT: Back to users action');
  return handleUserList(ctx);
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