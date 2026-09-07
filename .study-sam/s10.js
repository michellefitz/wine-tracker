const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1500);};
  await tap(318,52); // Map
  console.log('URL', page.url());
  await shot(page,'20-map');
  console.log('MAP TEXT>>>\n'+(await page.evaluate(()=>document.body.innerText)).slice(0,1200));
  const clickable = await page.evaluate(()=>[...document.querySelectorAll('button,[role=button],a,path,circle')].map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,t:(e.innerText||'').trim().slice(0,25),aria:e.getAttribute('aria-label'),x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),w:Math.round(r.width),h:Math.round(r.height)};}).filter(e=>e.w>5&&e.h>5).slice(0,30));
  console.log('CLICKABLES', JSON.stringify(clickable));
  console.log('ERRS', errs.slice(0,8));
  await browser.close();
})();
