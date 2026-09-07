const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  const before = await page.locator('a[href^="/wine/"]').count();
  const ids = await page.evaluate(()=>[...document.querySelectorAll('a[href^="/wine/"]')].map(a=>a.getAttribute('href')));
  let target=null;
  for (const h of ids){ await page.goto('http://localhost:3210'+h); await page.waitForTimeout(800);
    const t=await page.locator('body').innerText(); if(t.includes('CAMPO VIEJO')){target=h;break;} }
  console.log('before', before, 'target', target);
  await page.goto('http://localhost:3210'+target); await page.waitForTimeout(1500);
  await page.getByText('DELETE THIS ENTRY').click(); await page.waitForTimeout(1500);
  await page.locator('button').nth(1).click({force:true});
  await page.waitForTimeout(4000);
  console.log('URL after delete:', page.url());
  await shot(page,'28-after-delete', true);
  await page.goto('http://localhost:3210'); await page.waitForTimeout(2500);
  console.log('after count', await page.locator('a[href^="/wine/"]').count());
  const r = await page.goto('http://localhost:3210'+target); await page.waitForTimeout(2000);
  console.log('deleted url status:', r&&r.status(), '|', (await page.locator('body').innerText()).replace(/\n+/g,' / ').slice(0,160));
  await browser.close();
})();
