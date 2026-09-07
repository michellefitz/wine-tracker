const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  await page.goto('http://localhost:3210/wine/e5979506-2c5d-4706-b01d-fa3adaaa383e/edit');
  await page.waitForTimeout(2500);
  console.log('SOURCE OPTIONS:', await page.evaluate(()=>[...document.querySelectorAll('select[name="source"] option')].map(o=>o.text).join(' | ')));
  console.log('TYPE OPTIONS:', await page.evaluate(()=>[...document.querySelectorAll('select[name="wine-type"] option')].map(o=>o.text).join(' | ')));
  const form = page.locator('form').first();
  for (let i=0;i<5;i++){
    await page.screenshot({path:'/home/user/wine-tracker/.study-marg/05-edit-scroll-'+i+'.png'});
    await form.evaluate(f=>f.scrollBy(0,700));
    await page.waitForTimeout(400);
  }
  console.log('done');
  await browser.close();
})();
