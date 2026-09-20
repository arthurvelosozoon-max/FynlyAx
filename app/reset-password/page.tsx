import {RecoveryForm} from '@/components/recovery-form';
import {isConfigured,serverClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export default async function Page(){let valid=false;if(isConfigured()){try{const client=await serverClient();const {data:{user},error}=await client.auth.getUser();valid=!!user&&!error;}catch{}}return <RecoveryForm reset configured={isConfigured()} expired={!valid}/>;}
