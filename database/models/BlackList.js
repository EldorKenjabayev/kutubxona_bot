// database/models/BlackList.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BlackList = sequelize.define('BlackList', {
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
    reason: {
      type: DataTypes.STRING,
      allowNull: false
    },
    bannedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'blacklist',
    timestamps: true
  });

  BlackList.associate = (models) => {
    BlackList.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return BlackList;
};