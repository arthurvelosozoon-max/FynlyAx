'use client';
import {useCallback,useEffect,useRef,useState,type SetStateAction} from 'react';
import {accounts,seed,goalSeed} from '../demo';
import {emptyState,stateSchema,type FinancialState} from './schema';
import {SyncEngine,type SyncSnapshot} from './engine';
import {transport} from './transport';
const demoState=():FinancialState=>({...emptyState(),prefs:{...emptyState().prefs,name:'Arthur'},accounts,transactions:seed,goals:goalSeed});
export function useFinancialState(mode:'demo'|'cloud'){
 const [snapshot,setSnapshot]=useState<SyncSnapshot>(()=>({state:mode==='demo'?demoState():emptyState(),status:'loading',ready:false,dirty:false,revision:0}));
 const engine=useRef<SyncEngine|null>(null);
 useEffect(()=>{
  if(mode==='demo'){
   let state=demoState();try{const raw=localStorage.getItem('fynlyax-demo-v1');if(raw){const {version,...data}=JSON.parse(raw);const parsed=stateSchema.safeParse(data);if(version===1&&parsed.success)state=parsed.data;}}catch{}
   setSnapshot({state,status:'synced',ready:true,dirty:false,revision:0});return;
  }
  const instance=new SyncEngine(emptyState(),transport);engine.current=instance;
  const off=instance.subscribe(()=>setSnapshot(instance.snapshot()));void instance.load();
  const refresh=()=>{if(document.visibilityState==='visible')void instance.load();};
  const poll=setInterval(refresh,15000);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);
  return()=>{clearInterval(poll);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);off();instance.dispose();engine.current=null;};
 },[mode]);
 useEffect(()=>{
  if(!snapshot.ready)return;
  if(mode==='demo'){try{localStorage.setItem('fynlyax-demo-v1',JSON.stringify({version:1,...snapshot.state}));}catch{setSnapshot(s=>({...s,status:'offline'}));}return;}
  if(snapshot.status!=='pending')return;
  const timer=setTimeout(()=>void engine.current?.save(),700);return()=>clearTimeout(timer);
 },[snapshot.state,snapshot.ready,snapshot.status,mode]);
 useEffect(()=>{if(mode!=='cloud'||!snapshot.dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[snapshot.dirty,mode]);
 const setField=useCallback(<K extends keyof FinancialState>(key:K,value:SetStateAction<FinancialState[K]>)=>{
  const change=(state:FinancialState)=>({...state,[key]:typeof value==='function'?(value as (previous:FinancialState[K])=>FinancialState[K])(state[key]):value});
  if(mode==='cloud')engine.current?.change(change);else setSnapshot(s=>({...s,state:change(s.state)}));
 },[mode]);
 const retry=()=>snapshot.dirty?engine.current?.save():engine.current?.load();
 const loadLatest=()=>engine.current?.load(true);
 const exportPending=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot.state,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='fynlyax-pending.json';link.click();URL.revokeObjectURL(url);};
 return {...snapshot,setField,retry,loadLatest,exportPending};
}
