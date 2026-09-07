const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1600);};
  await tap(758*430/860, 52); // Grapes
  console.log('URL', page.url());
  await shot(page,'24-grapes-top');
  console.log((await page.evaluate(()=>document.body.innerText)).slice(0,2000));
  await page.mouse.wheel(0,900); await page.waitForTimeout(700); await shot(page,'25-grapes-2');
  await page.mouse.wheel(0,900); await page.waitForTimeout(700); await shot(page,'26-grapes-3');
  console.log('ERRS', errs.slice(0,8));
  await browser.close();
})();
