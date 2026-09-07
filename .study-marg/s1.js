const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  console.log('URL after login:', page.url());
  await shot(page,'01-home');
  await shot(page,'01-home-full', true);
  console.log('--- TEXT ---');
  console.log((await page.locator('body').innerText()).slice(0,3000));
  await browser.close();
})();
