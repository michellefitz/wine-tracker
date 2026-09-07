const { open, shot } = require('./helper.js');
(async () => {
  const { browser, page, errs } = await open();
  await page.goto('http://localhost:3210/map'); await page.waitForTimeout(2200);
  await shot(page,'50-map-after-adds');
  console.log('MAP:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,800));
  console.log('ERRS', JSON.stringify(errs.slice(0,10),null,1));
  await browser.close();
})();
