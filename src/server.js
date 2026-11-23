import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {loadEnv, configFromEnv} from './config.js';
import {Bitrix} from './bitrix.js';
import {syncDeal} from './sync.js';

loadEnv();
const cfg = configFromEnv();
const bitrix = new Bitrix(cfg.url);
const busy = new Set();
function authorized(input) {
  const actual = Buffer.from(input || ''); const expected = Buffer.from(cfg.token);
  return actual.length === expected.length && timingSafeEqual(actual,expected);
}
function answer(res,status,data) {res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data));}
const server = http.createServer(async (req,res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { return answer(res,400,{ok:false,error:'Некорректный URL'}); }
  if (url.pathname === '/health' && req.method === 'GET') return answer(res,200,{ok:true,status:'alive'});
  if (url.pathname !== '/sync' || !['POST','GET'].includes(req.method)) return answer(res,404,{ok:false,error:'Not found'});
  const token = req.headers['x-sync-token'] || url.searchParams.get('token');
  if (!authorized(token)) return answer(res,401,{ok:false,error:'Unauthorized'});
  let params = Object.fromEntries(url.searchParams);
  if (req.method === 'POST') {
    try {
      let body=''; for await (const chunk of req) {body += chunk; if (body.length > 8192) return answer(res,413,{ok:false,error:'Body too large'});}
      if (body) { const contentType = req.headers['content-type'] || ''; const parsed = contentType.includes('application/json') ? JSON.parse(body) : Object.fromEntries(new URLSearchParams(body)); params = {...params,...parsed}; }
    } catch { return answer(res,400,{ok:false,error:'Некорректное тело запроса'}); }
  }
  const id = Number(params.dealId || params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return answer(res,400,{ok:false,error:'Передайте dealId'});
  if (busy.has(id)) return answer(res,409,{ok:false,error:'Сделка уже обрабатывается'});
  busy.add(id);
  try {const result = await syncDeal(bitrix,id,cfg);console.log(JSON.stringify({time:new Date().toISOString(),dealId:id,action:result.action,dryRun:cfg.dryRun}));return answer(res,200,{ok:true,...result});}
  catch(e) {console.error(JSON.stringify({time:new Date().toISOString(),dealId:id,error:e.message}));return answer(res,422,{ok:false,dealId:id,error:e.message});}
  finally {busy.delete(id);}
});
server.listen(cfg.port,cfg.host,()=>console.log(`Profitbase sync listening ${cfg.host}:${cfg.port}; DRY_RUN=${cfg.dryRun}; SYNC_MODE=${cfg.mode}`));
