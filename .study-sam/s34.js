const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1400);};
  await tap(361,107); // grid view
  console.log('view is grid?', await page.evaluate(()=>document.body.innerText.includes('Colline')));
  await page.reload(); await page.waitForTimeout(1800);
  console.log('after reload, still grid?', await page.evaluate(()=>document.body.innerText.includes('Colline')));
  // studio shot
  await page.goto('http://localhost:3210/wine/e5979506-0000-0000-0000-000000000000').catch(()=>{});
  await page.goto('http://localhost:3210/'); await page.waitForTimeout(1400);
  await page.locator('input').first().fill('musar'); await page.waitForTimeout(900);
  await page.getByText('Musar Red').first().click(); await page.waitForTimeout(1800);
  await page.getByText('EDIT').first().click(); await page.waitForTimeout(1800);
  const has = await page.evaluate(()=>document.body.innerText.includes('Make a studio shot'));
  console.log('studio shot option present on wine w/o photo?', has);
  if(!has){ console.log('PHOTO AREA TEXT:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,300)); }
  await shot(page,'55-edit-nophoto');
  console.log('ERRS', JSON.stringify(errs.slice(0,8)));
  await browser.close();
})();
