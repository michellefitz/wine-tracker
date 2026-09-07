const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(900);};
  await page.goto('http://localhost:3210/add'); await page.waitForTimeout(1500);
  await page.setInputFiles('input[type=file]','/tmp/claude-0/-home-user-wine-tracker/51ac2fc6-2848-5945-9ad7-a1982f33d24f/scratchpad/study/bottle-photo.jpg');
  await page.waitForTimeout(4000);
  const fields = await page.evaluate(()=>[...document.querySelectorAll('input,textarea,select')].map((e,i)=>({i,tag:e.tagName,type:e.type,ph:e.placeholder,name:e.name,id:e.id, val:e.value})));
  console.log(JSON.stringify(fields,null,1));
  console.log('ERRS', errs.slice(0,8));
  await browser.close();
})();
