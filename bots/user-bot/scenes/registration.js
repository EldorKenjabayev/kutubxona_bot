// bots/user-bot/scenes/registration.js
const { Scenes, Markup } = require('telegraf');
const db = require('../../../database/models');
const { mainMenuKeyboard } = require('../keyboards/mainMenu');
const logger = require('../../../utils/logger');

// Registration scenesi
const registrationScene = new Scenes.WizardScene(
  'registration',
  // 1-qadam: Ism so'rash
  async (ctx) => {
    await ctx.reply('Kutubxona botga xush kelibsiz! Ro\'yxatdan o\'tish uchun ma\'lumotlaringizni kiriting.');
    await ctx.reply('Ismingizni kiriting:');
    return ctx.wizard.next();
  },
  
  // 2-qadam: Familiya so'rash
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Iltimos, to\'g\'ri format kiriting. Ismingizni kiriting:');
      return;
    }
    
    ctx.wizard.state.firstName = ctx.message.text;
    await ctx.reply('Familiyangizni kiriting:');
    return ctx.wizard.next();
  },
  
  // 3-qadam: Telefon raqam so'rash (button orqali)
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Iltimos, to\'g\'ri format kiriting. Familiyangizni kiriting:');
      return;
    }
    
    ctx.wizard.state.lastName = ctx.message.text;
    
    // Telefon raqamni ulashish tugmasini ko'rsatish
    await ctx.reply('Telefon raqamingizni kiriting:', {
      reply_markup: {
        keyboard: [
          [{ text: '📱 Telefon raqamni ulashish', request_contact: true }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
    
    return ctx.wizard.next();
  },
  
  // 4-qadam: Telefon raqamni olish va pasport so'rash
  async (ctx) => {
    // Agar contact bo'lsa (telefon raqamni ulashish tugmasi bosilsa)
    if (ctx.message && ctx.message.contact) {
      // Telegram user_id va contact user_id bir xil bo'lishini tekshirish
      if (ctx.message.contact.user_id !== ctx.from.id) {
        await ctx.reply('Iltimos, o\'zingizni telefon raqamingizni ulashing.');
        return;
      }
      
      ctx.wizard.state.phoneNumber = ctx.message.contact.phone_number;
      
      // Pasport raqam so'rash
      await ctx.reply('Pasport seriya raqamingizni kiriting (masalan: AA1234567):', {
        reply_markup: { remove_keyboard: true }
      });
      
      return ctx.wizard.next();
    } 
    // Agar text bo'lsa (foydalanuvchi qo'lda kiritgan bo'lsa)
    else if (ctx.message && ctx.message.text) {
      // Telefon raqam validatsiyasi
      const phoneRegex = /^\+?[0-9]{10,13}$/;
      if (!phoneRegex.test(ctx.message.text.replace(/\s/g, ''))) {
        await ctx.reply('Noto\'g\'ri telefon raqam formati. Iltimos "Telefon raqamni ulashish" tugmasini bosing yoki raqamni quyidagi formatda kiriting: +998901234567');
        return;
      }
      
      ctx.wizard.state.phoneNumber = ctx.message.text;
      
      // Pasport raqam so'rash
      await ctx.reply('Pasport seriya raqamingizni kiriting (masalan: AA1234567):', {
        reply_markup: { remove_keyboard: true }
      });
      
      return ctx.wizard.next();
    }
    
    // Noto'g'ri format (na contact, na text)
    await ctx.reply('Iltimos, "Telefon raqamni ulashish" tugmasini bosing yoki raqamni quyidagi formatda kiriting: +998901234567');
    return;
  },
  
  // 5-qadam: Ro'yxatdan o'tish
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Iltimos, to\'g\'ri format kiriting. Pasport seriya raqamingizni kiriting:');
      return;
    }
    
    // Pasport raqam validatsiyasi (O'zbekiston pasporti formatiga moslab)
    const passportRegex = /^[A-Z]{2}[0-9]{7}$/;
    if (!passportRegex.test(ctx.message.text.replace(/\s/g, ''))) {
      await ctx.reply('Noto\'g\'ri pasport seriya raqami formati. Iltimos qaytadan kiriting (masalan: AA1234567):');
      return;
    }
    
    ctx.wizard.state.passportNumber = ctx.message.text;
    
    try {
      // Foydalanuvchini saqlash
      const newUser = await db.User.create({
        telegramId: ctx.from.id.toString(),
        firstName: ctx.wizard.state.firstName,
        lastName: ctx.wizard.state.lastName,
        phoneNumber: ctx.wizard.state.phoneNumber,
        passportNumber: ctx.wizard.state.passportNumber,
        registeredAt: new Date()
      });
      
      logger.info(`Yangi foydalanuvchi ro'yxatdan o'tdi: ${newUser.firstName} ${newUser.lastName}`);
      
      // Ro'yxatdan o'tildi
      await ctx.reply(`Tabriklaymiz, ${ctx.wizard.state.firstName}! Siz muvaffaqiyatli ro'yxatdan o'tdingiz.`);
      
      // Asosiy menyuni ko'rsatish
      await ctx.reply('Kutubxona botdan foydalanishingiz mumkin:', {
        reply_markup: mainMenuKeyboard
      });
      
      return ctx.scene.leave();
    } catch (error) {
      logger.error('Foydalanuvchini saqlashda xatolik:', error);
      
      // Pasport yoki telefon raqami mavjud bo'lsa
      if (error.name === 'SequelizeUniqueConstraintError') {
        await ctx.reply('Bu pasport raqami yoki telefon raqami oldin ro\'yxatdan o\'tgan. Iltimos boshqatdan urinib ko\'ring yoki yordam uchun administratorga murojaat qiling.');
      } else {
        await ctx.reply('Ro\'yxatdan o\'tishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      }
      
      // Sceneni qayta boshlash
      return ctx.scene.reenter();
    }
  }
);

// Scenedan chiqish handeri
registrationScene.command('cancel', async (ctx) => {
  await ctx.reply('Ro\'yxatdan o\'tish bekor qilindi.', {
    reply_markup: { remove_keyboard: true }
  });
  return ctx.scene.leave();
});

module.exports = { registrationScene };