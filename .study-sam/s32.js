const { open, shot } = require('./helper.js');
(async () => {
  const { browser, page, errs } = await open();
  const n = async()=>{await page.goto('http://localhost:3210/');await page.waitForTimeout(1500);return page.evaluate(()=>document.querySelectorAll('a[href^="/wine/"]').length);};
  console.log('before', await n());
  await page.goto('http://localhost:3210/wine/53f49a14-b87c-4d8a-afc9-278b72e15244'); await page.waitForTimeout(2000);
  await page.getByText('DELETE THIS ENTRY').click(); await page.waitForTimeout(1200);
  await page.getByText('DELETE',{exact:true}).click(); await page.waitForTimeout(3000);
  await shot(page,'54-after-delete');
  console.log('URL', page.url());
  console.log('after', await n());
  console.log('ERRS', JSON.stringify(errs.slice(0,8)));
  await browser.close();
})();
