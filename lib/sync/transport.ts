import {stateSchema} from './schema';
import type {RemoteState,SyncTransport} from './engine';
async function responseJSON(response:Response){
 const result=await response.json();
 if(!response.ok)throw new Error(response.status===401?'unauthorized':response.status===409?'conflict':result.error==='not_configured'?'not_configured':response.status===400||response.status===422?'invalid':'unavailable');
 return result;
}
export const transport:SyncTransport={
 async load(){const result=await responseJSON(await fetch('/api/sync',{cache:'no-store',signal:AbortSignal.timeout(15000)}));
  if(typeof result.userId!=='string'||!Number.isSafeInteger(result.revision)||result.revision<0)throw new Error('invalid');
  return {...result,state:stateSchema.parse(result.state)} as RemoteState;
 },
 async save(value){const result=await responseJSON(await fetch('/api/sync',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),signal:AbortSignal.timeout(15000)}));
  if(!Number.isSafeInteger(result.revision)||result.revision<=value.revision)throw new Error('invalid');return result.revision;
 },
};
