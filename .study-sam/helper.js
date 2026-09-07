const { chromium } = require('playwright');
const S = '/home/user/wine-tracker/.study-sam';
async function open() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: {width:430,height:932}, deviceScaleFactor:2, hasTouch:true, isMobile:true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type()==='error') errs.push('CONSOLE: '+m.text().slice(0,300)); });
  page.on('pageerror', e => errs.push('PAGEERROR: '+e.message.slice(0,300)));
  page.on('response', r => { if (r.status()>=400) errs.push('HTTP '+r.status()+' '+r.url().slice(0,160)); });
  await page.goto('http://localhost:3210/login');
  await page.waitForTimeout(1200);
  await page.locator('input').first().fill('test-pass');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  return { browser, ctx, page, errs, S };
}
async function shot(page, name) { await page.screenshot({ path: S+'/'+name+'.png' }); return S+'/'+name+'.png'; }
module.exports = { open, shot, S };
