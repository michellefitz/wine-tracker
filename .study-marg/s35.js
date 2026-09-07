const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  await page.goto('http://localhost:3210/wine/e5979506-2c5d-4706-b01d-fa3adaaa383e/edit'); await page.waitForTimeout(2500);
  // record drinking window, decant, merchant, food
  await page.locator('#notes').fill("Tastes like a Barolo that got away with it. Dried roses, tar, sour cherry. || Drink 2026-2034. Decant 90 min. Bought: Il Sorpasso, Novara, Oct 2021, EUR 24. Ate: brasato al Barolo. 3 bottles left. NOT Barolo - Colline Novaresi DOC, Boca side.");
  const opts = await page.locator('#source').evaluate(s=>[...s.options].map(o=>o.text).join(','));
  console.log('BOUGHT AT options:', opts);
  await page.locator('#source').selectOption({label:'Other'});
  await page.locator('#region').fill('Alto Piemonte');
  await page.waitForTimeout(400);
  await shot(page,'29-edit-attempt', true);
  await page.getByText('SAVE CHANGES').click(); await page.waitForTimeout(4000);
  console.log('URL', page.url());
  await shot(page,'30-after-edit', true);
  console.log(await page.locator('body').innerText());
  await browser.close();
})();
