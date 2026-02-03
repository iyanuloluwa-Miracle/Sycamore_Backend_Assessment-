'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Ledger entries table for double-entry bookkeeping
    await queryInterface.createTable('ledger_entries', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      transaction_log_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'transaction_logs',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      wallet_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'wallets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      entry_type: {
        type: Sequelize.ENUM('DEBIT', 'CREDIT'),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(20, 4),
        allowNull: false,
      },
      balance_before: {
        type: Sequelize.DECIMAL(20, 4),
        allowNull: false,
      },
      balance_after: {
        type: Sequelize.DECIMAL(20, 4),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
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

    // Create indexes
    await queryInterface.addIndex('ledger_entries', ['transaction_log_id']);
    await queryInterface.addIndex('ledger_entries', ['wallet_id']);
    await queryInterface.addIndex('ledger_entries', ['entry_type']);
    await queryInterface.addIndex('ledger_entries', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ledger_entries');
  }
};
