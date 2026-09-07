const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1300);};
  const openBottle = async (rowIdx, childIdx) => {
    const b = await page.evaluate(([r,c])=>{const el=document.querySelectorAll('.rolodex')[r]; const ch=el.children[c]; ch.scrollIntoView({block:'center'}); const rr=ch.getBoundingClientRect(); return {x:rr.x+rr.width/2,y:rr.y+rr.height/2};},[rowIdx,childIdx]);
    await tap(b.x,b.y);
  };
  const swipe = async(n)=>{for(let k=0;k<n;k++){let y=750;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:215,y}]});for(let i=1;i<=15;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:215,y:y-i*40}]});await page.waitForTimeout(16);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(600);}};
  // White row = index 1, second bottle (Vinho Verde)
  await openBottle(1,1);
  await shot(page,'13-white-top');
  console.log('WHITE TEXT>>>\n'+(await page.evaluate(()=>document.querySelector('.overflow-y-auto.overscroll-contain').innerText)));
  await swipe(3); await shot(page,'14-white-mid');
  await tap(215,60); // close
  // sparkling row index 2
  await openBottle(2,0);
  await shot(page,'15-sparkling-top');
  console.log('\nSPARKLING TEXT>>>\n'+(await page.evaluate(()=>document.querySelector('.overflow-y-auto.overscroll-contain').innerText)));
  await swipe(3); await shot(page,'16-sparkling-mid');
  console.log('ERRS', errs.slice(0,6));
  await browser.close();
})();
