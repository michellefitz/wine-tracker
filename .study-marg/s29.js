const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  const inp = page.getByPlaceholder(/Search/);
  for (const q of ['unopened','not opened','cellar','2019','nebbiolo','sangiovese','barolo','san guido','tenuta']){
    await inp.fill(q); await page.waitForTimeout(1100);
    const n = await page.locator('a[href^="/wine/"]').count();
    console.log(`"${q}" -> ${n}`);
  }
  await inp.fill(''); await page.waitForTimeout(800);
  // any sort/filter controls?
  console.log('CONTROLS:', await page.evaluate(()=>[...document.querySelectorAll('button,select,[role=tab]')].map(b=>(b.getAttribute('aria-label')||b.innerText||b.tagName).trim().slice(0,30)).join(' | ')));
  // Grapes page nebbiolo count
  await page.goto('http://localhost:3210/grapes'); await page.waitForTimeout(2000);
  await shot(page,'25-grapes-after', true);
  console.log('GRAPES:', await page.locator('body').innerText());
  await browser.close();
})();
