const { chromium } = require('playwright');
const DIR = '/home/user/wine-tracker/.study-marg/';
async function boot() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: {width:430,height:932}, deviceScaleFactor:2, hasTouch:true, isMobile:true });
  const page = await ctx.newPage();
  page.on('console', m => { if(m.type()==='error') console.log('CONSOLE ERR:', m.text().slice(0,300)); });
  page.on('pageerror', e => console.log('PAGE ERR:', String(e).slice(0,300)));
  await page.goto('http://localhost:3210/login');
  await page.waitForTimeout(1200);
  const inp = page.locator('input').first();
  await inp.fill('test-pass');
  await inp.press('Enter');
  await page.waitForTimeout(2500);
  return { browser, ctx, page };
}
async function shot(page, name, full) {
  await page.screenshot({ path: DIR+name+'.png', fullPage: !!full });
  console.log('shot', name, 'url=', page.url());
}
module.exports = { boot, shot, DIR };
