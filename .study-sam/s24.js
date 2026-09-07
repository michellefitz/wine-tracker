const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1500);};
  await page.goto('http://localhost:3210/'); await page.waitForTimeout(1500);
  await tap(361,107); // grid
  const cards = await page.evaluate(()=>{const t=document.body.innerText; return t;});
  const names = cards.split('\n').filter(l=>/^(LOVED|LIKED|DIDN'T LIKE|UNOPENED|REALLY DISLIKED)$/.test(l.trim()));
  console.log('card count', names.length, names.join(','));
  await page.goto('http://localhost:3210/map'); await page.waitForTimeout(1500);
  console.log('MAP intro:', (await page.evaluate(()=>document.body.innerText)).split('\n').filter(Boolean)[3]);
  console.log('MAP countries:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(250,700));
  // search for sangiovese
  await page.goto('http://localhost:3210/'); await page.waitForTimeout(1400);
  await page.locator('input').first().fill('sangiovese'); await page.waitForTimeout(1000);
  console.log('sangiovese search:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | '));
  console.log('ERRS', JSON.stringify(errs.slice(0,8)));
  await browser.close();
})();
