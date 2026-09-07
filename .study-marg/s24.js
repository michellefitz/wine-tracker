const { boot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  const ids = await page.evaluate(()=>[...document.querySelectorAll('a[href^="/wine/"]')].map(a=>a.getAttribute('href')));
  console.log('count', ids.length);
  for (const h of ids){
    await page.goto('http://localhost:3210'+h); await page.waitForTimeout(1400);
    const t = await page.locator('body').innerText();
    const nm = t.split('\n').filter(Boolean).slice(2,4).join(' ');
    console.log(nm.padEnd(48).slice(0,48),'| ALC='+((t.match(/ALCOHOL\n([^\n]*)/)||[])[1]||'-').padEnd(7),'| BG='+((t.match(/BACKGROUND\n([^\n]*)/)||[])[1]||'-').slice(0,40).padEnd(40),'| SERV='+((t.match(/GLASS\n([^\n]*)/)||[])[1]||'-').slice(0,45));
  }
  await browser.close();
})();
