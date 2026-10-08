import {api} from './api'

/**
 * Integrated Wallet Services API.
 * Uses the SAME Shopping Apps Script, Shopping session and Shopping GSheet.
 * Cashback Wallet and Money Wallet are separate ledgers for the same user.
 */
export const walletApi={
  me:async token=>api.me(token),
  wallet:async token=>{
    const [money,cashback]=await Promise.all([
      api.moneyWallet(token),
      api.wallet(token)
    ])
    const moneyWallet=money?.wallet||{}
    const cashbackWallet=cashback?.wallet||{}
    const moneyTransactions=Array.isArray(money?.transactions)?money.transactions:[]
    const cashbackTransactions=Array.isArray(cashback?.transactions)?cashback.transactions:[]
    const transactions=[
      ...moneyTransactions,
      ...cashbackTransactions.map(t=>({
        transactionId:t.orderId||('CASHBACK-'+t.createdAt),
        type:'CASHBACK_EARNED',
        amount:Number(t.amount||0),
        status:String(t.status||''),
        balanceBefore:0,
        balanceAfter:Number(t.balanceAfter||0),
        reservedBalance:0,
        upiId:'',
        paymentLinkLabel:'',
        paymentLink:'',
        attempt:1,
        createdAt:t.createdAt,
        updatedAt:t.createdAt,
        completedAt:t.createdAt,
        notes:t.description||'',
        source:'CASHBACK'
      }))
    ].sort((a,b)=>new Date(b.createdAt||0).getTime()-new Date(a.createdAt||0).getTime())

    return {
      wallet:moneyWallet,
      balance:Number(moneyWallet.balance||0),
      availableBalance:Number(moneyWallet.availableBalance||0),
      reservedBalance:Number(moneyWallet.reservedBalance||0),
      transactions,
      moneyTransactions,
      cashbackWallet,
      cashbackTransactions
    }
  },
  orders:async token=>api.moneyWalletOrders(token),
  transactionStatus:async(token,transactionId)=>api.moneyWalletTransactionStatus(token,transactionId),
  walletGateway:async(token,amount)=>api.moneyAdd(token,amount),
  addMoney:async(token,amount)=>api.moneyAdd(token,amount),
  retryAddMoney:async(token,transactionId)=>api.moneyRetryAdd(token,transactionId),
  withdraw:async(token,amount,upiId)=>api.moneyWithdraw(token,amount,upiId),
  logout:async token=>api.logout(token),

  // Kept only for old Wallet Admin pages. New Shopping Admin Add Link should
  // use the Shopping API directly and the shared PaymentLinkStock sheet.
  adminAddPaymentLink:async(token,denomination,link,label='Pay securely')=>api.adminAddPaymentLinkStock(token,denomination,link,label),
  adminAddPaymentLinkBulk:async(token,denomination,links,label='Pay securely')=>api.adminAddPaymentLinkStockBulk(token,[...links.map(link=>({denomination,link,label}))]),
  adminPaymentStock:async token=>api.adminTable(token,'PaymentLinkStock'),
  adminRemovePaymentLink:async(token,paymentLinkStockId)=>api.adminUpdateRow(token,'PaymentLinkStock',paymentLinkStockId,{Status:'REMOVED'})
}
