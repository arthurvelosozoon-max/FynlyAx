'use client';
import {useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
export function PasswordField({name,label,showLabel,hideLabel,minLength,disabled,autoComplete}:{name:string;label:string;showLabel:string;hideLabel:string;minLength:number;disabled:boolean;autoComplete:'new-password'|'current-password'}){
 const [visible,setVisible]=useState(false);
 return <div className="password-field"><label htmlFor={name}>{label}</label><div className="password-input"><input id={name} name={name} type={visible?'text':'password'} required minLength={minLength} maxLength={128} autoComplete={autoComplete} disabled={disabled}/><button type="button" className="icon-button" aria-label={`${visible?hideLabel:showLabel}: ${label}`} aria-controls={name} aria-pressed={visible} disabled={disabled} onClick={()=>setVisible(v=>!v)}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></div>;
}
