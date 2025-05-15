// bots/user-bot/handlers/info.js
const { Markup } = require('telegraf');

/**
 * Ma'lumot uchun handler
 */
const handleInfo = async (ctx) => {
  try {
    // Bot haqida ma'lumot
    const infoMessage = `ℹ️ *Kutubxona Bot haqida ma'lumot*\n\n`
      + `Bu bot kutubxonadagi kitoblarni qidirish, ko'rish va band qilish imkoniyatini beradi.\n\n`
      + `*Qoidalar:*\n\n`
      + `1. Har bir foydalanuvchi faqat 1 ta kitobni band qilishi mumkin.\n`
      + `2. Band qilingan kitob 24 soat ichida olib ketilmasa, band qilish avtomatik bekor qilinadi.\n`
      + `3. Kitobni maksimal 10 kun muddatga olish mumkin.\n`
      + `4. Foydalanuvchi kitobni o'z vaqtida qaytarishi kerak.\n\n`
      + `*Bot imkoniyatlari:*\n\n`
      + `📚 *Kitoblar ro'yxati* - barcha mavjud kitoblarni ko'rish\n`
      + `📌 *Band qilingan kitoblar* - o'zingiz band qilgan kitoblarni ko'rish\n`
      + `🔍 *Qidiruv* - kitoblarni nomi yoki muallifi bo'yicha qidirish\n`
      + `ℹ️ *Ma'lumot* - bot haqida ma'lumot va qoidalar\n\n`
      + `Agar qandaydir savollaringiz bo'lsa, iltimos kutubxona ma'muriga murojaat qiling.`;
    
    await ctx.reply(infoMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Ma\'lumot olishda xatolik:', error);
    await ctx.reply('Ma\'lumot olishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
  }
};

module.exports = { handleInfo };