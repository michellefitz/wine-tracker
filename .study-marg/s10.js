const { boot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  await page.goto('http://localhost:3210/wine/e5979506-2c5d-4706-b01d-fa3adaaa383e/edit');
  await page.waitForTimeout(2500);
  await page.mouse.move(215,600);
  for (let i=0;i<7;i++){
    await page.screenshot({path:'/home/user/wine-tracker/.study-marg/06-edit-'+i+'.png'});
    await page.mouse.wheel(0,600);
    await page.waitForTimeout(500);
  }
  console.log('ok');
  await browser.close();
})();
