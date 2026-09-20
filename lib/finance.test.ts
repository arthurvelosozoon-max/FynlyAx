import {test} from 'node:test';
import assert from 'node:assert/strict';
import {balance,totals,parseAmount,splitInstallments,shiftDate,type Transaction} from './finance.ts';
test('transfer conserves balance and never counts as income or expense',()=>{const t:Transaction={id:'1',description:'transfer',amount:1500,date:'2026-09-01',type:'transfer',account:'a',destination:'b',category:'other',status:'paid'};const a=balance({id:'a',name:'a',opening:5000,currency:'BRL',color:''},[t]);const b=balance({id:'b',name:'b',opening:0,currency:'BRL',color:''},[t]);assert.equal(a+b,5000);assert.equal(a,3500);assert.deepEqual(totals([t]),{income:0,expenses:0,savings:0,rate:0});});
test('pending payments do not affect settled balance',()=>{assert.equal(balance({id:'a',name:'a',opening:100,currency:'BRL',color:''},[{id:'1',description:'x',amount:300,date:'2026-09-01',type:'expense',account:'a',category:'other',status:'pending'}]),100);});
test('decimal input is exact and rejects invalid or negative values',()=>{assert.equal(parseAmount('10,29'),1029);assert.equal(parseAmount('0.01'),1);for(const v of ['-1','0','1.999','NaN','1e6','1.000,00'])assert.throws(()=>parseAmount(v));});
test('installments preserve every cent',()=>{assert.deepEqual(splitInstallments(100,3),[34,33,33]);assert.equal(splitInstallments(480001,12).reduce((s,n)=>s+n,0),480001);});
test('recurrence dates preserve the intended day and clamp short months',()=>{assert.equal(shiftDate('2026-01-31','monthly',1),'2026-02-28');assert.equal(shiftDate('2026-02-28','yearly',1),'2027-02-28');assert.equal(shiftDate('2026-09-01','weekly',3),'2026-09-22');});

