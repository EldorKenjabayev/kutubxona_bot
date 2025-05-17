// bots/admin-bot/scenes/editBook.js (xato tuzatilgan)
const { Scenes } = require('telegraf');
const db = require('../../../database/models');
const { adminMenuKeyboard } = require('../keyboards/mainMenu');
const logger = require('../../../utils/logger');
const { downloadAndSaveTelegramImage, deleteImage } = require('../../../utils/fileStorage');

// Kitob tahrirlash scenesi
const editBookScene = new Scenes.WizardScene(
  'editBook',
  // 1-qadam: Kitobni bazadan olish va tahrirlash menyusini ko'rsatish
  async (ctx) => {
    logger.info('EDITBOOK: Scene started');
    
    // Kitob ID sini olish
    const bookId = ctx.scene.state.bookId || (ctx.match && ctx.match[1]);
    logger.info(`EDITBOOK: Book ID to edit: ${bookId}`);
    
    if (!bookId) {
      await ctx.reply('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      return ctx.scene.leave();
    }
    
    // Kitobni bazadan olish
    const book = await db.Book.findByPk(bookId);
    if (!book) {
      await ctx.reply('Kitob topilmadi. Iltimos qaytadan urinib ko\'ring.');
      return ctx.scene.leave();
    }
    
    // Kitob ma'lumotlarini saqlash
    ctx.scene.state.book = book;
    
    // Tahrirlash menyusini ko'rsatish
    const editKeyboard = {
      inline_keyboard: [
        [{ text: '📖 Kitob nomi', callback_data: 'edit_title' }],
        [{ text: '👤 Muallif', callback_data: 'edit_author' }],
        [{ text: '📚 Nusxalar soni', callback_data: 'edit_copies' }],
        [{ text: '🖼️ Rasm', callback_data: 'edit_image' }],
        [{ text: '🔙 Bekor qilish', callback_data: 'cancel_edit' }]
      ]
    };
    
    logger.info(`EDITBOOK: Showing edit menu for book "${book.title}"`);
    
    await ctx.reply(`"${book.title}" kitobini tahrirlash. Nimani tahrirlashni istaysiz?`, {
      reply_markup: editKeyboard
    });
    
    return ctx.wizard.next();
  },
  
  // 2-qadam: Tahrirlash turini aniqlash va yangi qiymatni so'rash
  async (ctx) => {
    logger.info('EDITBOOK: Step 2 - selecting what to edit');
    
    if (!ctx.callbackQuery) {
      await ctx.reply('Iltimos, menyudan birini tanlang:');
      return;
    }
    
    const action = ctx.callbackQuery.data;
    logger.info(`EDITBOOK: Selected action: ${action}`);
    
    if (action === 'cancel_edit') {
      await ctx.answerCbQuery('Tahrirlash bekor qilindi');
      await ctx.reply('Tahrirlash bekor qilindi.');
      return ctx.scene.leave();
    }
    
    await ctx.answerCbQuery();
    
    // Tahrirlash turini saqlash
    ctx.scene.state.editType = action;
    
    switch (action) {
      case 'edit_title':
        await ctx.reply(`Joriy nom: ${ctx.scene.state.book.title}\n\nYangi kitob nomini kiriting:`);
        break;
      case 'edit_author':
        await ctx.reply(`Joriy muallif: ${ctx.scene.state.book.author}\n\nYangi muallif ismini kiriting:`);
        break;
      case 'edit_copies':
        await ctx.reply(`Joriy nusxalar soni: ${ctx.scene.state.book.copies}\n\nYangi nusxalar sonini kiriting (raqam):`);
        break;
      case 'edit_image':
        const imageKeyboard = {
          inline_keyboard: [
            [{ text: 'Rasmni o\'chirish', callback_data: 'remove_image' }],
            [{ text: 'Bekor qilish', callback_data: 'cancel_image_edit' }]
          ]
        };
        
        await ctx.reply('Yangi kitob rasmini yuboring. Agar rasmni olib tashlamoqchi bo\'lsangiz, tugmani bosing:', {
          reply_markup: imageKeyboard
        });
        break;
      default:
        await ctx.reply('Noma\'lum amal. Iltimos qaytadan urinib ko\'ring.');
        return ctx.scene.reenter();
    }
    
    return ctx.wizard.next();
  },
  
  // 3-qadam: Yangi qiymatni olish va kitobni yangilash
  async (ctx) => {
    logger.info('EDITBOOK: Step 3 - handling input');
    
    const editType = ctx.scene.state.editType;
    const book = ctx.scene.state.book;
    
    // Agar rasm tahrirlash bo'lsa va callback query bo'lsa
    if (editType === 'edit_image' && ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;
      logger.info(`EDITBOOK: Image edit action: ${action}`);
      
      if (action === 'cancel_image_edit') {
        await ctx.answerCbQuery('Rasm tahrirlash bekor qilindi');
        return ctx.scene.reenter();
      }
      
      if (action === 'remove_image') {
        try {
          await ctx.answerCbQuery('Rasm o\'chirildi');
          logger.info(`EDITBOOK: Removing image for book "${book.title}"`);
          
          // Eski rasmni o'chirish
          if (book.imageName) {
            await deleteImage(book.imageName);
          }
          
          // Kitob rasmini yangilash
          await book.update({ 
            imageId: null,
            imageName: null
          });
          
          await ctx.reply('Kitob rasmi muvaffaqiyatli o\'chirildi!');
          await ctx.reply('Admin menyu:', { reply_markup: adminMenuKeyboard });
          
          return ctx.scene.leave();
        } catch (error) {
          logger.error(`EDITBOOK: Error removing image: ${error.message}`);
          await ctx.reply('Kitob rasmini o\'chirishda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
          return ctx.scene.leave();
        }
      }
    }
    
    // Agar rasm tahrirlash bo'lsa va yangi rasm yuborilgan bo'lsa
    if (editType === 'edit_image' && ctx.message && ctx.message.photo) {
      try {
        const telegramFileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        logger.info(`EDITBOOK: New image received, ID: ${telegramFileId}`);
        
        // Eski rasmni o'chirish
        if (book.imageName) {
          await deleteImage(book.imageName);
        }
        
        // Yangi rasmni saqlash - bot obyektini uzatamiz
        const imageName = await downloadAndSaveTelegramImage(telegramFileId, ctx.telegram);
        logger.info(`EDITBOOK: Image saved with name: ${imageName}`);
        
        // Kitob rasmi ma'lumotlarini yangilash
        await book.update({ 
          imageId: telegramFileId,  // Compatibility uchun
          imageName: imageName      // Yangi field
        });
        
        await ctx.reply('Kitob rasmi muvaffaqiyatli yangilandi!');
        await ctx.reply('Admin menyu:', { reply_markup: adminMenuKeyboard });
        
        return ctx.scene.leave();
      } catch (error) {
        logger.error(`EDITBOOK: Error updating image: ${error.message}`);
        await ctx.reply('Kitob rasmini yangilashda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
        return ctx.scene.leave();
      }
    }
    
    // Agar rasm tahrirlashdan tashqari bo'lsa
    if (editType !== 'edit_image') {
      if (!ctx.message || !ctx.message.text) {
        await ctx.reply('Iltimos, to\'g\'ri formatda ma\'lumot kiriting:');
        return;
      }
      
      const newValue = ctx.message.text;
      logger.info(`EDITBOOK: New value for ${editType}: ${newValue}`);
      
      try {
        const updateData = {};
        
        switch (editType) {
          case 'edit_title':
            updateData.title = newValue;
            break;
          case 'edit_author':
            updateData.author = newValue;
            break;
          case 'edit_copies':
            const copies = parseInt(newValue);
            if (isNaN(copies) || copies < 0) {
              await ctx.reply('Iltimos, to\'g\'ri raqam kiriting:');
              return;
            }
            
            // Nusxalar soni o'zgarishi bilan mavjud nusxalar sonini ham o'zgartirish
            const currentlyBooked = book.copies - book.availableCopies;
            const newAvailable = Math.max(0, copies - currentlyBooked);
            
            updateData.copies = copies;
            updateData.availableCopies = newAvailable;
            break;
        }
        
        // Kitobni yangilash
        await book.update(updateData);
        logger.info(`EDITBOOK: Book "${book.title}" updated successfully`);
        
        await ctx.reply(`Kitob muvaffaqiyatli yangilandi!\n\n`
          + `📖 Nomi: ${book.title}\n`
          + `👤 Muallif: ${book.author}\n`
          + `📚 Nusxalar soni: ${book.copies}`);
        
        await ctx.reply('Admin menyu:', { reply_markup: adminMenuKeyboard });
        
        return ctx.scene.leave();
      } catch (error) {
        logger.error(`EDITBOOK: Error updating book: ${error.message}`);
        await ctx.reply('Kitobni yangilashda xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
        return ctx.scene.leave();
      }
    }
    
    // Agar rasm tahrirlash bo'lsa va rasm yuborilmagan bo'lsa
    if (editType === 'edit_image' && (!ctx.message || !ctx.message.photo)) {
      await ctx.reply('Iltimos, rasm yuboring yoki tugmalardan birini tanlang.');
      return;
    }
  }
);

// Rasm tahrirlash callback uchun handler
editBookScene.action(['remove_image', 'cancel_image_edit'], (ctx) => {
  logger.info(`EDITBOOK: Action handler triggered: ${ctx.callbackQuery.data}`);
  return ctx.answerCbQuery();
});

// Scenedan chiqish handeri
editBookScene.command('cancel', async (ctx) => {
  logger.info('EDITBOOK: Cancel command received');
  await ctx.reply('Kitobni tahrirlash bekor qilindi.');
  await ctx.reply('Admin menyu:', { reply_markup: adminMenuKeyboard });
  return ctx.scene.leave();
});

module.exports = { editBookScene };