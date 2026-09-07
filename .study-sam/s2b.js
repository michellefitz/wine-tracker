const { open, shot } = require('./helper.js');
(async () => {
  const { browser, page, errs } = await open();
  const sel = () => page.evaluate(()=>{const e=[...document.querySelectorAll('.rolodex')][0]; return {sl:e.scrollLeft, sw:e.scrollWidth, cw:e.clientWidth};});
  console.log('before', await sel());
  // real touch swipe via CDP-ish dispatch
  await page.evaluate(() => {
    const el = document.querySelector('.rolodex');
    const r = el.getBoundingClientRect();
    const y = r.y + r.height/2;
    const mk = (type, x) => {
      const t = new Touch({identifier:1, target:el, clientX:x, clientY:y, pageX:x, pageY:y});
      el.dispatchEvent(new TouchEvent(type, {touches:type==='touchend'?[]:[t], targetTouches:type==='touchend'?[]:[t], changedTouches:[t], bubbles:true, cancelable:true}));
    };
    mk('touchstart', r.x + r.width - 40);
    for (let i=1;i<=10;i++) mk('touchmove', r.x + r.width - 40 - i*25);
    mk('touchend', r.x + r.width - 290);
  });
  await page.waitForTimeout(800);
  console.log('after touch swipe', await sel());
  await shot(page,'05-red-row-touchswipe');
  // also try pointer events sequence
  const box = await page.evaluate(()=>{const e=document.querySelector('.rolodex'); const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height};});
  await page.evaluate((b) => {
    const el = document.querySelector('.rolodex');
    const y=b.y+b.h/2;
    const pe=(type,x)=>el.dispatchEvent(new PointerEvent(type,{pointerId:1,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true,buttons:type==='pointerup'?0:1}));
    pe('pointerdown', b.x+b.w-40);
    for(let i=1;i<=10;i++) pe('pointermove', b.x+b.w-40-i*25);
    pe('pointerup', b.x+b.w-290);
  }, box);
  await page.waitForTimeout(800);
  console.log('after pointer swipe', await sel());
  await shot(page,'06-red-row-pointerswipe');
  // programmatic scroll to confirm it CAN scroll
  await page.evaluate(()=>{document.querySelector('.rolodex').scrollLeft = 200;});
  await page.waitForTimeout(500);
  console.log('after programmatic', await sel());
  await shot(page,'07-red-row-programmatic');
  console.log('ERRS', errs.slice(0,5));
  await browser.close();
})();
