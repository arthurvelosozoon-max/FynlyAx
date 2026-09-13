import {serverClient,isConfigured} from '@/lib/supabase/server';
import {stateSchema,saveSchema,emptyState} from '@/lib/sync/schema';
import {json,readJSON,sameOrigin} from '@/lib/sync/http';
export const dynamic='force-dynamic';
export async function GET(){
 if(!isConfigured())return json({error:'not_configured'},503);
 try{
  const client=await serverClient();const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return json({error:'unauthorized'},401);
  const {data,error}=await client.from('fynlyax_user_state').select('payload,revision').eq('user_id',user.id).maybeSingle();
  if(error)return json({error:'unavailable'},503);
  const parsed=stateSchema.safeParse(data?.payload??emptyState());
  if(!parsed.success)return json({error:'invalid_remote'},422);
  return json({userId:user.id,state:parsed.data,revision:data?.revision??0});
 }catch{return json({error:'unavailable'},503);}
}
export async function PUT(request:Request){
 if(!sameOrigin(request))return json({error:'forbidden'},403);
 if(!isConfigured())return json({error:'not_configured'},503);
 try{
  const client=await serverClient();const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return json({error:'unauthorized'},401);
  const parsed=saveSchema.safeParse(await readJSON(request));
  if(!parsed.success)return json({error:'invalid'},400);
  if(parsed.data.userId!==user.id)return json({error:'account_changed'},401);
  const {data,error}=await client.rpc('fynlyax_save_state',{expected_revision:parsed.data.revision,next_payload:parsed.data.state});
  if(error){if(error.code==='40001')return json({error:'conflict'},409);return json({error:'unavailable'},503);}
  return json({revision:data});
 }catch(e){return json({error:(e as Error).message==='too_large'?'too_large':'unavailable'},(e as Error).message==='too_large'?413:503);}
}
