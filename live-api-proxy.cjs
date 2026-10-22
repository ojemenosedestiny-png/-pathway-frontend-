const https = require('node:https');

// Fixed upstream: credentials and cookies are never forwarded to a browser-supplied URL.
function liveApiProxy(origin = process.env.PATHWAY_BACKEND_ORIGIN || 'https://pathway-backend-892m.onrender.com', report = entry => console.error(JSON.stringify(entry))) {
  const upstream = new URL(origin);
  if (upstream.protocol !== 'https:' || upstream.username || upstream.password || upstream.pathname !== '/') throw Error('PATHWAY_BACKEND_ORIGIN must be an HTTPS origin.');
  return (req, res) => {
    if (!/^\/(auth|applicant|portal|admin|public|payments|files|health)(\/|\?|$)/.test(req.url) || /\\|%5c|%2f|(?:^|\/)\.\.(?:\/|$)/i.test(req.url)) return res.status(404).json({error:{message:'API route not found.'}});
    const started=Date.now();let clientGone=false;
    const failure=(status,code)=>{if(!clientGone)report({event:'backend_proxy_failure',method:req.method,path:req.url.split('?')[0],upstream:upstream.hostname,status,code,durationMs:Date.now()-started});};
    const headers = {};
    for (const name of ['accept','content-type','cookie','origin','x-csrf-token','x-payment-token','idempotency-key']) if (req.headers[name]) headers[name] = req.headers[name];
    headers['x-forwarded-for'] = req.ip;
    headers['x-forwarded-proto'] = req.protocol;
    const target = https.request({hostname:upstream.hostname,port:upstream.port || 443,path:req.url,method:req.method,headers}, response => {
      if((response.statusCode||502)>=500)failure(response.statusCode||502,'UPSTREAM_HTTP');
      res.status(response.statusCode || 502);
      for (const name of ['content-type','content-disposition','retry-after','x-request-id']) if (response.headers[name]) res.setHeader(name,response.headers[name]);
      res.setHeader('Cache-Control','no-store');
      if (response.headers['set-cookie']) {
        // Local HTTP development only. HTTPS production keeps Secure cookies intact.
        const localHttp = process.env.NODE_ENV !== 'production' && req.protocol === 'http' && ['localhost','127.0.0.1','[::1]'].includes(req.hostname);
        res.setHeader('Set-Cookie',response.headers['set-cookie'].map(value => localHttp ? value.replace(/;\s*Secure\b/gi,'') : value));
      }
      response.on('error',()=>res.destroy());
      response.pipe(res);
    });
    target.setTimeout(55000,()=>target.destroy(Error('Upstream timeout')));
    target.on('error',error=>{if(clientGone)return;failure(502,error.code||'UPSTREAM_CONNECTION');if(!res.headersSent)res.status(502).json({error:{message:'The school service is unavailable. Please try again shortly.'}});else res.destroy();});
    req.on('aborted',()=>{clientGone=true;target.destroy();});
    res.on('close',()=>{if(!res.writableEnded){clientGone=true;target.destroy();}});
    req.pipe(target);
  };
}
module.exports = {liveApiProxy};
