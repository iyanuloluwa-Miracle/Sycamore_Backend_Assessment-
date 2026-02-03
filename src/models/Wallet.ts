import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

// Interface for Wallet attributes
export interface WalletAttributes {
  id: string;
  userId: string;
  balance: string; // Using string for DECIMAL precision
  currency: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for Wallet creation (id is optional as it's auto-generated)
export interface WalletCreationAttributes extends Optional<WalletAttributes, 'id' | 'balance' | 'currency' | 'isActive' | 'createdAt' | 'updatedAt'> {}

// Wallet Model
class Wallet extends Model<WalletAttributes, WalletCreationAttributes> implements WalletAttributes {
  public id!: string;
  public userId!: string;
  public balance!: string;
  public currency!: string;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Wallet.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'user_id',
    },
    balance: {
      type: DataTypes.DECIMAL(20, 4),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'NGN',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
  },
  {
    sequelize,
    tableName: 'wallets',
    timestamps: true,
    underscored: true,
  }
);

export default Wallet;
