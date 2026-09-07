const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  // find the phantom Campo Viejo
  const ids = await page.evaluate(()=>[...document.querySelectorAll('a[href^="/wine/"]')].map(a=>a.getAttribute('href')));
  let target=null;
  for (const h of ids){ await page.goto('http://localhost:3210'+h); await page.waitForTimeout(1000);
    const t=await page.locator('body').innerText(); if(t.includes('CAMPO VIEJO')){target=h;break;} }
  console.log('deleting', target);
  const before = ids.length;
  await page.goto('http://localhost:3210'+target); await page.waitForTimeout(1500);
  await page.getByText('DELETE THIS ENTRY').click();
  await page.waitForTimeout(1200);
  await shot(page,'26-delete-confirm', true);
  console.log('AFTER CLICK BODY TAIL:', (await page.locator('body').innerText()).slice(-500));
  console.log('DIALOGS:', await page.evaluate(()=>[...document.querySelectorAll('[role=dialog],dialog')].map(d=>d.innerText).join('||')));
  await page.waitForTimeout(2500);
  console.log('URL now:', page.url());
  await page.goto('http://localhost:3210'); await page.waitForTimeout(2000);
  const after = await page.locator('a[href^="/wine/"]').count();
  console.log('before',before,'after',after);
  await browser.close();
})();
