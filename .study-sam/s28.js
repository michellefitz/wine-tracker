const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1400);};
  await page.goto('http://localhost:3210/'); await page.waitForTimeout(1500);
  await tap(361,107);
  const links = await page.evaluate(()=>[...document.querySelectorAll('a[href^="/wine/"]')].map(a=>a.getAttribute('href').slice(6,14)+' '+a.innerText.replace(/\n+/g,' / ')));
  console.log('TOTAL CARDS', links.length); links.forEach(l=>console.log('  '+l));
  console.log('ERRS', JSON.stringify(errs.slice(0,6)));
  await browser.close();
})();
