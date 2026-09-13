'use client';
import {Cloud,RefreshCw,Download,LogOut} from 'lucide-react';
import {messages,type Locale} from '@/messages';
import type {SyncSnapshot} from '@/lib/sync/engine';
type Props=Pick<SyncSnapshot,'status'|'dirty'> & {locale:Locale;retry:()=>unknown;loadLatest:()=>unknown;exportPending:()=>void};
export function SyncStatus({status,dirty,locale,retry,loadLatest,exportPending}:Props){const t=messages[locale];const trouble=!['synced','saving','pending','loading'].includes(status);
 async function logout(){if(dirty||status==='saving')return;try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(r.ok)window.location.assign('/login');else alert(t.unavailable);}catch{alert(t.unavailable);}}
 return <section className={`sync-banner ${trouble?'sync-warning':''}`} aria-label={t.cloudMode}><div role="status"><Cloud size={18}/><span>{t[`sync_${status}`]}</span></div><div className="sync-actions">{trouble&&status!=='conflict'&&status!=='unauthorized'&&<button className="text-button" onClick={()=>void retry()}><RefreshCw size={14}/>{t.retry}</button>}{dirty&&<button className="text-button" onClick={exportPending}><Download size={14}/>{t.downloadPending}</button>}{status==='conflict'&&<button className="text-button" onClick={()=>{if(window.confirm(t.discardConfirm))void loadLatest();}}>{t.loadLatest}</button>}{status==='unauthorized'?<a className="button" href="/login">{t.login}</a>:<button className="text-button" disabled={dirty||status==='saving'} onClick={logout}><LogOut size={14}/>{t.logout}</button>}</div></section>;
}
