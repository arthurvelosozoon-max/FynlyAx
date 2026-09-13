/** Use platform-owned hostnames rather than trusting incoming proxy headers. */
export function appOrigin(fallback:string){
 if(process.env.APP_ORIGIN)return new URL(process.env.APP_ORIGIN).origin;
 if(process.env.VERCEL_PROJECT_PRODUCTION_URL&&process.env.VERCEL_ENV==='production')return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
 if(process.env.VERCEL_URL)return `https://${process.env.VERCEL_URL}`;
 return new URL(fallback).origin;
}
