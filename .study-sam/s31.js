const { open, shot } = require('./helper.js');
(async () => {
  const { browser, ctx, page, errs } = await open();
  const cdp = await ctx.newCDPSession(page);
  page.on('dialog', async d => { console.log('DIALOG:', d.type(), '|', d.message()); await d.accept(); });
  // REFRESH test on Le Piane
  await page.goto('http://localhost:3210/'); await page.waitForTimeout(1400);
  await page.locator('input').first().fill('nebbiolo'); await page.waitForTimeout(900);
  await page.getByText('Colline Novaresi Nebbiolo').first().click(); await page.waitForTimeout(2000);
  const before = await page.evaluate(()=>document.body.innerText.split('BACKGROUND')[0].split('REFRESH')[1]);
  await page.getByText('REFRESH').click(); await page.waitForTimeout(6000);
  const after = await page.evaluate(()=>document.body.innerText.split('BACKGROUND')[0].split('REFRESH')[1]);
  console.log('REFRESH before:', JSON.stringify(before.trim().slice(0,150)));
  console.log('REFRESH after :', JSON.stringify(after.trim().slice(0,150)));
  await shot(page,'51-after-refresh');
  // DELETE
  await page.goto('http://localhost:3210/'); await page.waitForTimeout(1400);
  await page.locator('input').first().fill('ZZTEST1'); await page.waitForTimeout(900);
  await page.getByText('ZZTEST1').first().click(); await page.waitForTimeout(2000);
  await page.evaluate(()=>{const e=document.querySelector('.overflow-y-auto.overscroll-contain'); e.scrollTop=e.scrollHeight;}); await page.waitForTimeout(700);
  await shot(page,'52-before-delete');
  await page.getByText('DELETE THIS ENTRY').click(); await page.waitForTimeout(1500);
  await shot(page,'53-delete-confirm');
  console.log('after delete tap:', (await page.evaluate(()=>document.body.innerText)).replace(/\n+/g,' | ').slice(0,400));
  console.log('URL', page.url());
  console.log('ERRS', JSON.stringify(errs.slice(0,8)));
  await browser.close();
})();
