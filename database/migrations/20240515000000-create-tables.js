// database/migrations/20240515000000-create-tables.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Users jadvalini yaratish
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      telegramId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        field: 'telegram_id'
      },
      firstName: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'first_name'
      },
      lastName: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'last_name'
      },
      phoneNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'phone_number'
      },
      passportNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        field: 'passport_number'
      },
      isAdmin: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_admin'
      },
      registeredAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        field: 'registered_at'
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

    // Books jadvalini yaratish
    await queryInterface.createTable('books', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      author: {
        type: Sequelize.STRING,
        allowNull: false
      },
      imageId: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'image_id'
      },
      copies: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      availableCopies: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'available_copies'
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

    // Bookings jadvalini yaratish
    await queryInterface.createTable('bookings', {
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
      bookId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'book_id',
        references: {
          model: 'books',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('booked', 'taken', 'returned', 'cancelled'),
        allowNull: false,
        defaultValue: 'booked'
      },
      bookedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        field: 'booked_at'
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'expires_at'
      },
      takenAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'taken_at'
      },
      returnDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'return_date'
      },
      returnedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'returned_at'
      },
      durationDays: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 7,
        field: 'duration_days'
      },
      reminderSent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'reminder_sent'
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('bookings');
    await queryInterface.dropTable('books');
    await queryInterface.dropTable('users');
  }
};