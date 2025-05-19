// database/migrations/20240520000000-add-reminder-sent-to-bookings.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Booking jadvaliga reminderSent ustunini qo'shish
    await queryInterface.addColumn('bookings', 'reminder_sent', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      after: 'duration_days'
    });
    
    // Agar book jadvalida reminder_sent ustuni bo'lsa, olib tashlash
    try {
      await queryInterface.removeColumn('books', 'reminder_sent');
    } catch (error) {
      // Agar ustun mavjud bo'lmasa, xatolikni e'tiborsiz qoldirish
      console.log('books jadvalida reminder_sent ustuni mavjud emas, davom ettirilmoqda...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('bookings', 'reminder_sent');
  }
};