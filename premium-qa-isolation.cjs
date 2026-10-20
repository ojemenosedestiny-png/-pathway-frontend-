// Test process only: never forward a QA request to the deployed API.
const proxy=require('./live-api-proxy.cjs');
proxy.liveApiProxy=()=>((req,res)=>{
 if(req.path==='/auth/csrf'){res.cookie('csrf','fixture',{httpOnly:true});return res.json({csrfToken:'fixture'});}
 if(req.method!=='GET')return res.status(403).json({error:{code:'TEST_ISOLATION',message:'External writes are disabled in this QA process.'}});
 if(req.path==='/auth/session'||req.path==='/auth/refresh')return res.status(401).json({error:{code:'AUTH_REQUIRED',message:'Sign in to continue.'}});
 if(req.path==='/public/content')return res.json([]);
 if(req.path==='/public/countries')return res.json([{id:'fixture-country',name:'United Kingdom'}]);
 if(req.path==='/public/universities')return res.json([{id:'fixture-university',name:'Test university',countryId:'fixture-country',featured:true,active:true,description:'QA fixture only',tuitionMinor:'0'}]);
 return res.json([]);
});
const {chromium}=require('playwright');const launch=chromium.launch.bind(chromium);
chromium.launch=async options=>{const browser=await launch({...options,headless:true});const newContext=browser.newContext.bind(browser);browser.newContext=async options=>newContext({...options,baseURL:process.env.UI_BASE_URL});return browser;};
