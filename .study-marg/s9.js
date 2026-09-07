const { boot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  await page.goto('http://localhost:3210/wine/e5979506-2c5d-4706-b01d-fa3adaaa383e/edit');
  await page.waitForTimeout(2500);
  const r = await page.evaluate(()=>{
    const s=[...document.querySelectorAll('select')];
    return s.map(x=>({name:x.name, n:x.options.length, opts:[...x.options].map(o=>o.text)}));
  });
  console.log(JSON.stringify(r,null,1));
  await browser.close();
})();
