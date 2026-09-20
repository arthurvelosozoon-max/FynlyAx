import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,stateSchema} from './sync/schema.ts';
import {purchaseSchedule,payInvoice,unpaidCharges,projectedBalance,categoryExpenses} from './planning.ts';
import {balance,totals} from './finance.ts';
const card={id:'card',name:'Card',limit:100000,closingDay:22,dueDay:29};
test('card cycle closes on closing day, rolls years and clamps short months',()=>{
 assert.equal(purchaseSchedule(card,'2026-09-21',100,1,'food','Buy','p')[0].date,'2026-09-29');
 assert.equal(purchaseSchedule(card,'2026-09-22',100,1,'food','Buy','p')[0].date,'2026-10-29');
 assert.equal(purchaseSchedule({...card,dueDay:5},'2026-12-22',100,1,'food','Buy','p')[0].date,'2027-02-05');
 assert.deepEqual(purchaseSchedule({...card,closingDay:31,dueDay:31},'2027-01-30',100,3,'food','Buy','p').map(c=>[c.date,c.amount]),[['2027-02-28',34],['2027-03-31',33],['2027-04-30',33]]);
});
test('invoice settlement is idempotent, reduces cash once and retains categories',()=>{
 const s=emptyState();s.cards=[card];s.accounts=[{id:'bank',name:'Bank',opening:10000,currency:'BRL',color:'#ffffff'}];s.cardCharges=purchaseSchedule(card,'2026-09-01',1001,2,'food','Groceries','p');
 assert.equal(totals(s.transactions).expenses,0);
 const paid=payInvoice(s,'card','2026-09','bank','2026-09-29');
 assert.equal(balance(paid.accounts[0],paid.transactions),9499);
 assert.equal(totals(paid.transactions).expenses,501);
 assert.equal(unpaidCharges(paid).length,1);
 assert.deepEqual(payInvoice(paid,'card','2026-09','bank','2026-09-29'),paid);
 assert.deepEqual(categoryExpenses(paid,'2026-09'),[['food',501]]);
 assert.equal(stateSchema.safeParse(paid).success,true);
});
test('projection includes dated pending income and card charges, excludes future paid entries',()=>{
 const s=emptyState();s.cards=[card];s.accounts=[{id:'bank',name:'Bank',opening:1000,currency:'BRL',color:'#ffffff'}];s.cardCharges=purchaseSchedule(card,'2026-09-01',300,1,'food','Buy','p');
 s.transactions=[{id:'salary',description:'Salary',amount:1000,date:'2026-09-25',account:'bank',type:'income',status:'pending',category:'salary'},{id:'future',description:'Future paid',amount:500,date:'2026-10-01',account:'bank',type:'income',status:'paid',category:'salary'}];
 assert.equal(projectedBalance(s,'2026-09-24'),1000);
 assert.equal(projectedBalance(s,'2026-09-30'),1700);
});
test('legacy states gain empty planning modules without changing money',()=>{
 const {cards,cardCharges,customCategories,monthlyLimits,...legacy}=emptyState();
 assert.deepEqual(stateSchema.parse(legacy),emptyState());
});
test('schema rejects unknown cards, invalid payment amounts and category references',()=>{
 const s=emptyState();s.cardCharges=purchaseSchedule(card,'2026-09-01',100,1,'food','Buy','p');
 assert.equal(stateSchema.safeParse(s).success,false);s.cards=[card];assert.equal(stateSchema.safeParse(s).success,true);
 s.customCategories=[{id:'custom',name:'Pets'}];s.cardCharges[0].category='custom';assert.equal(stateSchema.safeParse(s).success,true);
 s.accounts=[{id:'bank',name:'Bank',opening:1000,currency:'BRL',color:'#ffffff'}];const paid=payInvoice(s,'card','2026-09','bank','2026-09-29');paid.transactions[0].amount=99;
 assert.equal(stateSchema.safeParse(paid).success,false);
 s.customCategories=[];assert.equal(stateSchema.safeParse(s).success,false);
});
