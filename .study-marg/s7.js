const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  await page.goto('http://localhost:3210/wine/e5979506-2c5d-4706-b01d-fa3adaaa383e/edit');
  await page.waitForTimeout(2500);
  const sheet = await page.evaluate(()=>{
    const els=[...document.querySelectorAll('input,textarea,select,button')];
    return els.map(e=>({tag:e.tagName,type:e.type,name:e.name||e.id,ph:e.placeholder,val:(e.value||'').slice(0,50),txt:e.innerText?e.innerText.trim().slice(0,40):''}));
  });
  console.log(JSON.stringify(sheet,null,0));
  // try scrolling inside the sheet
  const box = await page.evaluate(()=>{
    // find scrollable containers
    return [...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+20 && e.clientHeight>200).map(e=>e.tagName+'.'+e.className.toString().slice(0,60)+' sh='+e.scrollHeight+' ch='+e.clientHeight);
  });
  console.log('SCROLLABLE:', box);
  await browser.close();
})();
