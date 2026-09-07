const { boot } = require('./lib');
const PHOTO='/tmp/claude-0/-home-user-wine-tracker/51ac2fc6-2848-5945-9ad7-a1982f33d24f/scratchpad/study/bottle-photo.jpg';
(async()=>{
  const {browser,page} = await boot();
  const n0 = await page.locator('a[href^="/wine/"]').count();
  console.log('count before:', n0);
  await page.goto('http://localhost:3210/add'); await page.waitForTimeout(1500);
  await page.locator('input[type=file]').setInputFiles(PHOTO);
  await page.waitForTimeout(5000);
  await page.getByText('CANCEL').click(); await page.waitForTimeout(3000);
  console.log('url after cancel:', page.url());
  await page.goto('http://localhost:3210'); await page.waitForTimeout(2500);
  const n1 = await page.locator('a[href^="/wine/"]').count();
  console.log('count after upload+CANCEL:', n1, ' delta=', n1-n0);
  await browser.close();
})();
