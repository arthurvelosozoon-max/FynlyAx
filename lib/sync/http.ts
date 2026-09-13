import {NextResponse} from 'next/server';
import {appOrigin} from '../app-origin';
export function json(body:unknown,status=200){return NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie'}});}
export function sameOrigin(request:Request){return request.headers.get('origin')===appOrigin(request.url);}
/** Stop reading before an oversized request can be buffered in full. */
export async function readJSON(request:Request,limit=2_000_000):Promise<unknown>{
 const reader=request.body?.getReader();if(!reader)throw new Error('invalid');
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('too_large');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
