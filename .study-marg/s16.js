const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  await page.getByText('Grapes').first().click(); await page.waitForTimeout(2500);
  console.log('URL', page.url());
  await shot(page,'13-grapes', true);
  console.log(await page.locator('body').innerText());
  console.log('LINKS:', await page.evaluate(()=>[...document.querySelectorAll('a')].map(a=>a.getAttribute('href')).join(' ')));
  await browser.close();
})();
