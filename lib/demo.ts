import type {Account,Transaction} from './finance';
export const accounts:Account[]=[{id:'nubank',name:'Nubank',opening:780000,currency:'BRL',color:'#8b5cf6'},{id:'itau',name:'Itaú',opening:425000,currency:'BRL',color:'#f59e0b'},{id:'wallet',name:'Wallet',opening:32000,currency:'BRL',color:'#22c55e'}];
export const seed:Transaction[]=[
 {id:'1',description:'Salário',amount:1250000,date:'2026-09-05',type:'income',account:'nubank',category:'salary',status:'paid'},
 {id:'2',description:'Projeto de identidade visual',amount:240000,date:'2026-09-10',type:'income',account:'itau',category:'freelance',status:'paid'},
 {id:'3',description:'Aluguel',amount:280000,date:'2026-09-05',type:'expense',account:'nubank',category:'home',status:'paid'},
 {id:'4',description:'Supermercado',amount:68490,date:'2026-09-11',type:'expense',account:'nubank',category:'food',status:'paid'},
 {id:'5',description:'Restaurante',amount:18500,date:'2026-09-12',type:'expense',account:'itau',category:'food',status:'paid'},
 {id:'6',description:'Uber',amount:4290,date:'2026-09-12',type:'expense',account:'nubank',category:'transport',status:'paid'},
 {id:'7',description:'Academia',amount:14990,date:'2026-09-10',type:'expense',account:'nubank',category:'health',status:'paid'},
 {id:'8',description:'Internet',amount:12990,date:'2026-09-20',type:'expense',account:'itau',category:'home',status:'pending'},
 {id:'9',description:'Cinema',amount:7800,date:'2026-09-08',type:'expense',account:'wallet',category:'leisure',status:'paid'},
 {id:'10',description:'Salário',amount:1250000,date:'2026-08-05',type:'income',account:'nubank',category:'salary',status:'paid'},
 {id:'11',description:'Despesas de agosto',amount:875000,date:'2026-08-28',type:'expense',account:'nubank',category:'other',status:'paid'}
];
export const goalSeed=[{id:'reserve',name:'reserve',target:3000000,current:1840000,color:'#a78bfa'},{id:'travel',name:'travel',target:1800000,current:675000,color:'#38bdf8'},{id:'home',name:'newHome',target:10000000,current:2200000,color:'#34d399'}];
