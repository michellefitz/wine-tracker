const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1500);};
  await page.goto('http://localhost:3210/add'); await page.waitForTimeout(1600);
  await shot(page,'30-add-step1');
  await page.setInputFiles('input[type=file]','/tmp/claude-0/-home-user-wine-tracker/51ac2fc6-2848-5945-9ad7-a1982f33d24f/scratchpad/study/bottle-photo.jpg');
  await page.waitForTimeout(2000); await shot(page,'31-after-upload');
  console.log('t+2s:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,600));
  await page.waitForTimeout(9000); await shot(page,'32-after-upload-11s');
  console.log('t+11s:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,900));
  await page.waitForTimeout(12000); await shot(page,'33-after-upload-23s');
  console.log('t+23s:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,1500));
  console.log('URL', page.url());
  console.log('ERRS', JSON.stringify(errs.slice(0,10),null,1));
  await browser.close();
})();
