const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  // tap first red bottle
  const b = await page.evaluate(()=>{const e=document.querySelector('.rolodex'); const c=e.children[0]; const r=c.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x,y:b.y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(1400);
  await shot(page,'08-sheet-top');
  console.log('URL', page.url());
  // find scrollable sheet
  const sc = await page.evaluate(()=>{const out=[];document.querySelectorAll('*').forEach(el=>{if(el.scrollHeight>el.clientHeight+40 && el.clientHeight>300) out.push({cls:(el.className+'').slice(0,90),sh:el.scrollHeight,ch:el.clientHeight});});return out;});
  console.log('v-scrollers', JSON.stringify(sc));
  console.log('TEXT>>>\n' + (await page.evaluate(()=>document.body.innerText)).slice(0,3000));
  await browser.close();
})();
