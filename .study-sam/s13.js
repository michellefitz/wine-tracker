const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1800);};
  await page.goto('http://localhost:3210/grapes'); await page.waitForTimeout(1600);
  await tap(215, 563); // Malbec row
  console.log('URL', page.url());
  await shot(page,'27-grape-detail');
  console.log((await page.evaluate(()=>document.body.innerText)).slice(0,1600));
  await page.mouse.wheel(0,900); await page.waitForTimeout(700); await shot(page,'28-grape-detail-2');
  await page.mouse.wheel(0,900); await page.waitForTimeout(700); await shot(page,'29-grape-detail-3');
  console.log('ERRS', errs.slice(0,8));
  await browser.close();
})();
