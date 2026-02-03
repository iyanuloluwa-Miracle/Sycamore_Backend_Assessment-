'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Transaction Logs table
    await queryInterface.createTable('transaction_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      idempotency_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      from_wallet_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'wallets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      to_wallet_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'wallets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      amount: {
        type: Sequelize.DECIMAL(20, 4),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'NGN',
      },
      type: {
        type: Sequelize.ENUM('TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'INTEREST'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'COMPLETED', 'FAILED', 'REVERSED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create indexes for performance
    await queryInterface.addIndex('transaction_logs', ['idempotency_key']);
    await queryInterface.addIndex('transaction_logs', ['from_wallet_id']);
    await queryInterface.addIndex('transaction_logs', ['to_wallet_id']);
    await queryInterface.addIndex('transaction_logs', ['status']);
    await queryInterface.addIndex('transaction_logs', ['type']);
    await queryInterface.addIndex('transaction_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('transaction_logs');
  }
};
