import {NextResponse} from 'next/server';
import {appOrigin} from '@/lib/app-origin';
import {serverClient} from '@/lib/supabase/server';
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;const code=params.get('code');const recovery=params.get('next')==='reset-password';
 try{if(code){const client=await serverClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(recovery?'/reset-password':'/dashboard',appOrigin(request.url)),{headers:{'Cache-Control':'no-store'}});}}catch{}
 return NextResponse.redirect(new URL(recovery?'/forgot-password?error=expired':'/login?error=confirmation',appOrigin(request.url)),{headers:{'Cache-Control':'no-store'}});
}
