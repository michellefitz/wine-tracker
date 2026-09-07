const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  await page.goto('http://localhost:3210/'); await page.waitForTimeout(1400);
  await page.locator('input').first().fill('chianti'); await page.waitForTimeout(1000);
  const links = await page.evaluate(()=>[...document.querySelectorAll('a')].map(a=>a.getAttribute('href')+' :: '+a.innerText.replace(/\n/g,' / ')));
  console.log(JSON.stringify(links,null,1));
  await shot(page,'49-two-chiantis');
  // now: add a wine WITH a photo, then edit it, and see if it duplicates
  await page.goto('http://localhost:3210/add'); await page.waitForTimeout(1400);
  await page.setInputFiles('input[type=file]','/tmp/claude-0/-home-user-wine-tracker/51ac2fc6-2848-5945-9ad7-a1982f33d24f/scratchpad/study/bottle-photo.jpg');
  await page.waitForTimeout(4000);
  await page.fill('#name','DUPTEST'); await page.getByText('Liked it',{exact:true}).click();
  await page.getByText('ADD TO THE LOG').click(); await page.waitForTimeout(3500);
  const url1 = page.url(); console.log('created', url1);
  const cnt = async()=>{await page.goto('http://localhost:3210/map');await page.waitForTimeout(1300);return (await page.evaluate(()=>document.body.innerText)).match(/All (\d+) of your bottles/)[1];};
  console.log('count after create', await cnt());
  await page.goto(url1); await page.waitForTimeout(1800);
  await page.getByText('EDIT').first().click(); await page.waitForTimeout(1800);
  await page.getByText('Loved it',{exact:true}).click(); await page.waitForTimeout(300);
  await page.getByText('SAVE CHANGES').click(); await page.waitForTimeout(3500);
  console.log('count after edit', await cnt());
  await page.goto('http://localhost:3210/'); await page.waitForTimeout(1300);
  await page.locator('input').first().fill('DUPTEST'); await page.waitForTimeout(1000);
  console.log('DUPTEST search:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | '));
  console.log('ERRS', JSON.stringify(errs.slice(0,8)));
  await browser.close();
})();
