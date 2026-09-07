const { boot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  await page.goto('http://localhost:3210/wine/0545f164-9b1f-4489-a147-fedb65fee5b7'); // Musar
  await page.waitForTimeout(1800);
  const g=async()=>{const t=await page.locator('body').innerText();return {name:t.split('\n').filter(Boolean).slice(2,4).join(' '),alc:(t.match(/ALCOHOL\n([^\n]*)/)||[])[1],bg:t.split('BACKGROUND')[1]?t.split('BACKGROUND')[1].split('\n').filter(Boolean)[0]:'-'};};
  console.log('BEFORE:', JSON.stringify(await g()));
  await page.getByText('REFRESH').click(); await page.waitForTimeout(6000);
  await page.reload(); await page.waitForTimeout(2500);
  console.log('AFTER :', JSON.stringify(await g()));
  await browser.close();
})();
