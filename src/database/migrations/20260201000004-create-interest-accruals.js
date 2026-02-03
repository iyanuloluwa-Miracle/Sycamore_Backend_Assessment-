'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Interest Accruals table for tracking daily interest
    await queryInterface.createTable('interest_accruals', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
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
      principal_amount: {
        type: Sequelize.DECIMAL(20, 4),
        allowNull: false,
      },
      interest_amount: {
        type: Sequelize.DECIMAL(20, 4),
        allowNull: false,
      },
      annual_rate: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: false,
      },
      daily_rate: {
        type: Sequelize.DECIMAL(20, 10),
        allowNull: false,
      },
      accrual_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      days_in_year: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 365,
      },
      is_leap_year: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_applied: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      applied_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      transaction_log_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'transaction_logs',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    // Create unique constraint for wallet + date combination
    await queryInterface.addConstraint('interest_accruals', {
      fields: ['wallet_id', 'accrual_date'],
      type: 'unique',
      name: 'unique_wallet_accrual_date'
    });

    // Create indexes
    await queryInterface.addIndex('interest_accruals', ['wallet_id']);
    await queryInterface.addIndex('interest_accruals', ['accrual_date']);
    await queryInterface.addIndex('interest_accruals', ['is_applied']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('interest_accruals');
  }
};
