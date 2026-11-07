const EPS=1e-9;
const keyOf=t=>[t.AccountID,t.Market,t.Symbol,t.Currency||'INR',t.PositionSide||''].join('|');
export function buildTradeBook(rows=[]){
 const ordered=[...rows].filter(t=>t.Status!=='VOID').sort((a,b)=>new Date(a.TradeDateTime)-new Date(b.TradeDateTime)||String(a.TradeID).localeCompare(String(b.TradeID)));
 const lots=[],history=[];
 for(const t of ordered){
  const qty=Number(t.Quantity||0),price=Number(t.Price||0),mult=Number(t.ContractSize||1),fx=Number(t.FxRateToBase||1),fees=(Number(t.Fees||0)+Number(t.Taxes||0))*fx;
  if(!(qty>0&&price>0))continue;
  let action=t.Action,side=t.PositionSide;
  if(!action){const longKey=keyOf({...t,PositionSide:'LONG'}),shortKey=keyOf({...t,PositionSide:'SHORT'});const hasLong=lots.some(l=>l.key===longKey&&l.remaining>EPS),hasShort=lots.some(l=>l.key===shortKey&&l.remaining>EPS);if(t.Side==='SELL'&&hasLong){action='CLOSE';side='LONG'}else if(t.Side==='BUY'&&hasShort){action='CLOSE';side='SHORT'}else{action='OPEN';side=t.Side==='BUY'?'LONG':'SHORT'}}
  if(action==='OPEN'){
   lots.push({key:keyOf({...t,PositionSide:side}),trade:t,side,remaining:qty,entry:price,mult,fx,margin:Number(t.MarginAmount||0),feesRemaining:fees});
   history.push({...t,Action:'OPEN',PositionSide:side,RealisedPnl:0});
   continue;
  }
  const key=keyOf({...t,PositionSide:side});
  let remaining=qty,matched=0,pnl=0,marginReleased=0;
  const matches=[];
  for(let i=0;i<lots.length&&remaining>EPS;i++){
   const lot=lots[i];if(lot.key!==key||lot.remaining<=EPS)continue;
   const take=Math.min(remaining,lot.remaining),ratio=take/lot.remaining;
   const allocatedEntryFees=lot.feesRemaining*ratio,allocatedMargin=lot.margin*ratio;
   const gross=(side==='LONG'?(price-lot.entry):(lot.entry-price))*take*lot.mult*Number(t.FxRateToBase||1);
   const exitFees=(Number(t.Fees||0)+Number(t.Taxes||0))*(take/qty)*Number(t.FxRateToBase||1);
   const net=gross-allocatedEntryFees-exitFees;
   pnl+=net;matched+=take;marginReleased+=allocatedMargin;
   matches.push({openTradeId:lot.trade.TradeID,quantity:take,entryPrice:lot.entry,exitPrice:price,mult:lot.mult,entryFx:lot.fx,exitFx:Number(t.FxRateToBase||1),pnl:net});
   lot.remaining-=take;lot.margin-=allocatedMargin;lot.feesRemaining-=allocatedEntryFees;remaining-=take;
  }
  history.push({...t,Action:'CLOSE',PositionSide:side,MatchedQuantity:matched,UnmatchedQuantity:remaining,RealisedPnl:pnl,Matches:matches,MarginReleased:marginReleased});
 }
 const openPositions=lots.filter(l=>l.remaining>EPS).map(l=>({...l,positionId:l.trade.TradeID,quantity:l.remaining,marginReserved:l.margin}));
 const realised=history.filter(h=>h.Action==='CLOSE').reduce((s,h)=>s+Number(h.RealisedPnl||0),0);
 const reserved=openPositions.reduce((s,p)=>s+p.marginReserved,0);
 const openFees=openPositions.reduce((s,p)=>s+Number(p.feesRemaining||0),0);
 return {openPositions,history,realised,reserved,openFees};
}
export function getAvailableFunds(account,ledger,rows){
 const capital=Number(account?.InitialCapital||0);
 const cash=(ledger||[]).filter(x=>x.Status!=='VOID').reduce((s,x)=>s+Number(x.AmountBase??x.Amount??0),capital);
 const book=buildTradeBook(rows);
 return {cash,realised:book.realised,reserved:book.reserved,available:cash+book.realised-book.reserved-book.openFees,book};
}
export function positionPnl(position,markPrice){
 const diff=position.side==='LONG'?Number(markPrice)-position.entry:Number(position.entry)-Number(markPrice);
 return diff*Number(position.quantity)*Number(position.mult||1);
}
