import type {SheetData} from 'write-excel-file/browser';
import type {FinancialState} from './sync/schema';
import {balance,totals} from './finance';
import {cashEvents,categoryExpenses,projectedBalance,monthDate,unpaidCharges} from './planning';

const money=(value:number)=>({value,format:'R$ #,##0.00;[Red]-R$ #,##0.00'});
const header=(labels:string[])=>labels.map(value=>({value,fontWeight:'bold' as const,textColor:'#FFFFFF',backgroundColor:'#6D28D9'}));
const sheet=(name:string,data:SheetData,widths:number[])=>({sheet:name,data,columns:widths.map(width=>({width})),stickyRowsCount:1});

export async function exportFinancialWorkbook(state:FinancialState,month:string,categoryName:(id:string)=>string){
 const writeExcelFile=(await import('write-excel-file/browser')).default;
 const period=state.transactions.filter(row=>row.date.startsWith(month));const summary=totals(period);const openInvoices=unpaidCharges(state).reduce((sum,row)=>sum+row.amount,0);
 const overview:SheetData=[header(['Indicador','Valor']),...[
  ['Saldo das contas',state.accounts.reduce((sum,account)=>sum+balance(account,state.transactions),0)],['Receitas do mês',summary.income],['Despesas do mês',summary.expenses],['Economia do mês',summary.savings],['Faturas em aberto',openInvoices],['Saldo projetado',projectedBalance(state,monthDate(month,31))]
 ].map(([label,value])=>[String(label),money(Number(value)/100)])];
 const transactions:SheetData=[header(['Data','Descrição','Tipo','Conta','Destino','Categoria','Subcategoria','Tags','Status','Valor','Observações']),...period.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(row=>[row.date,row.description,row.type,state.accounts.find(a=>a.id===row.account)?.name||'',state.accounts.find(a=>a.id===row.destination)?.name||'',categoryName(row.category),row.subcategory||'',row.tags?.join(', ')||'',row.status,money((row.type==='expense'?-row.amount:row.amount)/100),row.notes||''])];
 const accounts:SheetData=[header(['Conta','Instituição','Tipo','Saldo inicial','Saldo atual']),...state.accounts.map(row=>[row.name,row.institution||'',row.type||'checking',money(row.opening/100),money(balance(row,state.transactions)/100)])];
 const cards:SheetData=[header(['Cartão','Limite','Fechamento','Vencimento','Compra','Data da fatura','Categoria','Valor'])];state.cards.forEach(card=>{const charges=state.cardCharges.filter(row=>row.cardId===card.id);if(!charges.length)cards.push([card.name,money(card.limit/100),card.closingDay,card.dueDay]);else charges.forEach(row=>cards.push([card.name,money(card.limit/100),card.closingDay,card.dueDay,row.description,row.date,categoryName(row.category),money(row.amount/100)]));});
 const calendar:SheetData=[header(['Data','Evento','Tipo','Status','Valor']),...cashEvents(state).filter(row=>row.date.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date)).map(row=>[row.date,row.title,row.kind,row.status,money(row.amount/100)])];
 const categories:SheetData=[header(['Categoria','Despesas no mês']),...categoryExpenses(state,month).map(([id,value])=>[categoryName(id),money(value/100)])];
 await writeExcelFile([sheet('Resumo',overview,[28,20]),sheet('Transações',transactions,[13,28,14,20,20,18,18,24,13,16,35]),sheet('Contas',accounts,[24,24,18,18,18]),sheet('Cartões',cards,[22,16,14,14,30,15,20,16]),sheet('Calendário',calendar,[14,32,16,14,18]),sheet('Categorias',categories,[28,22])]).toFile(`fynlyax-relatorio-${month}.xlsx`);
}

