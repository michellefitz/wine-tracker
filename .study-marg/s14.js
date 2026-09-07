const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  await page.getByText('Map').first().click(); await page.waitForTimeout(3000);
  console.log('MAP URL', page.url());
  await shot(page,'11-map', true);
  console.log('MAP TEXT:', await page.locator('body').innerText());
  const links = await page.evaluate(()=>[...document.querySelectorAll('a,button')].map(a=>(a.tagName+':'+(a.innerText.trim().replace(/\n/g,'~')||a.getAttribute('aria-label')||'')+' @'+(a.getAttribute('href')||'')).slice(0,80)));
  console.log('MAP LINKS:', JSON.stringify(links,null,0).slice(0,2000));
  await browser.close();
})();
