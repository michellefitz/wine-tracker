const { boot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  for (let i=0;i<5;i++){
    await page.goto('http://localhost:3210'); await page.waitForTimeout(2000);
    console.log('reload',i,'count=', await page.locator('a[href^="/wine/"]').count());
  }
  await page.goto('http://localhost:3210/add'); await page.waitForTimeout(2000);
  await page.goto('http://localhost:3210'); await page.waitForTimeout(2000);
  console.log('after visiting /add:', await page.locator('a[href^="/wine/"]').count());
  await page.getByLabel('Grid view').click(); await page.waitForTimeout(1500);
  console.log((await page.locator('body').innerText()).replace(/\n\n/g,' ').replace(/\n/g,' | ').slice(0,1400));
  await browser.close();
})();
