const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1600);};
  await page.goto('http://localhost:3210/wine/bcaeace0-e5aa-48f6-8be8-a64096fe4182'); await page.waitForTimeout(2200);
  await page.getByText('EDIT').first().click(); await page.waitForTimeout(2000);
  console.log('EDIT URL', page.url());
  await shot(page,'40-edit-top');
  console.log((await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,500));
  await page.getByText("Didn't like it",{exact:true}).click(); await page.waitForTimeout(400);
  // set bought at
  await page.selectOption('#source','Tesco').catch(e=>console.log('no source select', e.message.slice(0,80)));
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight)); await page.waitForTimeout(500);
  await shot(page,'41-edit-bottom');
  console.log('save buttons:', await page.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean)));
  const saveBtn = page.getByText(/SAVE|UPDATE|ADD TO THE LOG/i).last();
  await saveBtn.click(); await page.waitForTimeout(3500);
  console.log('after save URL', page.url());
  await shot(page,'42-after-edit-save');
  console.log((await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,600));
  console.log('ERRS', JSON.stringify(errs.slice(0,8)));
  await browser.close();
})();
