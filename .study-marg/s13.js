const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  await page.getByLabel('Grid view').click(); await page.waitForTimeout(1500);
  await shot(page,'09-gridview', true);
  console.log('GRID TEXT:', (await page.locator('body').innerText()).slice(0,600));
  await page.getByLabel('Gallery view').click(); await page.waitForTimeout(1500);
  await shot(page,'10-galleryview', true);
  console.log('GALLERY TEXT:', (await page.locator('body').innerText()).slice(0,600));
  // reload to see if persisted
  await page.reload(); await page.waitForTimeout(2000);
  console.log('AFTER RELOAD:', (await page.locator('body').innerText()).slice(0,200));
  await browser.close();
})();
