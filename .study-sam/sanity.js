const { open, shot } = require('./helper.js');
(async () => {
  const { browser, page, errs } = await open();
  for (const u of ['/','/map','/grapes','/add','/grape/malbec']) {
    await page.goto('http://localhost:3210'+u); await page.waitForTimeout(1500);
    const t = await page.evaluate(()=>document.body.innerText.replace(/\n+/g,' ').slice(0,70));
    console.log(u.padEnd(16), '|', t);
  }
  console.log('ERRS', JSON.stringify(errs.slice(0,6)));
  await browser.close();
})();
