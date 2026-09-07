const { open, shot } = require('/home/user/wine-tracker/.study-sam/helper.js');
(async () => {
  const { browser, page, errs } = await open();
  console.log('URL after login:', page.url());
  await shot(page, '01-home-top');
  const h = await page.evaluate(() => document.body.scrollHeight);
  console.log('page scrollHeight', h, 'inner', await page.evaluate(()=>window.innerHeight));
  await page.mouse.wheel(0, 700); await page.waitForTimeout(600);
  await shot(page, '02-home-scroll1');
  await page.mouse.wheel(0, 700); await page.waitForTimeout(600);
  await shot(page, '03-home-scroll2');
  await page.mouse.wheel(0, 900); await page.waitForTimeout(600);
  await shot(page, '04-home-scroll3');
  console.log('ERRS:', JSON.stringify(errs.slice(0,10), null, 1));
  await browser.close();
})();
