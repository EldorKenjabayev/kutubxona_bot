// database/migrations/20240518000000-add-image-name-column.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // imageName ustunini qo'shish
    await queryInterface.addColumn('books', 'image_name', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'image_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('books', 'image_name');
  }
};