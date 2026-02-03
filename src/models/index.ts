import Wallet from './Wallet';
import TransactionLog from './TransactionLog';
import LedgerEntry from './LedgerEntry';
import InterestAccrual from './InterestAccrual';

// Define associations
Wallet.hasMany(TransactionLog, {
  foreignKey: 'fromWalletId',
  as: 'outgoingTransactions',
});

Wallet.hasMany(TransactionLog, {
  foreignKey: 'toWalletId',
  as: 'incomingTransactions',
});

Wallet.hasMany(LedgerEntry, {
  foreignKey: 'walletId',
  as: 'ledgerEntries',
});

Wallet.hasMany(InterestAccrual, {
  foreignKey: 'walletId',
  as: 'interestAccruals',
});

TransactionLog.belongsTo(Wallet, {
  foreignKey: 'fromWalletId',
  as: 'fromWallet',
});

TransactionLog.belongsTo(Wallet, {
  foreignKey: 'toWalletId',
  as: 'toWallet',
});

TransactionLog.hasMany(LedgerEntry, {
  foreignKey: 'transactionLogId',
  as: 'ledgerEntries',
});

TransactionLog.hasOne(InterestAccrual, {
  foreignKey: 'transactionLogId',
  as: 'interestAccrual',
});

LedgerEntry.belongsTo(TransactionLog, {
  foreignKey: 'transactionLogId',
  as: 'transactionLog',
});

LedgerEntry.belongsTo(Wallet, {
  foreignKey: 'walletId',
  as: 'wallet',
});

InterestAccrual.belongsTo(Wallet, {
  foreignKey: 'walletId',
  as: 'wallet',
});

InterestAccrual.belongsTo(TransactionLog, {
  foreignKey: 'transactionLogId',
  as: 'transactionLog',
});

export {
  Wallet,
  TransactionLog,
  LedgerEntry,
  InterestAccrual,
};
