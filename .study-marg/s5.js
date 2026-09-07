const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  await page.goto('http://localhost:3210/wine/e5979506-2c5d-4706-b01d-fa3adaaa383e');
  await page.waitForTimeout(1500);
  const before = await page.locator('body').innerText();
  await page.getByText('REFRESH').click();
  await page.waitForTimeout(4000);
  await shot(page,'02-after-refresh', true);
  const after = await page.locator('body').innerText();
  console.log('ABOUT BEFORE:', (before.match(/REFRESH\n\n([^\n]*)/)||[])[1]);
  console.log('ABOUT AFTER :', (after.match(/REFRESH\n\n([^\n]*)/)||[])[1]);
  console.log('CHANGED:', before!==after);
  console.log('DIFF SNIPPET:', after.slice(after.indexOf('About this bottle'), after.indexOf('About this bottle')+400));
  // now edit page
  await page.goto('http://localhost:3210/wine/e5979506-2c5d-4706-b01d-fa3adaaa383e');
  await page.waitForTimeout(1200);
  await page.getByText('EDIT').click();
  await page.waitForTimeout(2000);
  await shot(page,'03-edit-full', true);
  console.log('=== EDIT PAGE ===');
  console.log(await page.locator('body').innerText());
  console.log('=== FIELDS ===');
  console.log(await page.evaluate(()=>[...document.querySelectorAll('input,textarea,select')].map(e=>e.tagName+'['+(e.type||'')+'] name='+e.name+' ph="'+(e.placeholder||'')+'" val="'+(e.value||'').slice(0,40)+'"').join('\n')));
  await browser.close();
})();
