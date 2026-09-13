import type {NextConfig} from 'next';
const config:NextConfig={experimental:{useTypeScriptCli:false,workerThreads:true,webpackBuildWorker:false,cpus:1}};
export default config;
