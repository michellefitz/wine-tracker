const { open, shot } = require('./helper.js');
(async () => {
  const { browser, page, errs } = await open();
  const n = async()=>{await page.goto('http://localhost:3210/');await page.waitForTimeout(1500);return page.evaluate(()=>document.querySelectorAll('a[href^="/wine/"]').length);};
  console.log('before', await n());
  await page.goto('http://localhost:3210/wine/53f49a14-b87c-4d8a-afc9-278b72e15244'); await page.waitForTimeout(2200);
  await page.getByText('DELETE THIS ENTRY').click(); await page.waitForTimeout(1500);
  const btns = await page.evaluate(()=>[...document.querySelectorAll('button')].map(b=>JSON.stringify(b.innerText)).filter(x=>x!=='""'));
  console.log('buttons now:', btns.join(' , '));
  await page.locator('button', {hasText:/^DELETE$/}).first().click({timeout:5000}).catch(async()=>{
    await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='DELETE'); b&&b.click();});
  });
  await page.waitForTimeout(3500);
  await shot(page,'54-after-delete');
  console.log('URL', page.url());
  console.log('after', await n());
  console.log('ERRS', JSON.stringify(errs.slice(0,8)));
  await browser.close();
})();
