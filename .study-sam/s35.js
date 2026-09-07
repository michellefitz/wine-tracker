const { open, shot } = require('./helper.js');
(async () => {
  const { browser, page, errs } = await open();
  await page.goto('http://localhost:3210/'); await page.waitForTimeout(1400);
  await page.locator('input').first().fill('musar'); await page.waitForTimeout(900);
  await page.getByText('Musar Red').first().click(); await page.waitForTimeout(1800);
  await page.getByText('EDIT').first().click(); await page.waitForTimeout(1800);
  await page.getByText('Make a studio shot').click(); await page.waitForTimeout(6000);
  await shot(page,'56-studio-shot-fail');
  console.log((await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,400));
  console.log('ERRS', JSON.stringify(errs.slice(0,6)));
  await browser.close();
})();
