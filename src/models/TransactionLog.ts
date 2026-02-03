import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

// Transaction types
export enum TransactionType {
  TRANSFER = 'TRANSFER',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  INTEREST = 'INTEREST',
}

// Transaction status
export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

// Interface for TransactionLog attributes
export interface TransactionLogAttributes {
  id: string;
  idempotencyKey: string;
  fromWalletId: string | null;
  toWalletId: string | null;
  amount: string;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string | null;
  metadata: Record<string, unknown> | null;
  errorMessage: string | null;
  completedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for TransactionLog creation
export interface TransactionLogCreationAttributes extends Optional<TransactionLogAttributes, 
  'id' | 'currency' | 'status' | 'description' | 'metadata' | 'errorMessage' | 'completedAt' | 'createdAt' | 'updatedAt'> {}

// TransactionLog Model
class TransactionLog extends Model<TransactionLogAttributes, TransactionLogCreationAttributes> implements TransactionLogAttributes {
  public id!: string;
  public idempotencyKey!: string;
  public fromWalletId!: string | null;
  public toWalletId!: string | null;
  public amount!: string;
  public currency!: string;
  public type!: TransactionType;
  public status!: TransactionStatus;
  public description!: string | null;
  public metadata!: Record<string, unknown> | null;
  public errorMessage!: string | null;
  public completedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TransactionLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'idempotency_key',
    },
    fromWalletId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'from_wallet_id',
    },
    toWalletId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'to_wallet_id',
    },
    amount: {
      type: DataTypes.DECIMAL(20, 4),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'NGN',
    },
    type: {
      type: DataTypes.ENUM(...Object.values(TransactionType)),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TransactionStatus)),
      allowNull: false,
      defaultValue: TransactionStatus.PENDING,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
  },
  {
    sequelize,
    tableName: 'transaction_logs',
    timestamps: true,
    underscored: true,
  }
);

export default TransactionLog;
