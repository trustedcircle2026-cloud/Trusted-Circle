import {api} from './api'

/**
 * Integrated Wallet Services API.
 * Uses the SAME Shopping Apps Script and Shopping GSheet. Wallet lookup uses the existing account email + User ID.
 * Cashback Wallet and Money Wallet are separate ledgers for the same user.
 */
export const walletApi={
  me:async token=>api.me(token),
  snapshot:async user=>{
    const d=await api.walletServices(user?.email,user?.userId);
    const moneyWallet=d?.moneyWallet||{};
    const cashbackWallet=d?.cashbackWallet||{};
    return {
      wallet:moneyWallet,
      balance:Number(moneyWallet.balance||0),
      availableBalance:Number(moneyWallet.availableBalance||0),
      cashbackBalance:Number(cashbackWallet.balance||0),
      totalBalance:Number(d?.breakdown?.combinedBalance??(Number(moneyWallet.balance||0)+Number(cashbackWallet.balance||0))),
      reservedBalance:Number(moneyWallet.reservedBalance||0),
      transactions:Array.isArray(d?.transactions)?d.transactions:[],
      moneyTransactions:Array.isArray(d?.moneyTransactions)?d.moneyTransactions:[],
      cashbackWallet,
      cashbackTransactions:Array.isArray(d?.cashbackTransactions)?d.cashbackTransactions:[],
      breakdown:d?.breakdown||{}
    }
  },
  wallet:async user=>walletApi.snapshot(user),
  orders:async user=>{const d=await walletApi.snapshot(user);return{transactions:d.transactions||[]}},
  transactionStatus:async(user,transactionId)=>api.moneyWalletTransactionStatus(user?.email,user?.userId,transactionId),
  walletGateway:async(user,amount)=>api.moneyAdd(user?.email,user?.userId,amount),
  addMoney:async(user,amount)=>api.moneyAdd(user?.email,user?.userId,amount),
  retryAddMoney:async(user,transactionId)=>api.moneyRetryAdd(user?.email,user?.userId,transactionId),
  withdraw:async(user,amount,upiId)=>api.moneyWithdraw(user?.email,user?.userId,amount,upiId),
  
  adminAddPaymentLink:async(token,denomination,link,label='Pay securely')=>api.adminAddPaymentLinkStock(token,denomination,link,label),
  adminAddPaymentLinkBulk:async(token,denomination,links,label='Pay securely')=>api.adminAddPaymentLinkStockBulk(token,[...links.map(link=>({denomination,link,label}))]),
  adminPaymentStock:async token=>api.adminTable(token,'PaymentLinkStock'),
  adminRemovePaymentLink:async(token,paymentLinkStockId)=>api.adminUpdateRow(token,'PaymentLinkStock',paymentLinkStockId,{Status:'REMOVED'})
}
