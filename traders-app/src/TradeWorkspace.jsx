import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Clock3, Layers3, Plus, X, Settings2 } from 'lucide-react';
import { getAvailableFunds } from './trade-engine';

const fmt=(n,c='INR')=>new Intl.NumberFormat('en-IN',{style:'currency',currency:c,maximumFractionDigits:2}).format(Number(n||0));
const dateFmt=v=>v?new Date(v).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
const defaultInstrument=(currency='INR')=>({id:'default-xauusd',Market:'FOREX',Symbol:'XAUUSD',Quantity:'0.10',ContractSize:'100',Currency:'USD',FxRateToBase:currency==='USD'?'1':''});
const instrumentKey=id=>'tc_traders_instruments_'+id;

export default function TradeWorkspace({account,trades,ledger,onSave,money=fmt,dateText=dateFmt,onError=()=>{}}){
 const [section,setSection]=useState('trade'),[direction,setDirection]=useState('LONG');
 const [instruments,setInstruments]=useState([]),[instrumentId,setInstrumentId]=useState('');
 const [price,setPrice]=useState(''),[margin,setMargin]=useState(''),[closePrices,setClosePrices]=useState({});
 const [showInstrumentForm,setShowInstrumentForm]=useState(false),[busy,setBusy]=useState(false);
 const [instrumentForm,setInstrumentForm]=useState({Market:'FOREX',Symbol:'',Quantity:'0.10',ContractSize:'100',Currency:'USD',FxRateToBase:''});
 const stats=useMemo(()=>getAvailableFunds(account,ledger,trades),[account,ledger,trades]);
 const positions=stats.book.openPositions,currency=account?.BaseCurrency||'INR';
 const selectedInstrument=instruments.find(x=>x.id===instrumentId)||instruments[0];

 useEffect(()=>{
  if(!account?.AccountID){setInstruments([]);setInstrumentId('');return}
  let saved=[];try{saved=JSON.parse(localStorage.getItem(instrumentKey(account.AccountID))||'[]')}catch{}
  if(!Array.isArray(saved))saved=[];
  if(!saved.length)saved=[defaultInstrument(account.BaseCurrency)];
  setInstruments(saved);setInstrumentId(saved[0]?.id||'');
 },[account?.AccountID]);

 const saveInstrument=e=>{
  e.preventDefault();
  const item={...instrumentForm,id:'ins-'+Date.now(),Symbol:instrumentForm.Symbol.trim().toUpperCase()};
  if(!item.Symbol||!(Number(item.Quantity)>0)||!(Number(item.ContractSize)>0)||!(Number(item.FxRateToBase)>0)){onError('Enter the instrument, lot quantity, contract multiplier and a valid FX conversion rate.');return}
  const next=[item,...instruments.filter(x=>x.Symbol!==item.Symbol||x.Market!==item.Market)];
  setInstruments(next);setInstrumentId(item.id);localStorage.setItem(instrumentKey(account.AccountID),JSON.stringify(next));
  setShowInstrumentForm(false);setInstrumentForm({Market:'FOREX',Symbol:'',Quantity:'0.10',ContractSize:'100',Currency:'USD',FxRateToBase:''});
 };
 const submit=e=>{
  e.preventDefault();
  if(!account){onError('Create or select a trading account first.');return}
  if(!selectedInstrument){onError('Add and select an instrument first.');return}
  const quantity=Number(selectedInstrument.Quantity),contract=Number(selectedInstrument.ContractSize),fx=Number(selectedInstrument.FxRateToBase),executionPrice=Number(price),manualMargin=Number(margin);
  if(!(quantity>0&&contract>0&&fx>0&&executionPrice>0&&manualMargin>0)){onError('Enter a valid execution price and manual margin. Check the selected instrument settings.');return}
  if(manualMargin>stats.available){onError('Insufficient available funds. Required margin: '+fmt(manualMargin,currency)+'. Available: '+fmt(stats.available,currency)+'.');return}
  setBusy(true);
  onSave({Market:selectedInstrument.Market,Segment:selectedInstrument.Market==='FOREX'?'FX':selectedInstrument.Market==='INDIAN_FNO'?'FNO':'CASH',Symbol:selectedInstrument.Symbol,Side:direction==='LONG'?'BUY':'SELL',PositionSide:direction,Action:'OPEN',Quantity,Price:executionPrice,ContractSize:contract,MarginAmount:manualMargin,Currency:selectedInstrument.Currency||currency,FxRateToBase:fx,Fees:0,Taxes:0,TradeDateTime:new Date().toISOString()});
  setBusy(false);setPrice('');setMargin('');
 };
 const close=p=>{
  const executionPrice=Number(closePrices[p.positionId]);
  if(!(executionPrice>0)){onError('Enter a valid closing price.');return}
  onSave({Market:p.trade.Market,Segment:p.trade.Segment,Symbol:p.trade.Symbol,Side:p.side==='LONG'?'SELL':'BUY',PositionSide:p.side,Action:'CLOSE',Quantity:p.quantity,Price:executionPrice,ContractSize:p.mult,MarginAmount:0,Currency:p.trade.Currency||currency,Fees:0,Taxes:0,TradeDateTime:new Date().toISOString(),FxRateToBase:Number(p.fx||1),RelatedTradeID:p.trade.TradeID});
  setClosePrices(v=>({...v,[p.positionId]:''}));
 };
 const tabs=[['trade','Trade',Plus],['positions','Open positions',Layers3],['history','History',Clock3]];
 return <section className="trade-workspace">
  <div className="trade-page-head">
   <div><span className="eyebrow">EXECUTION WORKSPACE</span><h2>Trade with control.</h2><p>Choose an instrument, enter your price and reserve your own margin.</p></div>
   <div className="trade-head-tools">
    <div className="instrument-picker"><span>INSTRUMENT</span><select aria-label="Select instrument" value={instrumentId} onChange={e=>setInstrumentId(e.target.value)}>{instruments.map(x=><option key={x.id} value={x.id}>{x.Symbol}</option>)}</select></div>
    <button className="add-instrument-button" onClick={()=>setShowInstrumentForm(true)}><Plus size={16}/> Add instrument</button>
    <div className="trade-funds"><small>AVAILABLE FUNDS</small><strong>{fmt(stats.available,currency)}</strong><span>Reserved margin {fmt(stats.reserved,currency)}</span></div>
   </div>
  </div>
  <div className="trade-subnav">{tabs.map(([id,label,Icon])=><button key={id} className={section===id?'active':''} onClick={()=>setSection(id)}><Icon size={16}/>{label}{id==='positions'&&<em>{positions.length}</em>}</button>)}</div>
  {section==='trade'&&<div className="trade-entry-layout">
   <form className="content-card trade-entry-card compact-trade-form" onSubmit={submit}>
    <div className="card-heading"><div><h3>New execution</h3><p>{selectedInstrument?selectedInstrument.Symbol+' · '+(selectedInstrument.Market==='FOREX'?'Forex / Metals':selectedInstrument.Market==='INDIAN_FNO'?'Indian F&O':'Indian equity'):'Add an instrument to begin'}</p></div></div>
    <div className="direction-switch"><button type="button" className={direction==='LONG'?'buy-selected':''} onClick={()=>setDirection('LONG')}><ArrowUpRight size={17}/> Buy / Long</button><button type="button" className={direction==='SHORT'?'sell-selected':''} onClick={()=>setDirection('SHORT')}><ArrowDownRight size={17}/> Sell / Short</button></div>
    <div className="execution-fields">
     <label>Execution price<input required type="number" min="0.00000001" step="any" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Enter execution price"/></label>
     <label>Manual margin required ({currency})<input required type="number" min="0.01" step="any" value={margin} onChange={e=>setMargin(e.target.value)} placeholder="Enter margin to reserve"/></label>
    </div>
    <div className="instrument-summary"><span>Trade size</span><b>{selectedInstrument?selectedInstrument.Quantity+' lots / units':'—'}</b><span>Contract multiplier</span><b>{selectedInstrument?.ContractSize||'—'}</b><span>FX conversion</span><b>{selectedInstrument?selectedInstrument.FxRateToBase+' '+currency:'—'}</b></div>
    <div className="trade-funds-check"><span>Available funds</span><strong>{fmt(stats.available,currency)}</strong><small>After opening this trade: {fmt(stats.available-Number(margin||0),currency)}</small></div>
    <button className="primary-submit" disabled={busy||!account||!selectedInstrument}><Plus size={16}/> {busy?'Recording…':direction==='LONG'?'Buy / Open long':'Sell / Open short'}</button>
   </form>
   <aside className="content-card trade-rules"><h3>Simple trade entry</h3><ul><li>Select your instrument from the top selector.</li><li>Enter only the execution price and manual margin.</li><li>Buy opens a long position; Sell opens a short position.</li><li>Lot size, contract multiplier and FX rate come from instrument settings.</li><li>Available funds are checked before the trade is recorded.</li></ul><button className="text-button instrument-settings-link" type="button" onClick={()=>setShowInstrumentForm(true)}><Settings2 size={14}/> Manage instruments</button></aside>
  </div>}
  {section==='positions'&&<div className="content-card"><div className="card-heading"><div><h3>Open positions</h3><p>{positions.length} active positions · FIFO lots</p></div></div>{!positions.length?<div className="empty-state">No open positions. Start by recording a Buy or Sell trade.</div>:<div className="position-list">{positions.map((p,i)=><article className="position-row" key={p.positionId+'-'+i}><div className="position-main"><span className={'position-badge '+(p.side==='LONG'?'long':'short')}>{p.side}</span><b>{p.trade.Symbol}</b><small>{p.trade.Market} · Open {dateFmt(p.trade.TradeDateTime)}</small></div><div><small>Open qty</small><b>{p.quantity}</b></div><div><small>Entry price</small><b>{p.entry}</b></div><div><small>Margin reserved</small><b>{fmt(p.marginReserved,currency)}</b></div><div className="position-close"><input aria-label="Closing price" type="number" min="0.00000001" step="any" placeholder="Closing price" value={closePrices[p.positionId]||''} onChange={e=>setClosePrices(v=>({...v,[p.positionId]:e.target.value}))}/><button onClick={()=>close(p)}>Close with {p.side==='LONG'?'Sell':'Buy'}</button></div></article>)}</div>}</div>}
  {section==='history'&&<div className="content-card"><div className="card-heading"><div><h3>Execution history</h3><p>Open and close executions with FIFO realised P&amp;L</p></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Instrument</th><th>Action</th><th>Position</th><th>Qty</th><th>Price</th><th>Realised P&amp;L</th></tr></thead><tbody>{stats.book.history.slice().reverse().map((t,i)=><tr key={t.TradeID||i}><td>{dateFmt(t.TradeDateTime)}</td><td><b>{t.Symbol}</b></td><td>{t.Action}</td><td>{t.PositionSide}</td><td>{Number(t.Quantity).toLocaleString('en-IN')}</td><td>{Number(t.Price).toLocaleString('en-IN')}</td><td className={Number(t.RealisedPnl)>0?'positive':Number(t.RealisedPnl)<0?'negative':''}>{t.Action==='CLOSE'?fmt(t.RealisedPnl,currency):'—'}</td></tr>)}</tbody></table>{!stats.book.history.length&&<div className="empty-state">No execution history recorded yet.</div>}</div></div>}
  {showInstrumentForm&&<div className="modal-backdrop instrument-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowInstrumentForm(false)}}><section className="modal-panel instrument-modal"><header><div><span className="auth-eyebrow">INSTRUMENT SETUP</span><h2>Add trading instrument</h2></div><button type="button" onClick={()=>setShowInstrumentForm(false)}><X/></button></header><form className="entry-form" onSubmit={saveInstrument}>
   <label>Market<select value={instrumentForm.Market} onChange={e=>setInstrumentForm(v=>({...v,Market:e.target.value,Currency:e.target.value==='FOREX'?'USD':'INR',Quantity:e.target.value==='FOREX'?'0.10':'1',ContractSize:e.target.value==='FOREX'?'100':'1',FxRateToBase:e.target.value==='FOREX'&&currency!=='USD'?'': '1'}))}><option value="FOREX">Forex / Metals</option><option value="INDIAN_EQUITY">Indian equity</option><option value="INDIAN_FNO">Indian F&amp;O</option></select></label>
   <label>Instrument symbol<input required value={instrumentForm.Symbol} onChange={e=>setInstrumentForm(v=>({...v,Symbol:e.target.value}))} placeholder="XAUUSD / EURUSD / RELIANCE"/></label>
   <div className="form-two"><label>Default quantity / lots<input required type="number" min="0.000001" step="any" value={instrumentForm.Quantity} onChange={e=>setInstrumentForm(v=>({...v,Quantity:e.target.value}))}/></label><label>Contract multiplier<input required type="number" min="0.000001" step="any" value={instrumentForm.ContractSize} onChange={e=>setInstrumentForm(v=>({...v,ContractSize:e.target.value}))}/></label></div>
   <div className="form-two"><label>Quote currency<select value={instrumentForm.Currency} onChange={e=>setInstrumentForm(v=>({...v,Currency:e.target.value,FxRateToBase:e.target.value===currency?'1':''}))}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label><label>FX rate to {currency}<input required type="number" min="0.00000001" step="any" value={instrumentForm.FxRateToBase} onChange={e=>setInstrumentForm(v=>({...v,FxRateToBase:e.target.value}))} placeholder="Enter conversion rate"/></label></div>
   <p className="report-note">These instrument settings are stored locally in this browser for the selected account. Quantity, contract size and FX rate are applied automatically to each new trade.</p>
   <button className="primary-submit" type="submit"><Plus size={16}/> Save instrument</button>
  </form></section></div>}
 </section>;
}
