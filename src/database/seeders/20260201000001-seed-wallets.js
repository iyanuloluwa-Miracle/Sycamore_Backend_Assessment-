'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Create Sycamore pool wallet (the main company wallet)
    const sycamorePoolId = '00000000-0000-0000-0000-000000000001';
    
    // Create test user wallets
    const wallets = [
      {
        id: sycamorePoolId,
        user_id: '00000000-0000-0000-0000-000000000001',
        balance: 10000000.0000, // 10 million starting balance for pool
        currency: 'NGN',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        balance: 50000.0000,
        currency: 'NGN',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        user_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        balance: 75000.0000,
        currency: 'NGN',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('wallets', wallets);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('wallets', null, {});
  }
};
