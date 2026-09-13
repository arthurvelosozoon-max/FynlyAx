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
const transactionSchema=z.object({id,description:z.string().trim().min(1).max(120),amount:cents.positive(),
 date:z.iso.date(),type:z.enum(['income','expense','transfer']),account:id,destination:id.optional(),
 category:z.string().refine(v=>['home','food','transport','health','leisure','salary','freelance','other'].includes(v)),status:z.enum(['paid','pending'])}).strict();
export const stateSchema=z.object({
 prefs:preferencesSchema,accounts:z.array(accountSchema).max(100),transactions:z.array(transactionSchema).max(10000),
 goals:z.array(z.object({id,name:z.string().trim().min(1).max(120),target:cents.positive(),current:cents,color}).strict()).max(100),
 limits:z.record(z.string().refine(v=>['home','food','transport','health','leisure','salary','freelance','other'].includes(v)),cents.positive()),
}).strict().superRefine((state,ctx)=>{
 const accounts=new Set(state.accounts.map(a=>a.id));
 for(const rows of [state.accounts,state.transactions,state.goals])if(new Set(rows.map(r=>r.id)).size!==rows.length)ctx.addIssue({code:'custom',message:'duplicate_id'});
 state.transactions.forEach((t,i)=>{
  if(!accounts.has(t.account))ctx.addIssue({code:'custom',message:'missing_account',path:['transactions',i]});
  if(t.type==='transfer'?(!t.destination||t.destination===t.account||!accounts.has(t.destination)):!!t.destination)ctx.addIssue({code:'custom',message:'invalid_transfer',path:['transactions',i]});
 });
 state.goals.forEach((g,i)=>{if(g.current>g.target)ctx.addIssue({code:'custom',message:'goal_exceeded',path:['goals',i]});});
});
export type FinancialState=z.infer<typeof stateSchema>;
export type Preferences=z.infer<typeof preferencesSchema>;
export const defaultPreferences:Preferences={locale:'pt-BR',theme:'dark',accent:'#7c3aed',hidden:false,name:'',lastName:'',currency:'BRL',widgets:['available','income','expense','savings']};
export function emptyState():FinancialState{return {prefs:{...defaultPreferences,widgets:[...defaultPreferences.widgets]},accounts:[],transactions:[],goals:[],limits:{home:350000,food:150000,transport:60000,health:45000,leisure:50000}};}
export const saveSchema=z.object({userId:z.uuid(),revision:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER-1),state:stateSchema}).strict();
