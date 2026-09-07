const { boot, shot } = require('./lib');
const PHOTO='/tmp/claude-0/-home-user-wine-tracker/51ac2fc6-2848-5945-9ad7-a1982f33d24f/scratchpad/study/bottle-photo.jpg';
(async()=>{
  const {browser,page} = await boot();
  await page.goto('http://localhost:3210/add'); await page.waitForTimeout(2000);
  await page.locator('input[type=file]').setInputFiles(PHOTO);
  for (let i=0;i<8;i++){
    await page.waitForTimeout(2000);
    await page.screenshot({path:'/home/user/wine-tracker/.study-marg/17-add-'+i+'.png'});
    const t = await page.locator('body').innerText();
    console.log('--- t='+(i*2)+'s url='+page.url()+' ---');
    console.log(t.replace(/\n+/g,' / ').slice(0,500));
  }
  console.log('FIELDS:', await page.evaluate(()=>[...document.querySelectorAll('input,textarea,select')].map(e=>e.name+'='+JSON.stringify(e.value)).join(' | ')));
  await page.screenshot({path:'/home/user/wine-tracker/.study-marg/17-add-final-full.png', fullPage:true});
  await browser.close();
})();
