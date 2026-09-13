import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

export function isConfigured(){return !!(process.env.SUPABASE_URL&&process.env.SUPABASE_PUBLISHABLE_KEY);}
export async function serverClient(){
 if(!isConfigured())throw new Error('not_configured');
 const store=await cookies();
 return createServerClient(process.env.SUPABASE_URL!,process.env.SUPABASE_PUBLISHABLE_KEY!,{
  cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'&&!['http://127.0.0.1:3000','http://localhost:3000'].includes(process.env.APP_ORIGIN??''),path:'/'},
  cookies:{getAll:()=>store.getAll(),setAll:values=>{for(const {name,value,options} of values)store.set(name,value,options);}},
 });
}
