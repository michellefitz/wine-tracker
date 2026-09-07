const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const b = await page.evaluate(()=>{const e=document.querySelector('.rolodex'); const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height};});
  const y = b.y + b.h/2;
  let x = b.x + b.w - 50;
  await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x, y}]});
  for (let i=1;i<=12;i++){ await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x: x-i*20, y}]}); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
  await page.waitForTimeout(900);
  console.log('after CDP touch swipe', await page.evaluate(()=>{const e=document.querySelector('.rolodex');return {sl:e.scrollLeft,sw:e.scrollWidth,cw:e.clientWidth};}));
  await shot(page,'05-red-row-after-real-swipe');
  console.log('ERRS', errs.slice(0,5));
  await browser.close();
})();
