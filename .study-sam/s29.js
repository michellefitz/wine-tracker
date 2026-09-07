const { open, shot } = require('./helper.js');
const cnt = async (page) => { await page.goto('http://localhost:3210/'); await page.waitForTimeout(1500); return page.evaluate(()=>document.querySelectorAll('a[href^="/wine/"]').length); };
(async () => {
  const { browser, page, errs } = await open();
  console.log('A. baseline', await cnt(page));
  // 1) just open /add and cancel
  await page.goto('http://localhost:3210/add'); await page.waitForTimeout(1600);
  await page.getByText('CANCEL').click(); await page.waitForTimeout(1500);
  console.log('B. after open+cancel', await cnt(page));
  // 2) open /add, upload photo, cancel
  await page.goto('http://localhost:3210/add'); await page.waitForTimeout(1500);
  await page.setInputFiles('input[type=file]','/tmp/claude-0/-home-user-wine-tracker/51ac2fc6-2848-5945-9ad7-a1982f33d24f/scratchpad/study/bottle-photo.jpg');
  await page.waitForTimeout(5000);
  await page.getByText('CANCEL').click(); await page.waitForTimeout(1500);
  console.log('C. after upload+cancel', await cnt(page));
  // 3) open /add, skip, fill, save ONCE
  await page.goto('http://localhost:3210/add'); await page.waitForTimeout(1500);
  await page.getByText("Skip — I'll type it in").click(); await page.waitForTimeout(1200);
  await page.fill('#name','ZZTEST1'); await page.getByText('Liked it',{exact:true}).click();
  await page.getByText('ADD TO THE LOG').click(); await page.waitForTimeout(4000);
  const u = page.url(); console.log('created url', u);
  console.log('D. after one save', await cnt(page));
  // 4) edit that wine once
  await page.goto(u); await page.waitForTimeout(1800);
  await page.getByText('EDIT').first().click(); await page.waitForTimeout(1800);
  await page.getByText('Loved it',{exact:true}).click(); await page.waitForTimeout(300);
  await page.getByText('SAVE CHANGES').click(); await page.waitForTimeout(4000);
  console.log('E. after one edit-save', await cnt(page));
  await page.locator('input').first().fill('ZZTEST1'); await page.waitForTimeout(1000);
  console.log('ZZTEST1 hits:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | '));
  console.log('ERRS', JSON.stringify(errs.slice(0,8)));
  await browser.close();
})();
