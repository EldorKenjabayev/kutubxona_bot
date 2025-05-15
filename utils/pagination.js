// utils/pagination.js

/**
 * Paginatsiya uchun offset va limit hisoblash
 * @param {Number} page - Joriy sahifa
 * @param {Number} perPage - Sahifadagi elementlar soni
 * @returns {Object} offset va limit
 */
const getPagination = (page, perPage) => {
    const limit = perPage;
    const offset = (page - 1) * perPage;
    
    return { limit, offset };
  };
  
  /**
   * Paginatsiya uchun sahifalar sonini hisoblash
   * @param {Number} count - Jami elementlar soni
   * @param {Number} perPage - Sahifadagi elementlar soni
   * @returns {Number} Sahifalar soni
   */
  const getTotalPages = (count, perPage) => {
    return Math.ceil(count / perPage);
  };
  
  /**
   * Paginatsiya uchun meta ma'lumotlarni olish
   * @param {Number} page - Joriy sahifa
   * @param {Number} count - Jami elementlar soni
   * @param {Number} perPage - Sahifadagi elementlar soni
   * @returns {Object} Meta ma'lumotlar
   */
  const getPaginationInfo = (page, count, perPage) => {
    const totalPages = getTotalPages(count, perPage);
    const currentPage = page;
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;
    
    return {
      totalPages,
      currentPage,
      hasNextPage,
      hasPrevPage,
      perPage,
      totalItems: count
    };
  };
  
  module.exports = {
    getPagination,
    getTotalPages,
    getPaginationInfo
  };