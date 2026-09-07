const { boot } = require('./lib');
const PHOTO='/tmp/claude-0/-home-user-wine-tracker/51ac2fc6-2848-5945-9ad7-a1982f33d24f/scratchpad/study/bottle-photo.jpg';
(async()=>{
  const {browser,page} = await boot();
  await page.goto('http://localhost:3210/add'); await page.waitForTimeout(2000);
  await page.locator('input[type=file]').setInputFiles(PHOTO);
  await page.waitForTimeout(4000);
  console.log(await page.evaluate(()=>[...document.querySelectorAll('input,textarea,select')].map((e,i)=>{
    let lab=''; let p=e.closest('div'); if(p&&p.parentElement) lab=p.parentElement.innerText.split('\n')[0];
    return i+' <'+e.tagName+' type='+e.type+' id='+e.id+' name="'+e.name+'" ph="'+(e.placeholder||'')+'"> nearLabel="'+lab.slice(0,30)+'"';
  }).join('\n')));
  await browser.close();
})();
