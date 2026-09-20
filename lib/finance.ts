export type Currency = 'BRL' | 'USD' | 'EUR' | 'GBP';
export type Transaction = {id:string; description:string; amount:number; date:string; type:'income'|'expense'|'transfer'; account:string; destination?:string; category:string; subcategory?:string; tags?:string[]; notes?:string; recurrence?:'weekly'|'monthly'|'yearly'; seriesId?:string; status:'paid'|'pending'};
export type Account = {id:string; name:string; opening:number; currency:Currency; color:string; type?:'checking'|'savings'|'cash'|'investment'; institution?:string};
export function balance(account:Account, transactions:Transaction[]) {
 return transactions.filter(t=>t.status==='paid').reduce((sum,t)=>sum+(t.account===account.id?(t.type==='income'?t.amount:-t.amount):0)+(t.type==='transfer'&&t.destination===account.id?t.amount:0),account.opening);
}
export function totals(transactions:Transaction[]) {
 const income=transactions.filter(t=>t.type==='income'&&t.status==='paid').reduce((s,t)=>s+t.amount,0);
 const expenses=transactions.filter(t=>t.type==='expense'&&t.status==='paid').reduce((s,t)=>s+t.amount,0);
 return {income,expenses,savings:income-expenses,rate:income>0?(income-expenses)/income:0};
}
export function parseAmount(value:string):number {
 if(!/^\d{1,10}([.,]\d{1,2})?$/.test(value.trim())) throw new Error('invalidAmount');
 const [whole,fraction='']=value.trim().replace(',','.').split('.');
 const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(cents)||cents<=0) throw new Error('invalidAmount');
 return cents;
}
export function formatCurrency(cents:number,locale:string,currency:Currency,hidden=false){return hidden?'••••••':new Intl.NumberFormat(locale,{style:'currency',currency}).format(cents/100);}
export function formatDate(date:string,locale:string){return new Intl.DateTimeFormat(locale,{day:'2-digit',month:'short',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));}
export function formatPercentage(value:number,locale:string){return new Intl.NumberFormat(locale,{style:'percent',maximumFractionDigits:1}).format(value);}
export function splitInstallments(cents:number,count:number){if(!Number.isSafeInteger(cents)||cents<=0||!Number.isInteger(count)||count<1||count>360)throw new Error('invalid');const base=Math.floor(cents/count);return Array.from({length:count},(_,i)=>base+(i<cents%count?1:0));}
export function shiftDate(date:string,frequency:'weekly'|'monthly'|'yearly',offset:number){
 const [year,month,day]=date.split('-').map(Number);
 if(frequency==='weekly')return new Date(Date.UTC(year,month-1,day+offset*7)).toISOString().slice(0,10);
 const targetMonth=frequency==='monthly'?month-1+offset:month-1;
 const targetYear=frequency==='yearly'?year+offset:year;
 const lastDay=new Date(Date.UTC(targetYear,targetMonth+1,0)).getUTCDate();
 return new Date(Date.UTC(targetYear,targetMonth,Math.min(day,lastDay))).toISOString().slice(0,10);
}

