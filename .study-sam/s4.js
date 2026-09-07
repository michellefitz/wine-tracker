const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  const b = await page.evaluate(()=>{const c=document.querySelector('.rolodex').children[0]; const r=c.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};});
  await tap(b.x,b.y); await page.waitForTimeout(1400);
  const sheetSel = await page.evaluate(()=>{const els=[...document.querySelectorAll('*')].filter(el=>el.scrollHeight>el.clientHeight+40 && el.clientHeight>300); return els.map(e=>(e.className+'').slice(0,60));});
  console.log('scrollers', sheetSel);
  for (let i=1;i<=6;i++){
    await page.evaluate(()=>{const el=[...document.querySelectorAll('*')].find(e=>e.scrollHeight>e.clientHeight+40 && e.clientHeight>300); el.scrollTop += 780;});
    await page.waitForTimeout(700);
    await shot(page,'09-sheet-'+i);
  }
  console.log('ERRS', errs.slice(0,6));
  await browser.close();
})();
