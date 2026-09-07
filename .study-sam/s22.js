const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  const tap = async (x,y)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1500);};
  // does the EDIT form have an alcohol field?
  await page.goto('http://localhost:3210/wine/bcaeace0-e5aa-48f6-8be8-a64096fe4182/edit').catch(()=>{});
  await page.waitForTimeout(1500);
  await page.goto('http://localhost:3210/wine/bcaeace0-e5aa-48f6-8be8-a64096fe4182'); await page.waitForTimeout(2000);
  await page.getByText('EDIT').first().click(); await page.waitForTimeout(1800);
  console.log('EDIT FIELDS:', await page.evaluate(()=>[...document.querySelectorAll('input,select,textarea')].map(e=>e.id||e.type)));
  console.log('has alcohol label?', await page.evaluate(()=>/ALCOHOL/i.test(document.body.innerText)));
  // STEP 9: unopened wine
  await page.goto('http://localhost:3210/add'); await page.waitForTimeout(1500);
  await page.getByText("Skip — I'll type it in").click(); await page.waitForTimeout(1200);
  await shot(page,'43-add-skip-photo');
  await page.fill('#name','Rioja Crianza');
  await page.fill('#producer','Campo Viejo');
  await page.getByText('Not opened yet',{exact:true}).click();
  await page.selectOption('#wine-type','Red');
  await page.fill('#country','Spain'); await page.fill('#price','9');
  await page.selectOption('#source','Lidl');
  await page.waitForTimeout(400);
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight)); await page.waitForTimeout(400);
  await shot(page,'44-unopened-form-bottom');
  console.log('DRANK field visible while Not-opened?', await page.evaluate(()=>{const e=document.querySelector('#drank-on'); return e? {present:true, val:e.value, visible:e.offsetParent!==null}:{present:false};}));
  await page.getByText('ADD TO THE LOG').click(); await page.waitForTimeout(3500);
  console.log('saved unopened URL', page.url());
  await shot(page,'45-unopened-saved');
  console.log((await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,700));
  console.log('ERRS', JSON.stringify(errs.slice(0,8)));
  await browser.close();
})();
