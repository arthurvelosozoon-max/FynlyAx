import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {emptyState} from './schema.ts';

test('PostgreSQL migration: RLS isolation, atomic revisions and validated writes',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create schema auth;
   create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated,anon;
   insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`);
  await db.exec(await readFile(new URL('../../database/002_cloud_sync.sql',import.meta.url),'utf8'));
  const setUser=async(id:string)=>{await db.exec('reset role;set role authenticated;');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);};
  const save=(revision:number,state=emptyState())=>db.query<{revision:number}>('select public.fynlyax_save_state($1,$2::jsonb) as revision',[revision,JSON.stringify(state)]);
  await setUser('11111111-1111-4111-8111-111111111111');assert.equal((await save(0)).rows[0].revision,1);
  assert.equal((await save(1)).rows[0].revision,2);
  await assert.rejects(save(1),(e:unknown)=>(e as {code:string}).code==='40001');
  await assert.rejects(db.exec('update public.fynlyax_user_state set revision=99'),(e:unknown)=>(e as {code:string}).code==='42501');
  await setUser('22222222-2222-4222-8222-222222222222');assert.equal((await db.query('select * from public.fynlyax_user_state')).rows.length,0);
  assert.equal((await save(0)).rows[0].revision,1);assert.equal((await db.query('select * from public.fynlyax_user_state')).rows.length,1);
  const invalid=emptyState();invalid.transactions.push({id:'t',description:'Bad account',amount:1,date:'2026-09-13',account:'missing',category:'food',type:'expense',status:'paid'});
  await assert.rejects(save(1,invalid),(e:unknown)=>(e as {code:string}).code==='22023');
  await setUser('');await assert.rejects(save(0),(e:unknown)=>(e as {code:string}).code==='42501');
  await db.exec('reset role;set role anon;');await assert.rejects(save(0),(e:unknown)=>(e as {code:string}).code==='42501');
 }finally{await db.close();}
});
