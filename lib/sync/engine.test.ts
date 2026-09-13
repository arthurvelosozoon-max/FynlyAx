import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SyncEngine,type RemoteState,type SyncTransport} from './engine.ts';
import {emptyState,stateSchema} from './schema.ts';
const uid='11111111-1111-4111-8111-111111111111';
function deferred<T>(){let resolve!:(value:T)=>void;let reject!:(error:Error)=>void;const promise=new Promise<T>((res,rej)=>{resolve=res;reject=rej;});return {promise,resolve,reject};}
function setup(){let remote:RemoteState={userId:uid,state:emptyState(),revision:0};const backend:SyncTransport={load:async()=>structuredClone(remote),save:async next=>{if(next.revision!==remote.revision)throw new Error('conflict');remote={...structuredClone(next),revision:remote.revision+1};return remote.revision;}};return {backend,get:()=>remote};}
test('serializes edits made while the first save is in flight',async()=>{
 const env=setup();const pending=deferred<void>();let calls=0;const backend={...env.backend,save:async(v:RemoteState)=>{if(++calls===1)await pending.promise;return env.backend.save(v);}};
 const engine=new SyncEngine(emptyState(),backend);await engine.load();engine.change(s=>({...s,prefs:{...s.prefs,name:'First'}}));const saving=engine.save();engine.change(s=>({...s,prefs:{...s.prefs,name:'Second'}}));pending.resolve(undefined);await saving;
 assert.equal(calls,2);assert.equal(env.get().state.prefs.name,'Second');assert.equal(engine.snapshot().dirty,false);
});
test('a stale second device cannot overwrite the first device',async()=>{
 const {backend,get}=setup();const a=new SyncEngine(emptyState(),backend);const b=new SyncEngine(emptyState(),backend);await a.load();await b.load();a.change(s=>({...s,prefs:{...s.prefs,name:'A'}}));await a.save();b.change(s=>({...s,prefs:{...s.prefs,name:'B'}}));await b.save();
 assert.equal(b.snapshot().status,'conflict');assert.equal(b.snapshot().dirty,true);assert.equal(get().state.prefs.name,'A');await b.load(true);assert.equal(b.snapshot().state.prefs.name,'A');assert.equal(b.snapshot().dirty,false);
});
test('slow refresh never discards an edit made during the request',async()=>{
 const env=setup();const delay=deferred<RemoteState>();let count=0;const engine=new SyncEngine(emptyState(),{...env.backend,load:()=>++count===1?env.backend.load():delay.promise});await engine.load();const poll=engine.load();engine.change(s=>({...s,prefs:{...s.prefs,name:'Local'}}));delay.resolve(env.get());await poll;assert.equal(engine.snapshot().state.prefs.name,'Local');assert.equal(engine.snapshot().dirty,true);
});
test('offline errors retain edits and retry can save them',async()=>{
 const env=setup();let online=false;const engine=new SyncEngine(emptyState(),{...env.backend,save:v=>{if(!online)throw new Error('network');return env.backend.save(v);}});await engine.load();engine.change(s=>({...s,prefs:{...s.prefs,name:'Retained'}}));await engine.save();assert.equal(engine.snapshot().status,'offline');assert.equal(engine.snapshot().dirty,true);online=true;await engine.save();assert.equal(engine.snapshot().status,'synced');assert.equal(env.get().state.prefs.name,'Retained');
});
test('changed authenticated account is rejected, not merged',async()=>{
 const env=setup();let swapped=false;const engine=new SyncEngine(emptyState(),{...env.backend,load:async()=>({...env.get(),userId:swapped?'22222222-2222-4222-8222-222222222222':uid})});await engine.load();swapped=true;await engine.load();assert.equal(engine.snapshot().status,'unauthorized');
});
test('validates referential integrity, money, themes and dates',()=>{
 const base=emptyState();assert.equal(stateSchema.safeParse(base).success,true);
 const tx={id:'t',description:'Expense',amount:100,date:'2026-09-13',account:'missing',category:'food',type:'expense',status:'paid'};
 assert.equal(stateSchema.safeParse({...base,transactions:[tx]}).success,false);
 assert.equal(stateSchema.safeParse({...base,prefs:{...base.prefs,accent:'url(malicious)'}}).success,false);
 assert.equal(stateSchema.safeParse({...base,accounts:[{id:'a',name:'A',opening:1.1,currency:'BRL',color:'#123456'}]}).success,false);
});
