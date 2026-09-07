const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  const gs=['cabernet-sauvignon','carignan','cinsault','garnacha','malbec','nebbiolo','negroamaro','primitivo','tempranillo','chardonnay','arinto','cortese','loureiro','riesling'];
  for (const g of gs){
    await page.goto('http://localhost:3210/grape/'+g); await page.waitForTimeout(1200);
    const t=await page.locator('body').innerText();
    console.log(g.padEnd(20), t.includes("doesn't look like a grape") ? 'BROKEN' : 'OK :: '+t.replace(/\n/g,' / ').slice(0,140));
  }
  await browser.close();
})();
