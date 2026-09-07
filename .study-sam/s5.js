const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  const swipeUp = async (dist) => {
    let y=750; await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:215,y}]});
    for(let i=1;i<=15;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:215,y:y-i*(dist/15)}]});await page.waitForTimeout(16);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await page.waitForTimeout(700);
  };
  const b = await page.evaluate(()=>{const c=document.querySelector('.rolodex').children[0]; const r=c.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2};});
  await tap(b.x,b.y); await page.waitForTimeout(1400);
  const st=()=>page.evaluate(()=>{const e=document.querySelector('.overflow-y-auto.overscroll-contain');return {st:e.scrollTop,sh:e.scrollHeight,ch:e.clientHeight, bodyScroll: window.scrollY};});
  console.log('start',await st());
  for(let i=1;i<=6;i++){ await swipeUp(600); console.log('after swipe'+i, await st()); await shot(page,'10-sheet-sw'+i); }
  console.log('ERRS', errs.slice(0,6));
  await browser.close();
})();
