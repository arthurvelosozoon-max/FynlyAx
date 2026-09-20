'use client';
import {useState,type FormEvent} from 'react';
import {Brand} from './brand';
import {PasswordField} from './password-field';
import {messages,type Locale, type MessageKey} from '@/messages';

export function RecoveryForm({reset=false,configured,expired=false}:{reset?:boolean;configured:boolean;expired?:boolean}){
 const [locale,setLocale]=useState<Locale>('pt-BR');
 const [busy,setBusy]=useState(false);
 const [done,setDone]=useState(false);
 const [invalidSession,setInvalidSession]=useState(reset&&expired);
 const [message,setMessage]=useState<MessageKey|''>(expired?'recoveryExpired':'');
 const t=messages[locale];
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget;const values=new FormData(form);
  if(reset&&values.get('password')!==values.get('confirmPassword')){setMessage('passwordMismatch');return;}
  setBusy(true);setMessage('');
  try{
   const body=reset?{action:'reset',password:values.get('password'),confirmPassword:values.get('confirmPassword')}:{action:'recover',email:String(values.get('email')).trim()};
   const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
   const result=await response.json();
   if(!response.ok){setMessage(result.error in t?result.error:'unavailable');if(result.error==='recoveryExpired')setInvalidSession(true);return;}
   setDone(true);setMessage(reset?'passwordUpdated':'recoverySent');form.reset();
  }catch{setMessage('unavailable');}finally{setBusy(false);}
 }
 return <main className="auth-page"><section className="auth-panel panel">
  <div className="between"><Brand/><select aria-label={t.language} value={locale} onChange={e=>setLocale(e.target.value as Locale)}><option>pt-BR</option><option>en-US</option><option>es-ES</option></select></div>
  <h1>{reset?t.resetTitle:t.recoverPassword}</h1><p>{reset?t.resetDescription:t.recoverDescription}</p>
  {!configured&&<p className="sync-banner" role="status">{t.not_configured}</p>}
  {message&&<p role="status" aria-live="polite">{t[message]}</p>}
  {!done&&!invalidSession&&<form onSubmit={submit}>
   {reset?<><PasswordField name="password" label={t.password} showLabel={t.showPassword} hideLabel={t.hidePassword} minLength={12} autoComplete="new-password" disabled={!configured||busy}/><PasswordField name="confirmPassword" label={t.confirmPassword} showLabel={t.showPassword} hideLabel={t.hidePassword} minLength={12} autoComplete="new-password" disabled={!configured||busy}/><p className="small muted">{t.passwordHelp}</p></>:<label>{t.email}<input name="email" type="email" required maxLength={254} autoComplete="email" disabled={!configured||busy}/></label>}
   <button className="button primary full" disabled={!configured||busy}>{busy?t.working:reset?t.savePassword:t.sendRecovery}</button>
  </form>}
  {invalidSession&&<p><a className="button primary full" href="/forgot-password">{t.newRecoveryLink}</a></p>}
  <p className="auth-switch"><a href="/login">{t.backToLogin}</a></p>
 </section></main>;
}
