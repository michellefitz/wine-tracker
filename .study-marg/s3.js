const { boot, shot } = require('./lib');
const ids = process.argv.slice(2);
(async()=>{
  const {browser,page} = await boot();
  for (const [i,id] of ids.entries()){
    await page.goto('http://localhost:3210/wine/'+id);
    await page.waitForTimeout(2200);
    await shot(page,'det-'+i+'-'+id.slice(0,4)+'-full', true);
    console.log('=== '+i+' '+id+' ===');
    console.log(await page.locator('body').innerText());
    console.log('---buttons---');
    console.log(await page.evaluate(()=>[...document.querySelectorAll('button,a')].map(b=>(b.tagName+':'+(b.innerText.trim()||b.getAttribute('aria-label')||b.getAttribute('href')||'?')).slice(0,60)).join(' | ')));
  }
  await browser.close();
})();
