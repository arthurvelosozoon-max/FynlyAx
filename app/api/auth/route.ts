import {z} from 'zod';
import {appOrigin} from '@/lib/app-origin';
import {serverClient,isConfigured} from '@/lib/supabase/server';
import {json,readJSON,sameOrigin} from '@/lib/sync/http';
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('login'),email:z.email().max(254),password:z.string().min(1).max(128)}).strict(),
 z.object({action:z.literal('register'),email:z.email().max(254),password:z.string().min(12).max(128),confirmPassword:z.string().min(12).max(128)}).strict(),
 z.object({action:z.literal('logout')}).strict(),
]);
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'forbidden'},403);
 if(!isConfigured())return json({error:'not_configured'},503);
 try{
  const body=schema.safeParse(await readJSON(request,4096));if(!body.success)return json({error:'invalid'},400);
  if(body.data.action==='register'&&body.data.password!==body.data.confirmPassword)return json({error:'passwordMismatch'},400);
  const client=await serverClient();
  if(body.data.action==='logout'){const {error}=await client.auth.signOut({scope:'local'});return error?json({error:'unavailable'},503):json({ok:true});}
  const {email,password,action}=body.data;
  if(action==='login'){const {error}=await client.auth.signInWithPassword({email,password});return error?json({error:error.status===429?'rate_limit':'credentials'},error.status===429?429:401):json({ok:true});}
  const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:new URL('/auth/callback',appOrigin(request.url)).href}});
  if(error)return json({error:error.status===429?'rate_limit':'signup_failed'},error.status===429?429:400);
  return json({ok:true,confirmationRequired:!data.session});
 }catch{return json({error:'unavailable'},503);}
}
