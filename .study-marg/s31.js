const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  const before = await page.locator('a[href^="/wine/"]').count();
  const ids = await page.evaluate(()=>[...document.querySelectorAll('a[href^="/wine/"]')].map(a=>a.getAttribute('href')));
  let target=null;
  for (const h of ids){ await page.goto('http://localhost:3210'+h); await page.waitForTimeout(900);
    const t=await page.locator('body').innerText(); if(t.includes('CAMPO VIEJO')){target=h;break;} }
  if(!target){console.log('no campo viejo; using last'); target=ids[0];}
  await page.goto('http://localhost:3210'+target); await page.waitForTimeout(1500);
  await page.getByText('DELETE THIS ENTRY').click(); await page.waitForTimeout(1200);
  await shot(page,'27-delete-dialog');
  await page.getByText('DELETE', {exact:true}).click();
  await page.waitForTimeout(3500);
  console.log('URL after delete:', page.url());
  await shot(page,'28-after-delete', true);
  await page.goto('http://localhost:3210'); await page.waitForTimeout(2500);
  const after = await page.locator('a[href^="/wine/"]').count();
  console.log('before', before, 'after', after);
  await page.goto('http://localhost:3210'+target); await page.waitForTimeout(2000);
  console.log('deleted page now:', (await page.locator('body').innerText()).slice(0,200));
  await browser.close();
})();
