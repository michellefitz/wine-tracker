const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const inp = page.locator('input').first();
  for (const q of ['malbec','red','cheap','italy','sparkling','loved']) {
    await inp.fill(q); await page.waitForTimeout(1000);
    const t = await page.evaluate(()=>document.body.innerText.replace(/\n+/g,' | ').slice(0,400));
    console.log('QUERY "'+q+'" ->', t);
    await shot(page,'19-search-'+q);
  }
  console.log('ERRS', errs.slice(0,6));
  await browser.close();
})();
