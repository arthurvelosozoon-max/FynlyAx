import {z} from 'zod';

const cents=z.number().int().min(0).max(100_000_000_000);
const id=z.string().min(1).max(80);
const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
const currency=z.enum(['BRL','USD','EUR','GBP']);
export const preferencesSchema=z.object({
 locale:z.enum(['pt-BR','en-US','es-ES']),theme:z.enum(['dark','light','system']),accent:color,
 hidden:z.boolean(),name:z.string().max(40),lastName:z.string().max(60),currency,
 widgets:z.array(z.string().refine(v=>['available','income','expense','savings'].includes(v))).max(4).refine(v=>new Set(v).size===v.length),
}).strict();
const accountSchema=z.object({id,name:z.string().trim().min(1).max(50),opening:cents,currency:currency.refine((v):boolean=>v==='BRL'),color}).strict();
const categoryId=z.string().min(1).max(80);
const transactionSchema=z.object({id,description:z.string().trim().min(1).max(120),amount:cents.positive(),
 date:z.iso.date(),type:z.enum(['income','expense','transfer']),account:id,destination:id.optional(),
 category:categoryId,status:z.enum(['paid','pending'])}).strict();
export const stateSchema=z.object({
 customCategories:z.array(z.object({id:categoryId,name:z.string().trim().min(1).max(50)}).strict()).max(100).default([]),
 cards:z.array(z.object({id,name:z.string().trim().min(1).max(50),limit:cents.positive(),closingDay:z.number().int().min(1).max(31),dueDay:z.number().int().min(1).max(31)}).strict()).max(50).default([]),
 cardCharges:z.array(z.object({id:z.string().min(1).max(72),cardId:id,description:z.string().trim().min(1).max(120),amount:cents.positive(),date:z.iso.date(),category:categoryId}).strict()).max(10000).default([]),
 monthlyLimits:z.record(z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),z.record(categoryId,cents.positive())).default({}),
 prefs:preferencesSchema,accounts:z.array(accountSchema).max(100),transactions:z.array(transactionSchema).max(10000),
 goals:z.array(z.object({id,name:z.string().trim().min(1).max(120),target:cents.positive(),current:cents,color}).strict()).max(100),
 limits:z.record(categoryId,cents.positive()),
}).strict().superRefine((state,ctx)=>{
 const categories=new Set(['home','food','transport','health','leisure','salary','freelance','other',...state.customCategories.map(c=>c.id)]);
 const cardIds=new Set(state.cards.map(c=>c.id));
 for(const c of state.customCategories)if(['home','food','transport','health','leisure','salary','freelance','other'].includes(c.id))ctx.addIssue({code:'custom',message:'reserved_category'});
 for(const c of [...state.cardCharges,...state.transactions])if(!categories.has(c.category))ctx.addIssue({code:'custom',message:'missing_category'});
 for(const limits of [state.limits,...Object.values(state.monthlyLimits)])for(const key of Object.keys(limits))if(!categories.has(key))ctx.addIssue({code:'custom',message:'missing_category'});
 for(const c of state.cardCharges){if(!cardIds.has(c.cardId))ctx.addIssue({code:'custom',message:'missing_card'});const payment=state.transactions.find(t=>t.id==='invoice:'+c.id);if(payment&&(payment.amount!==c.amount||payment.category!==c.category||payment.type!=='expense'||payment.status!=='paid'))ctx.addIssue({code:'custom',message:'invalid_payment'});}
 const accounts=new Set(state.accounts.map(a=>a.id));
 for(const rows of [state.accounts,state.transactions,state.goals,state.cards,state.cardCharges,state.customCategories])if(new Set(rows.map(r=>r.id)).size!==rows.length)ctx.addIssue({code:'custom',message:'duplicate_id'});
 state.transactions.forEach((t,i)=>{
  if(!accounts.has(t.account))ctx.addIssue({code:'custom',message:'missing_account',path:['transactions',i]});
  if(t.type==='transfer'?(!t.destination||t.destination===t.account||!accounts.has(t.destination)):!!t.destination)ctx.addIssue({code:'custom',message:'invalid_transfer',path:['transactions',i]});
 });
 state.goals.forEach((g,i)=>{if(g.current>g.target)ctx.addIssue({code:'custom',message:'goal_exceeded',path:['goals',i]});});
});
export type FinancialState=z.infer<typeof stateSchema>;
export type Preferences=z.infer<typeof preferencesSchema>;
export const defaultPreferences:Preferences={locale:'pt-BR',theme:'dark',accent:'#7c3aed',hidden:false,name:'',lastName:'',currency:'BRL',widgets:['available','income','expense','savings']};
export function emptyState():FinancialState{return {cards:[],cardCharges:[],customCategories:[],monthlyLimits:{},prefs:{...defaultPreferences,widgets:[...defaultPreferences.widgets]},accounts:[],transactions:[],goals:[],limits:{home:350000,food:150000,transport:60000,health:45000,leisure:50000}};}
export const saveSchema=z.object({userId:z.uuid(),revision:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER-1),state:stateSchema}).strict();
