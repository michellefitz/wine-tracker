const { boot, shot } = require('./lib');
(async()=>{
  const {browser,page} = await boot();
  const U='http://localhost:3210/wine/1b368cf6-42d3-438a-a05f-01cd75b3fdb2'; // Norton Malbec
  await page.goto(U); await page.waitForTimeout(1500);
  const g=async()=>{const t=await page.locator('body').innerText();return{alc:(t.match(/ALCOHOL\n([^\n]*)/)||[])[1],price:(t.match(/PRICE\n([^\n]*)/)||[])[1],vint:(t.match(/VINTAGE\n([^\n]*)/)||[])[1],about:(t.match(/REFRESH\n\n([^\n]*)/)||[])[1],bg:(t.match(/BACKGROUND\n([^\n]*)/)||[])[1],goes:t.split('GOES WITH')[1].replace(/\n/g,' ').slice(0,50)};};
  console.log('BEFORE', JSON.stringify(await g()));
  await page.getByText('REFRESH').click(); await page.waitForTimeout(4500);
  console.log('AFTER1', JSON.stringify(await g()));
  await page.reload(); await page.waitForTimeout(2000);
  console.log('PERSISTED', JSON.stringify(await g()));
  await page.getByText('REFRESH').click(); await page.waitForTimeout(4500);
  console.log('AFTER2', JSON.stringify(await g()));
  await shot(page,'04-norton-refreshed', true);
  // recheck le piane persisted alcohol
  await page.goto('http://localhost:3210/wine/e5979506-2c5d-4706-b01d-fa3adaaa383e'); await page.waitForTimeout(1800);
  console.log('LE PIANE NOW', JSON.stringify(await g()));
  await browser.close();
})();
