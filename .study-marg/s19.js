const { boot, shot } = require('./lib');
const PHOTO='/tmp/claude-0/-home-user-wine-tracker/51ac2fc6-2848-5945-9ad7-a1982f33d24f/scratchpad/study/bottle-photo.jpg';
(async()=>{
  const {browser,page} = await boot();
  await page.locator('a[href="/add"], button').filter({hasText:'+'}).first().click().catch(async()=>{
    await page.goto('http://localhost:3210/add');
  });
  await page.waitForTimeout(2500);
  console.log('URL', page.url());
  await shot(page,'16-add-start', true);
  console.log('ADD TEXT:\n'+await page.locator('body').innerText());
  console.log('FIELDS:', await page.evaluate(()=>[...document.querySelectorAll('input,textarea,select,button')].map(e=>e.tagName+'['+e.type+'] '+(e.name||'')+' "'+(e.placeholder||e.innerText||'').trim().slice(0,30)+'"').join(' | ')));
  await browser.close();
})();
