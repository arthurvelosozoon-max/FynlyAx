import type {FinancialState} from './schema.ts';
export type SyncStatus='loading'|'synced'|'pending'|'saving'|'offline'|'conflict'|'unauthorized'|'not_configured'|'invalid'|'unavailable';
export type RemoteState={userId:string;state:FinancialState;revision:number};
export interface SyncTransport{load():Promise<RemoteState>;save(value:RemoteState):Promise<number>}
export type SyncSnapshot={state:FinancialState;status:SyncStatus;ready:boolean;dirty:boolean;revision:number};
/** A single serialized write queue, protected by database compare-and-swap. */
export class SyncEngine{
 private current:SyncSnapshot;private baseline:string;private userId='';private writing=false;private reading=false;private disposed=false;
 private listeners=new Set<()=>void>();
 private transport:SyncTransport;
 constructor(initial:FinancialState,transport:SyncTransport){this.transport=transport;this.current={state:initial,status:'loading',ready:false,dirty:false,revision:0};this.baseline=JSON.stringify(initial);}
 snapshot=()=>this.current;
 subscribe=(callback:()=>void)=>{this.listeners.add(callback);return()=>{this.listeners.delete(callback);};};
 private emit(value:Partial<SyncSnapshot>){if(this.disposed)return;this.current={...this.current,...value};for(const fn of this.listeners)fn();}
 change(updater:(state:FinancialState)=>FinancialState){
  if(!this.current.ready||this.current.status==='unauthorized')return;
  const state=updater(this.current.state);const dirty=JSON.stringify(state)!==this.baseline;
  this.emit({state,dirty,status:this.current.status==='conflict'?'conflict':dirty?'pending':'synced'});
 }
 private fail(error:unknown){const message=error instanceof Error?error.message:'offline';const allowed=['conflict','unauthorized','not_configured','invalid','unavailable'];this.emit({status:allowed.includes(message)?message as SyncStatus:'offline'});}
 async load(discard=false){
  if(this.disposed||this.reading||this.writing||(!discard&&this.current.dirty))return;
  this.reading=true;const before=JSON.stringify(this.current.state);const revision=this.current.revision;
  try{const remote=await this.transport.load();
   // A slow poll must never replace an edit or a save made while it was in flight.
   if(this.disposed||this.writing||JSON.stringify(this.current.state)!==before||this.current.revision!==revision)return;
   if(this.userId&&this.userId!==remote.userId)throw new Error('unauthorized');
   this.userId=remote.userId;this.baseline=JSON.stringify(remote.state);
   this.emit({state:remote.state,revision:remote.revision,dirty:false,ready:true,status:'synced'});
  }catch(error){this.fail(error);}finally{this.reading=false;}
 }
 async save(){
  if(this.disposed||this.writing||!this.current.ready||!this.current.dirty||['conflict','unauthorized'].includes(this.current.status))return;
  this.writing=true;
  try{while(!this.disposed&&this.current.dirty){
   const sent=this.current.state;const serialized=JSON.stringify(sent);this.emit({status:'saving'});
   const revision=await this.transport.save({userId:this.userId,state:sent,revision:this.current.revision});
   this.baseline=serialized;const dirty=JSON.stringify(this.current.state)!==serialized;
   this.emit({revision,dirty,status:dirty?'pending':'synced'});
  }}catch(error){this.fail(error);}finally{this.writing=false;}
 }
 dispose(){this.disposed=true;this.listeners.clear();}
}
