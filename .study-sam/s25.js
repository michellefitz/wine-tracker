const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1500);};
  const count = async () => { await page.goto('http://localhost:3210/map'); await page.waitForTimeout(1400); return (await page.evaluate(()=>document.body.innerText)).match(/All (\d+) of your bottles/)[1]; };
  console.log('before count', await count());
  // find the Musar Red
  await page.goto('http://localhost:3210/'); await page.waitForTimeout(1400);
  await page.locator('input').first().fill('musar'); await page.waitForTimeout(1000);
  await page.getByText('Musar Red').click(); await page.waitForTimeout(1800);
  console.log('wine url', page.url());
  await page.getByText('EDIT').first().click(); await page.waitForTimeout(1800);
  await shot(page,'47-edit-musar');
  await page.getByText('Liked it',{exact:true}).click(); await page.waitForTimeout(400);
  await page.getByText('SAVE CHANGES').click(); await page.waitForTimeout(3500);
  await shot(page,'48-musar-after-edit');
  console.log('after edit url', page.url());
  console.log('rating now:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,260));
  console.log('after count', await count());
  await page.goto('http://localhost:3210/'); await page.waitForTimeout(1400);
  await page.locator('input').first().fill('musar'); await page.waitForTimeout(1000);
  console.log('musar search now:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | '));
  console.log('ERRS', JSON.stringify(errs.slice(0,8)));
  await browser.close();
})();
