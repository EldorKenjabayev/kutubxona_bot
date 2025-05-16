// database/models/Book.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Book = sequelize.define('Book', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    author: {
      type: DataTypes.STRING,
      allowNull: false
    },
    imageId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Telegram file ID for the book image'
    },
    copies: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Number of available copies'
    },
    // Check if this field exists, if not add it
    reminderSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Eslatma yuborilganmi'
    },
    availableCopies: {
      type: DataTypes.INTEGER,
      comment: 'Number of copies currently available'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'books',
    timestamps: true,
    hooks: {
      beforeCreate: (book) => {
        // Set available copies equal to total copies initially
        book.availableCopies = book.copies;
      }
    }
  });

  Book.associate = (models) => {
    Book.hasMany(models.Booking, {
      foreignKey: 'bookId',
      as: 'bookings'
    });
  };

  return Book;
};