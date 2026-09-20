import {RecoveryForm} from '@/components/recovery-form';
import {isConfigured} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{error?:string}>}){const query=await searchParams;return <RecoveryForm configured={isConfigured()} expired={query.error==='expired'}/>;}
