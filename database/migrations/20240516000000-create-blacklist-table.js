// database/migrations/20240516000000-create-blacklist-table.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // BlackList jadvalini yaratish
    await queryInterface.createTable('blacklist', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: false
      },
      bannedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'banned_at'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'created_at'
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        field: 'updated_at'
      }
    });

    // Indeks yaratish
    await queryInterface.addIndex('blacklist', ['user_id', 'is_active']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('blacklist');
  }
};