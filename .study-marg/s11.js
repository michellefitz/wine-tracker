const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  const inp = page.getByPlaceholder(/Search/);
  for (const q of ['nebbiolo','Piemonte','Barolo','tar','lopez','López','riesl','italy','loved']){
    await inp.fill(q); await page.waitForTimeout(1200);
    const n = await page.locator('a[href^="/wine/"]').count();
    const t = await page.locator('body').innerText();
    console.log(`q="${q}" -> ${n} results | sections: ${t.replace(/\n/g,'/').slice(0,120)}`);
  }
  await inp.fill('nebbiolo'); await page.waitForTimeout(1000);
  await shot(page,'07-search-nebbiolo');
  await inp.fill('zzzz'); await page.waitForTimeout(1000);
  await shot(page,'08-search-empty');
  console.log('EMPTY STATE:', await page.locator('body').innerText());
  await browser.close();
})();
