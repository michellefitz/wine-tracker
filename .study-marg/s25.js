const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  const ids = await page.evaluate(()=>[...document.querySelectorAll('a[href^="/wine/"]')].map(a=>a.getAttribute('href')));
  for (const h of ids.slice(0,3)){
    await page.goto('http://localhost:3210'+h); await page.waitForTimeout(1600);
    console.log('=== '+h+' ===');
    console.log(await page.locator('body').innerText());
    await shot(page,'20-extra-'+h.slice(6,12), true);
  }
  await browser.close();
})();
