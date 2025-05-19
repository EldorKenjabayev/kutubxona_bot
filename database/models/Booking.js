// database/models/Booking.js - Tuzatilgan versiya
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Booking = sequelize.define('Booking', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    bookId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'books',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('booked', 'taken', 'returned', 'cancelled'),
      allowNull: false,
      defaultValue: 'booked'
    },
    bookedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When the booking expires if not picked up'
    },
    takenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the book was picked up'
    },
    returnDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the book should be returned'
    },
    returnedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the book was actually returned'
    },
    durationDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7,
      comment: 'Duration in days for which the book is booked'
    },
    reminderSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether a reminder has been sent for this booking'
    }
  }, {
    tableName: 'bookings',
    timestamps: true
  });

  Booking.associate = (models) => {
    Booking.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Booking.belongsTo(models.Book, {
      foreignKey: 'bookId',
      as: 'book'
    });
  };

  return Booking;
};