const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1200);};
  const btns = await page.evaluate(()=>[...document.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return {t:b.innerText.trim().slice(0,30), aria:b.getAttribute('aria-label'), title:b.title, x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),w:Math.round(r.width)};}).filter(b=>b.w>0));
  console.log(JSON.stringify(btns,null,1));
  // tap the right-hand icon (list view)
  await tap(395, 107);
  await shot(page,'17-icon-right-tapped');
  console.log('TEXT after right icon:\n'+(await page.evaluate(()=>document.body.innerText)).slice(0,1200));
  await tap(361, 107);
  await shot(page,'18-icon-left-tapped');
  console.log('ERRS', errs.slice(0,6));
  await browser.close();
})();
