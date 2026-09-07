const { open, shot } = require('./helper.js');
const list = async (page) => { await page.goto('http://localhost:3210/'); await page.waitForTimeout(1600); return page.evaluate(()=>[...document.querySelectorAll('a[href^="/wine/"]')].map(a=>a.getAttribute('href').slice(6,14))); };
(async () => {
  const { browser, page, errs } = await open();
  const a = await list(page); console.log('before', a.length);
  await page.goto('http://localhost:3210/add'); await page.waitForTimeout(1500);
  await page.setInputFiles('input[type=file]','/tmp/claude-0/-home-user-wine-tracker/51ac2fc6-2848-5945-9ad7-a1982f33d24f/scratchpad/study/bottle-photo.jpg');
  await page.waitForTimeout(5000);
  await page.fill('#name','ZZPHOTO'); await page.getByText('Liked it',{exact:true}).click();
  await page.getByText('ADD TO THE LOG').click(); await page.waitForTimeout(4500);
  const b = await list(page); console.log('after photo-save', b.length, 'new:', b.filter(x=>!a.includes(x)));
  const u = 'http://localhost:3210/wine/'+b.filter(x=>!a.includes(x))[0];
  console.log('ERRS', JSON.stringify(errs.slice(0,8)));
  await browser.close();
})();
