const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  // count cards per section
  const info = await page.evaluate(()=>{
    const out=[];
    document.querySelectorAll('a[href*="/wine"], a[href^="/w/"], a').forEach(a=>{
      if(a.getAttribute('href') && /\d|wine/.test(a.getAttribute('href'))) out.push({href:a.getAttribute('href'), text:a.innerText.trim().slice(0,80), aria:a.getAttribute('aria-label')});
    });
    return {links:out, imgs: document.querySelectorAll('img').length, svgs: document.querySelectorAll('svg').length};
  });
  console.log(JSON.stringify(info,null,1).slice(0,4000));
  await browser.close();
})();
