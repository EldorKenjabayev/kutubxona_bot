// bots/admin-bot/scenes/addBook.js (xato tuzatilgan)
const { Scenes } = require('telegraf');
const db = require('../../../database/models');
const { adminMenuKeyboard } = require('../keyboards/mainMenu');
const logger = require('../../../utils/logger');
const { downloadAndSaveTelegramImage } = require('../../../utils/fileStorage');

// Kitob qo'shish scenesi
const addBookScene = new Scenes.WizardScene(
  'addBook',
  // 1-qadam: Kitob nomini so'rash
  async (ctx) => {
    logger.info("ADDBOOK SCENE: Step 1 started");
    await ctx.reply('Yangi kitob qo\'shish.\n\nKitob nomini kiriting:');
    return ctx.wizard.next();
  },
  
  // 2-qadam: Muallif nomini so'rash
  async (ctx) => {
    logger.info("ADDBOOK SCENE: Step 2 started");
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Iltimos, to\'g\'ri formatda kitob nomini kiriting:');
      return;
    }
    
    ctx.wizard.state.title = ctx.message.text;
    await ctx.reply('Muallif ismini kiriting:');
    return ctx.wizard.next();
  },
  
  // 3-qadam: Nusxalar sonini so'rash
  async (ctx) => {
    logger.info("ADDBOOK SCENE: Step 3 started");
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Iltimos, to\'g\'ri formatda muallif ismini kiriting:');
      return;
    }
    
    ctx.wizard.state.author = ctx.message.text;
    await ctx.reply('Kitob nusxalari sonini kiriting (raqam):');
    return ctx.wizard.next();
  },
  
  // 4-qadam: Kitob rasmini so'rash
  async (ctx) => {
    logger.info("ADDBOOK SCENE: Step 4 started");
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Iltimos, to\'g\'ri formatda nusxalar sonini kiriting:');
      return;
    }
    
    const copies = parseInt(ctx.message.text);
    if (isNaN(copies) || copies <= 0) {
      await ctx.reply('Iltimos, to\'g\'ri raqam kiriting (1 dan katta):');
      return;
    }
    
    ctx.wizard.state.copies = copies;
    
    try {
      // Kitobga oid ma'lumotlarni log qilish
      logger.info(`ADDBOOK SCENE: Book info collected - Title: ${ctx.wizard.state.title}, Author: ${ctx.wizard.state.author}, Copies: ${copies}`);
      
      // Maksimal soddalashtirish uchun
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "O'tkazib yuborish", callback_data: "skip_image" }]
          ]
        }
      };
      
      logger.info("ADDBOOK SCENE: Sending image request with skip button");
      
      // To'g'ridan-to'g'ri Telegram API yordamida xabar yuborish
      await ctx.telegram.sendMessage(ctx.chat.id, 'Kitob rasmini yuborishingiz mumkin (ixtiyoriy). Agar rasm yubormoqchi bo\'lmasangiz, tugmani bosing:', keyboard);
      
      return ctx.wizard.next();
    } catch (error) {
      logger.error(`ADDBOOK SCENE: Error in step 4: ${error.message}`);
      await ctx.reply('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      return ctx.scene.leave();
    }
  },
  
  // 5-qadam: Kitobni saqlash
  async (ctx) => {
    logger.info("ADDBOOK SCENE: Step 5 started");
    logger.info(`ADDBOOK SCENE: Context type - update: ${ctx.updateType}, updateSubType: ${ctx.updateSubTypes ? ctx.updateSubTypes.join(', ') : 'none'}`);
    
    // CallbackQuery bo'lsa
    if (ctx.callbackQuery) {
      logger.info(`ADDBOOK SCENE: Callback query received: ${ctx.callbackQuery.data}`);
      
      if (ctx.callbackQuery.data === 'skip_image') {
        try {
          await ctx.answerCbQuery('Rasm o\'tkazib yuborildi');
          
          // Kitobni saqlash
          const newBook = await db.Book.create({
            title: ctx.wizard.state.title,
            author: ctx.wizard.state.author,
            copies: ctx.wizard.state.copies,
            availableCopies: ctx.wizard.state.copies,
            imageId: null,
            imageName: null
          });
          
          logger.info(`ADDBOOK SCENE: Book created without image, ID: ${newBook.id}`);
          
          // Muvaffaqiyat xabari
          await ctx.reply(`Kitob muvaffaqiyatli qo'shildi!\n\n`
            + `📖 Nomi: ${newBook.title}\n`
            + `👤 Muallif: ${newBook.author}\n`
            + `📚 Nusxalar soni: ${newBook.copies}`);
          
          // Bosh menyuga qaytish
          await ctx.reply('Admin menyu:', { reply_markup: adminMenuKeyboard });
          
          return ctx.scene.leave();
        } catch (error) {
          logger.error(`ADDBOOK SCENE: Error saving book without image: ${error.message}`);
          await ctx.reply('Kitobni saqlashda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
          return ctx.scene.leave();
        }
      }
    }
    // Agar rasm yuborilgan bo'lsa
    else if (ctx.message && ctx.message.photo) {
      try {
        const telegramFileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        logger.info(`ADDBOOK SCENE: Image received, Telegram ID: ${telegramFileId}`);
        
        // Rasmni yuklab olish va saqlash - bot obyektini uzatamiz
        const imageName = await downloadAndSaveTelegramImage(telegramFileId, ctx.telegram);
        logger.info(`ADDBOOK SCENE: Image saved with name: ${imageName}`);
        
        // Kitobni saqlash
        const newBook = await db.Book.create({
          title: ctx.wizard.state.title,
          author: ctx.wizard.state.author,
          copies: ctx.wizard.state.copies,
          availableCopies: ctx.wizard.state.copies,
          imageId: telegramFileId, // Compatibility uchun
          imageName: imageName     // Yangi field
        });
        
        logger.info(`ADDBOOK SCENE: Book created with image, ID: ${newBook.id}`);
        
        // Muvaffaqiyat xabari
        await ctx.reply(`Kitob muvaffaqiyatli qo'shildi!\n\n`
          + `📖 Nomi: ${newBook.title}\n`
          + `👤 Muallif: ${newBook.author}\n`
          + `📚 Nusxalar soni: ${newBook.copies}`);
        
        // Bosh menyuga qaytish
        await ctx.reply('Admin menyu:', { reply_markup: adminMenuKeyboard });
        
        return ctx.scene.leave();
      } catch (error) {
        logger.error(`ADDBOOK SCENE: Error saving book with image: ${error.message}`);
        await ctx.reply('Kitobni saqlashda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
        return ctx.scene.leave();
      }
    }
    // Agar boshqa format yuborilgan bo'lsa
    else if (ctx.message) {
      logger.warn(`ADDBOOK SCENE: Invalid format received: ${JSON.stringify(ctx.message)}`);
      
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "O'tkazib yuborish", callback_data: "skip_image" }]
          ]
        }
      };
      
      await ctx.reply('Iltimos, rasm yuboring yoki tugmani bosing:', keyboard);
      return;
    }
  }
);

