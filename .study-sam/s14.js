const { open, shot } = require('./helper.js');
(async () => {
  const { browser, page, errs } = await open();
  for (const g of ['malbec','nebbiolo','chardonnay','riesling','tempranillo','cabernet-sauvignon','primitivo','loureiro','cortese','garnacha','cinsault','carignan','arinto','negroamaro']) {
    await page.goto('http://localhost:3210/grape/'+g); await page.waitForTimeout(1400);
    const t = await page.evaluate(()=>{const e=document.querySelector('.overflow-y-auto, [class*=rounded-t]')||document.body; return document.body.innerText;});
    const tail = t.split('Riesling\n1 bottle').pop().replace(/\n+/g,' | ').slice(0,180);
    console.log(g.padEnd(20), '->', tail);
  }
  await browser.close();
})();
