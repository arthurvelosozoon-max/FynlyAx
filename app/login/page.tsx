import {AuthForm} from '@/components/auth-form';
import {isConfigured} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{error?:string}>}){const query=await searchParams;return <AuthForm configured={isConfigured()} confirmationError={query.error==='confirmation'}/>}
