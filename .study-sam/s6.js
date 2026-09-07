const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(900);};
  const open1 = async (rowIdx, childIdx) => {
    const b = await page.evaluate(([r,c])=>{const el=document.querySelectorAll('.rolodex')[r]; const ch=el.children[c]; ch.scrollIntoView({block:'center'}); const rr=ch.getBoundingClientRect(); return {x:rr.x+rr.width/2,y:rr.y+rr.height/2};},[rowIdx,childIdx]);
    await tap(b.x,b.y);
  };
  const sheetOpen = () => page.evaluate(()=>!!document.querySelector('.overflow-y-auto.overscroll-contain'));
  await open1(0,0); await page.waitForTimeout(600);
  console.log('sheet open?', await sheetOpen());
  // try tapping the backdrop above the sheet
  await tap(215, 60);
  console.log('after tap top backdrop, sheet open?', await sheetOpen());
  await shot(page,'11-after-backdrop-tap');
  if (await sheetOpen()) { await page.keyboard.press('Escape'); await page.waitForTimeout(800); console.log('after Escape, open?', await sheetOpen()); }
  if (await sheetOpen()) {
    // swipe down on handle
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:215,y:175}]});
    for(let i=1;i<=15;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:215,y:175+i*40}]});await page.waitForTimeout(16);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await page.waitForTimeout(900);
    console.log('after handle drag down, open?', await sheetOpen());
  }
  await shot(page,'12-after-close-attempts');
  console.log('ERRS', errs.slice(0,6));
  await browser.close();
})();
