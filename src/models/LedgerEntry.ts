import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

// Entry types for double-entry bookkeeping
export enum EntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

// Interface for LedgerEntry attributes
export interface LedgerEntryAttributes {
  id: string;
  transactionLogId: string;
  walletId: string;
  entryType: EntryType;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  description: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for LedgerEntry creation
export interface LedgerEntryCreationAttributes extends Optional<LedgerEntryAttributes, 
  'id' | 'description' | 'createdAt' | 'updatedAt'> {}

// LedgerEntry Model
class LedgerEntry extends Model<LedgerEntryAttributes, LedgerEntryCreationAttributes> implements LedgerEntryAttributes {
  public id!: string;
  public transactionLogId!: string;
  public walletId!: string;
  public entryType!: EntryType;
  public amount!: string;
  public balanceBefore!: string;
  public balanceAfter!: string;
  public description!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LedgerEntry.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    transactionLogId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'transaction_log_id',
    },
    walletId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'wallet_id',
    },
    entryType: {
      type: DataTypes.ENUM(...Object.values(EntryType)),
      allowNull: false,
      field: 'entry_type',
    },
    amount: {
      type: DataTypes.DECIMAL(20, 4),
      allowNull: false,
    },
    balanceBefore: {
      type: DataTypes.DECIMAL(20, 4),
      allowNull: false,
      field: 'balance_before',
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(20, 4),
      allowNull: false,
      field: 'balance_after',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'ledger_entries',
    timestamps: true,
    underscored: true,
  }
);

export default LedgerEntry;
