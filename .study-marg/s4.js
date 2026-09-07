const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  const ids = await page.evaluate(()=>[...document.querySelectorAll('a[href^="/wine/"]')].map(a=>a.getAttribute('href')));
  for (const h of ids){
    await page.goto('http://localhost:3210'+h);
    await page.waitForTimeout(1500);
    const t = await page.locator('body').innerText();
    const name = t.split('\n').filter(Boolean).slice(2,5).join(' / ');
    const serv = (t.match(/Serving\n([^\n]*)/)||[])[1];
    const temp = (t.match(/TEMPERATURE\n([^\n]*)\n([^\n]*)/)||[]).slice(1).join(' | ');
    const glass = (t.match(/GLASS\n([^\n]*)/)||[])[1];
    const air = (t.match(/AIR\n([^\n]*)/)||[])[1];
    const about = (t.match(/REFRESH\n\n([^\n]*)/)||[])[1];
    const goes = t.split('GOES WITH')[1];
    const rating = (t.match(/(LOVED IT|LIKED IT|NOT OPENED YET|[A-Z ]{4,})\n/)||[])[0];
    console.log(JSON.stringify({h:h.slice(6,12),name,serv,temp,glass,air,about,goes:(goes||'').replace(/\n/g,' ').slice(0,60)}));
  }
  await browser.close();
})();
