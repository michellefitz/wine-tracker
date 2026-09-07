const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1500);};
  await page.goto('http://localhost:3210/wine/bcaeace0-e5aa-48f6-8be8-a64096fe4182'); await page.waitForTimeout(2200);
  await shot(page,'37-newwine-direct');
  await tap(215,60); // close sheet
  console.log('URL after closing sheet', page.url());
  await shot(page,'38-after-close-newwine');
  // check list
  await page.goto('http://localhost:3210/'); await page.waitForTimeout(1800);
  await tap(361,107); // grid view
  await shot(page,'39-list-with-new-wine');
  console.log('LIST:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,900));
  console.log('ERRS', JSON.stringify(errs.slice(0,8)));
  await browser.close();
})();
