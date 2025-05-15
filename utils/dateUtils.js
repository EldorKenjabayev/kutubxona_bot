// utils/dateUtils.js

/**
 * Berilgan sanaga kun qo'shish
 * @param {Date} date - Asos sana
 * @param {Number} days - Qo'shiladigan kun soni
 * @returns {Date} Yangi sana
 */
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };
  
  /**
   * Ikki sana orasidagi kunlar sonini hisoblash
   * @param {Date} startDate - Boshlang'ich sana
   * @param {Date} endDate - Oxirgi sana
   * @returns {Number} Kunlar soni
   */
  const daysBetween = (startDate, endDate) => {
    const oneDay = 24 * 60 * 60 * 1000; // millisekundlar
    return Math.round(Math.abs((startDate - endDate) / oneDay));
  };
  
  /**
   * Sana haqiqatdan ham o'tganligini tekshirish
   * @param {Date} date - Tekshiriladigan sana
   * @returns {Boolean} Sana o'tganmi
   */
  const isPast = (date) => {
    return new Date() > date;
  };
  
  /**
   * Sanani formatlash
   * @param {Date} date - Formatlanadigan sana
   * @returns {String} Formatlangan sana
   */
  const formatDate = (date) => {
    return date.toLocaleDateString('uz-UZ');
  };
  
  /**
   * Vaqtni formatlash
   * @param {Date} date - Formatlanadigan sana va vaqt
   * @returns {String} Formatlangan vaqt
   */
  const formatTime = (date) => {
    return date.toLocaleTimeString('uz-UZ');
  };
  
  /**
   * Sana va vaqtni formatlash
   * @param {Date} date - Formatlanadigan sana va vaqt
   * @returns {String} Formatlangan sana va vaqt
   */
  const formatDateTime = (date) => {
    return `${formatDate(date)} ${formatTime(date)}`;
  };
  
  module.exports = {
    addDays,
    daysBetween,
    isPast,
    formatDate,
    formatTime,
    formatDateTime
  };