// Skip image btn uchun mahsus handler
addBookScene.action('skip_image', async (ctx) => {
  logger.info("ADDBOOK SCENE: Skip image action handler triggered");
  try {
    // Xabarni tasdiqlash
    await ctx.answerCbQuery("Rasm o'tkazib yuborilmoqda...");
    
    // Kitobni saqlash
    const newBook = await db.Book.create({
      title: ctx.wizard.state.title,
      author: ctx.wizard.state.author,
      copies: ctx.wizard.state.copies,
      availableCopies: ctx.wizard.state.copies,
      imageId: null,
      imageName: null
    });
    
    logger.info(`ADDBOOK SCENE: Book created from action handler, ID: ${newBook.id}`);
    
    // Muvaffaqiyat xabari
    await ctx.reply(`Kitob muvaffaqiyatli qo'shildi!\n\n`
      + `📖 Nomi: ${newBook.title}\n`
      + `👤 Muallif: ${newBook.author}\n`
      + `📚 Nusxalar soni: ${newBook.copies}`);
    
    // Bosh menyuga qaytish
    await ctx.reply('Admin menyu:', { reply_markup: adminMenuKeyboard });
    
    return ctx.scene.leave();
  } catch (error) {
    logger.error(`ADDBOOK SCENE: Error in action handler: ${error.message}`);
    await ctx.reply('Kitobni saqlashda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
    return ctx.scene.leave();
  }
});

// Cancel komandasi
addBookScene.command('cancel', async (ctx) => {
  logger.info("ADDBOOK SCENE: Cancel command received");
  await ctx.reply('Kitob qo\'shish bekor qilindi.');
  await ctx.reply('Admin menyu:', { reply_markup: adminMenuKeyboard });
  return ctx.scene.leave();
});

module.exports = { addBookScene };