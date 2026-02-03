import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';

// Interface for InterestAccrual attributes
export interface InterestAccrualAttributes {
  id: string;
  walletId: string;
  principalAmount: string;
  interestAmount: string;
  annualRate: string;
  dailyRate: string;
  accrualDate: string; // DATEONLY format
  daysInYear: number;
  isLeapYear: boolean;
  isApplied: boolean;
  appliedAt: Date | null;
  transactionLogId: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for InterestAccrual creation
export interface InterestAccrualCreationAttributes extends Optional<InterestAccrualAttributes, 
  'id' | 'daysInYear' | 'isLeapYear' | 'isApplied' | 'appliedAt' | 'transactionLogId' | 'createdAt' | 'updatedAt'> {}

// InterestAccrual Model
class InterestAccrual extends Model<InterestAccrualAttributes, InterestAccrualCreationAttributes> implements InterestAccrualAttributes {
  public id!: string;
  public walletId!: string;
  public principalAmount!: string;
  public interestAmount!: string;
  public annualRate!: string;
  public dailyRate!: string;
  public accrualDate!: string;
  public daysInYear!: number;
  public isLeapYear!: boolean;
  public isApplied!: boolean;
  public appliedAt!: Date | null;
  public transactionLogId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

InterestAccrual.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    walletId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'wallet_id',
    },
    principalAmount: {
      type: DataTypes.DECIMAL(20, 4),
      allowNull: false,
      field: 'principal_amount',
    },
    interestAmount: {
      type: DataTypes.DECIMAL(20, 4),
      allowNull: false,
      field: 'interest_amount',
    },
    annualRate: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
      field: 'annual_rate',
    },
    dailyRate: {
      type: DataTypes.DECIMAL(20, 10),
      allowNull: false,
      field: 'daily_rate',
    },
    accrualDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'accrual_date',
    },
    daysInYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 365,
      field: 'days_in_year',
    },
    isLeapYear: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_leap_year',
    },
    isApplied: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_applied',
    },
    appliedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'applied_at',
    },
    transactionLogId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'transaction_log_id',
    },
  },
  {
    sequelize,
    tableName: 'interest_accruals',
    timestamps: true,
    underscored: true,
  }
);

export default InterestAccrual;
