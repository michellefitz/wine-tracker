const { boot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  await page.getByLabel('Grid view').click(); await page.waitForTimeout(1500);
  console.log(await page.locator('body').innerText());
  await page.screenshot({path:'/home/user/wine-tracker/.study-marg/21-grid-after-add.png', fullPage:true});
  await browser.close();
})();
