const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  for (const g of ['nebbiolo','chardonnay','cortese']){
    await page.goto('http://localhost:3210/grape/'+g); await page.waitForTimeout(2500);
    await shot(page,'14-grape-'+g, true);
    console.log('=== '+g+' ===');
    console.log(await page.locator('body').innerText());
  }
  await page.goto('http://localhost:3210/labels'); await page.waitForTimeout(2500);
  await shot(page,'15-labels', true);
  console.log('=== /labels ==='); console.log((await page.locator('body').innerText()).slice(0,1500));
  await browser.close();
})();
