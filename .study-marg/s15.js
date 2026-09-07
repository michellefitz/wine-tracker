const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  for (const c of ['it','ar','fr']){
    await page.goto('http://localhost:3210/map/'+c); await page.waitForTimeout(2500);
    await shot(page,'12-map-'+c, true);
    console.log('=== /map/'+c+' ===');
    console.log(await page.locator('body').innerText());
  }
  await browser.close();
})();
