const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1600);};
  await page.goto('http://localhost:3210/map'); await page.waitForTimeout(1800);
  // tap Italy landmass on map (dots near 217,268)
  await tap(217,268);
  await shot(page,'21-map-tap-italy-dot');
  console.log('after dot tap URL', page.url());
  console.log((await page.evaluate(()=>document.body.innerText)).slice(0,900));
  console.log('---- now zoom in');
  await tap(386,247); await tap(386,247);
  await shot(page,'22-map-zoomed');
  await page.goto('http://localhost:3210/map'); await page.waitForTimeout(1500);
  await tap(215,464); // Italy row
  await page.waitForTimeout(1200);
  console.log('after Italy row URL', page.url());
  await shot(page,'23-map-italy-country');
  console.log((await page.evaluate(()=>document.body.innerText)).slice(0,1200));
  console.log('ERRS', errs.slice(0,8));
  await browser.close();
})();
