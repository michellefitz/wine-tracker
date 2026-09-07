const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  await page.goto('http://localhost:3210/map/it'); await page.waitForTimeout(2500);
  await shot(page,'31-map-it-after', true);
  console.log(await page.locator('body').innerText());
  await browser.close();
})();
