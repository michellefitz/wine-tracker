const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  await page.goto('http://localhost:3210/add'); await page.waitForTimeout(1500);
  await page.setInputFiles('input[type=file]','/tmp/claude-0/-home-user-wine-tracker/51ac2fc6-2848-5945-9ad7-a1982f33d24f/scratchpad/study/bottle-photo.jpg');
  await page.waitForTimeout(4000);
  // screenshot whole form by scrolling
  for (let i=0;i<7;i++){ await page.evaluate(()=>window.scrollBy(0,830)); await page.waitForTimeout(500); await shot(page,'34-form-'+i); }
  await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(400);
  console.log('scrollHeight', await page.evaluate(()=>document.body.scrollHeight));
  await browser.close();
})();
