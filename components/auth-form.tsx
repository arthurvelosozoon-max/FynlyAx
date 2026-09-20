'use client';
import {useState,type FormEvent} from 'react';
import {Brand} from './brand';
import {PasswordField} from './password-field';
import {messages,type Locale} from '@/messages';
export function AuthForm({register=false,configured,confirmationError=false}:{register?:boolean;configured:boolean;confirmationError?:boolean}){
 const [locale,setLocale]=useState<Locale>('pt-BR');const [busy,setBusy]=useState(false);const [message,setMessage]=useState(confirmationError?'confirmationError':'');const t=messages[locale];
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;setBusy(true);setMessage('');const values=new FormData(form);
  if(register&&values.get('password')!==values.get('confirmPassword')){setMessage('passwordMismatch');setBusy(false);return;}
  try{const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:register?'register':'login',email:String(values.get('email')).trim(),password:values.get('password'),...(register?{confirmPassword:values.get('confirmPassword')}:{})}),signal:AbortSignal.timeout(20000)});const result=await response.json();
   if(!response.ok){setMessage(result.error in t?result.error:'unavailable');return;}
   if(result.confirmationRequired){setMessage('confirmationSent');form.reset();}else window.location.assign('/dashboard');
  }catch{setMessage('unavailable');}finally{setBusy(false);}
 }
 return <main className="auth-page"><section className="auth-panel panel"><div className="between"><Brand/><select aria-label={t.language} value={locale} onChange={e=>setLocale(e.target.value as Locale)}><option>pt-BR</option><option>en-US</option><option>es-ES</option></select></div><h1>{register?t.register:t.loginTitle}</h1><p>{t.loginDescription}</p>{!configured&&<p className="sync-banner" role="status">{t.not_configured}</p>}<form onSubmit={submit}><label>{t.email}<input name="email" type="email" required maxLength={254} autoComplete="email" disabled={!configured||busy}/></label><PasswordField name="password" label={t.password} showLabel={t.showPassword} hideLabel={t.hidePassword} minLength={register?12:1} autoComplete={register?'new-password':'current-password'} disabled={!configured||busy}/>{register&&<PasswordField name="confirmPassword" label={t.confirmPassword} showLabel={t.showPassword} hideLabel={t.hidePassword} minLength={12} autoComplete="new-password" disabled={!configured||busy}/>}{register&&<p className="small muted">{t.passwordHelp}</p>}{message&&<p role="status">{t[message as keyof typeof t]}</p>}<button className="button primary full" disabled={!configured||busy}>{busy?t.working:register?t.register:t.login}</button></form>{!register&&<p className="auth-switch"><a href="/forgot-password">{t.recoverPassword}</a></p>}<p className="auth-switch">{register?t.loginSwitch:t.signupSwitch} <a href={register?'/login':'/register'}>{register?t.login:t.register}</a></p><a className="text-button" href="/demo">{t.demoLink}</a></section></main>;
}
