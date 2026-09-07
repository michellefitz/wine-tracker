const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  const btns = page.locator('header button, button').filter({hasText:''});
  const info = await page.evaluate(()=>[...document.querySelectorAll('button')].map((b,i)=>i+':'+(b.getAttribute('aria-label')||b.title||b.className.toString().slice(0,40))));
  console.log(info);
  // click the two icon buttons top right
  const all = await page.locator('button').all();
  for (const [i,b] of all.entries()){
    const t = (await b.innerText()).trim();
    console.log(i, JSON.stringify(t), await b.getAttribute('aria-label'));
  }
  await browser.close();
})();
