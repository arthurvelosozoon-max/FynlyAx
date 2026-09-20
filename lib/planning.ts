import {balance,splitInstallments,type Transaction} from './finance.ts';
import type {FinancialState} from './sync/schema.ts';

export const builtinCategories=['home','food','transport','health','leisure','salary','freelance','other'];
export type Card={id:string;name:string;limit:number;closingDay:number;dueDay:number;color?:string};
export type Charge={id:string;cardId:string;description:string;amount:number;date:string;category:string;notes?:string;seriesId?:string};
export function shiftMonth(month:string,offset:number){const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m-1+offset,1)).toISOString().slice(0,7);}
export function monthDate(month:string,day:number){const [y,m]=month.split('-').map(Number);return `${month}-${String(Math.min(day,new Date(Date.UTC(y,m,0)).getUTCDate())).padStart(2,'0')}`;}
/** Purchases on closing day enter the following cycle. Due day <= closing day means next month. */
export function purchaseSchedule(card:Card,date:string,amount:number,count:number,category:string,description:string,id:string):Charge[]{
 const closing=monthDate(date.slice(0,7),card.closingDay);
 const cycle=shiftMonth(date.slice(0,7),date>=closing?1:0);
 const dueMonth=shiftMonth(cycle,card.dueDay<=card.closingDay?1:0);
 return splitInstallments(amount,count).map((value,i)=>({id:`${id}:${i+1}`,seriesId:id,cardId:card.id,description:count>1?`${description.slice(0,105)} (${i+1}/${count})`:description,amount:value,date:monthDate(shiftMonth(dueMonth,i),card.dueDay),category}));
}
export function unpaidCharges(state:FinancialState){const paid=new Set(state.transactions.filter(t=>t.status==='paid').map(t=>t.id));return state.cardCharges.filter(c=>!paid.has(`invoice:${c.id}`));}
export function payInvoice(state:FinancialState,cardId:string,month:string,account:string,date:string):FinancialState{
 if(!state.accounts.some(a=>a.id===account))throw new Error('accountFirst');
 const charges=unpaidCharges(state).filter(c=>c.cardId===cardId&&c.date.startsWith(month));
 if(!charges.length)return state;
 const transactions:Transaction[]=charges.map(c=>({id:`invoice:${c.id}`,description:c.description,amount:c.amount,date,type:'expense',account,category:c.category,status:'paid'}));
 return {...state,transactions:[...state.transactions,...transactions]};
}
export function cashEvents(state:FinancialState){return [...state.transactions.filter(t=>t.type!=='transfer').map(t=>({id:t.id,date:t.date,title:t.description,amount:t.type==='income'?t.amount:-t.amount,kind:t.id.startsWith('invoice:')?'card':t.type,status:t.status})),...unpaidCharges(state).map(c=>({id:c.id,date:c.date,title:c.description,amount:-c.amount,kind:'card',status:'pending'}))].sort((a,b)=>a.date.localeCompare(b.date));}
export function projectedBalance(state:FinancialState,date:string){
 const realized=state.accounts.reduce((sum,a)=>sum+balance(a,state.transactions.filter(t=>t.date<=date)),0);
 return realized+cashEvents({...state,transactions:state.transactions.filter(t=>t.status!=='paid'||t.date<=date)}).filter(e=>e.status==='pending'&&e.date<=date).reduce((sum,e)=>sum+e.amount,0);
}
export function categoryExpenses(state:FinancialState,month:string){const result:Record<string,number>={};for(const t of state.transactions)if(t.date.startsWith(month)&&t.type==='expense'&&t.status==='paid')result[t.category]=(result[t.category]||0)+t.amount;return Object.entries(result).sort((a,b)=>b[1]-a[1]);}

