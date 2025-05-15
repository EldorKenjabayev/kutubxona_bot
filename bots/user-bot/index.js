// bots/user-bot/index.js
const { Telegraf, session, Scenes } = require('telegraf');
const config = require('../../config/config');
const db = require('../../database/models');
const logger = require('../../utils/logger');

// Sceneler
const { registrationScene } = require('./scenes/registration');
const { bookBookingScene } = require('./scenes/bookBooking');

// Handlerlar
const { handleStart, handleRegistration } = require('./handlers/registration');
const { handleBookList, handleBookDetails } = require('./handlers/bookList');
const { handleBookings, handleCancelBooking } = require('./handlers/bookings');
const { handleSearch, handleSearchQuery, handleSearchPagination } = require('./handlers/search');
const { handleInfo } = require('./handlers/info');

// Klaviaturalar
const { mainMenuKeyboard } = require('./keyboards/mainMenu');

// Bot yaratish
const bot = new Telegraf(config.userBot.token);

// Middleware'lar
bot.use(session());

// Scene managerni o'rnatish
const stage = new Scenes.Stage([registrationScene, bookBookingScene]);
bot.use(stage.middleware());

// Asosiy middleware: foydalanuvchini tekshirish
bot.use(async (ctx, next) => {
  // Foydalanuvchi ma'lumotlarni olish
  if (ctx.from) {
    const user = await db.User.findOne({ where: { telegramId: ctx.from.id.toString() } });
    ctx.state.user = user;
  }
  
  return next();
});

// Start komasai
bot.start(handleStart);

// Ro'yxatdan o'tish
bot.action('register', handleRegistration);

// Asosiy menyu handerlari
bot.hears('📚 Kitoblar ro\'yxati', handleBookList);
bot.hears('📌 Band qilingan kitoblar', handleBookings);
bot.hears('🔍 Qidiruv', handleSearch);
bot.hears('ℹ️ Ma\'lumot', handleInfo);

// Callback query handlerlar
bot.action(/^book_(\d+)$/, handleBookDetails);
bot.action(/^book_(\d+)_reserve$/, (ctx) => ctx.scene.enter('bookBooking', { bookId: ctx.match[1] }));
bot.action(/^cancel_booking_(\d+)$/, handleCancelBooking);
bot.action('back_to_books', handleBookList);
bot.action('back_to_menu', (ctx) => {
  return ctx.reply('Bosh menyu:', { reply_markup: mainMenuKeyboard });
});

// Paginatsiya handerlari
bot.action(/^books_page_(\d+)$/, (ctx) => handleBookList(ctx, parseInt(ctx.match[1])));
bot.action(/^search_page_(\d+)$/, (ctx) => handleSearchPagination(ctx, parseInt(ctx.match[1])));
bot.action('prev_page', (ctx) => {
  const currentPage = ctx.session.currentPage || 1;
  if (currentPage > 1) {
    // Sahifa turiga qarab handler tanlash
    if (ctx.session.pageType === 'search') {
      return handleSearchPagination(ctx, currentPage - 1);
    } else {
      return handleBookList(ctx, currentPage - 1);
    }
  } else {
    return ctx.answerCbQuery('Bu birinchi sahifa');
  }
});
bot.action('next_page', (ctx) => {
  const currentPage = ctx.session.currentPage || 1;
  const totalPages = ctx.session.totalPages || 1;
  
  if (currentPage < totalPages) {
    // Sahifa turiga qarab handler tanlash
    if (ctx.session.pageType === 'search') {
      return handleSearchPagination(ctx, currentPage + 1);
    } else {
      return handleBookList(ctx, currentPage + 1);
    }
  } else {
    return ctx.answerCbQuery('Bu oxirgi sahifa');
  }
});

// Qidiruv so'rovi uchun
bot.on('text', (ctx, next) => {
  // Agar qidiruv rejimida bo'lsa
  if (ctx.session && ctx.session.searchMode) {
    return handleSearchQuery(ctx);
  }
  
  return next();
});

// Bot ishga tushirish
const startUserBot = async () => {
  try {
    await bot.launch();
    logger.info(`${config.userBot.name} muvaffaqiyatli ishga tushdi!`);
  } catch (error) {
    logger.error('Botni ishga tushirishda xatolik:', error);
  }
};

module.exports = { startUserBot, bot };