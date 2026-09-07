const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1600);};
  await tap(215, 884); // the + FAB
  console.log('URL', page.url());
  await shot(page,'30-add-step1');
  console.log('TEXT>>>\n'+(await page.evaluate(()=>document.body.innerText)).slice(0,1500));
  const els = await page.evaluate(()=>[...document.querySelectorAll('button,input,textarea,select,label')].map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,type:e.type,t:(e.innerText||e.placeholder||'').trim().slice(0,40),x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),w:Math.round(r.width),h:Math.round(r.height)};}));
  console.log('ELS', JSON.stringify(els,null,0));
  console.log('ERRS', errs.slice(0,8));
  await browser.close();
})();
