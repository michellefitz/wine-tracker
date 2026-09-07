const { open, shot } = require('./helper.js');
(async () => {
  const { browser, page, errs } = await open();
  // find horizontally scrollable rows
  const info = await page.evaluate(() => {
    const out=[];
    document.querySelectorAll('*').forEach(el=>{ if(el.scrollWidth>el.clientWidth+30 && el.clientWidth>200) out.push({tag:el.tagName, cls:(el.className+'').slice(0,80), sw:el.scrollWidth, cw:el.clientWidth}); });
    return out;
  });
  console.log('h-scrollers:', JSON.stringify(info));
  // swipe the red row
  const row = page.locator('div').filter({has: page.locator('img,svg')}).first();
  const box = await page.evaluate(() => {
    const el=[...document.querySelectorAll('*')].find(e=>e.scrollWidth>e.clientWidth+30 && e.clientWidth>200);
    if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height};
  });
  console.log('row box', JSON.stringify(box));
  if (box) {
    await page.mouse.move(box.x+box.w-40, box.y+box.h/2);
    await page.mouse.down();
    for(let i=0;i<12;i++){ await page.mouse.move(box.x+box.w-40-i*25, box.y+box.h/2); await page.waitForTimeout(20); }
    await page.mouse.up();
    await page.waitForTimeout(900);
    await shot(page,'05-red-row-swiped');
    const pos = await page.evaluate(() => {const el=[...document.querySelectorAll('*')].find(e=>e.scrollWidth>e.clientWidth+30 && e.clientWidth>200); return el?el.scrollLeft:null;});
    console.log('scrollLeft after swipe', pos);
  }
  console.log('ERRS', errs.slice(0,5));
  await browser.close();
})();
