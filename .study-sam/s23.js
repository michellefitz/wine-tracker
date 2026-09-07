const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1500);};
  await page.goto('http://localhost:3210/grapes'); await page.waitForTimeout(1500);
  console.log('GRAPES PAGE:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,900));
  // find the unopened wine via search
  await page.goto('http://localhost:3210/'); await page.waitForTimeout(1500);
  for (const q of ['unopened','not opened','rioja crianza','campo','lidl','in the house','loved','loved it','favourite','best']) {
    await page.locator('input').first().fill(q); await page.waitForTimeout(900);
    const r = (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').replace('Cellar Notes | Map | Grapes | ','');
    console.log('"'+q+'" -> '+r.slice(0,220));
  }
  await shot(page,'46-search-unopened');
  console.log('ERRS', JSON.stringify(errs.slice(0,8)));
  await browser.close();
})();
