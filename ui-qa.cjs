const { chromium } = require('playwright');
const baseUrl = process.env.UI_BASE_URL || 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 1024, 768, 390, 360]) {
    await page.setViewportSize({width,height:900});
    await page.goto(baseUrl, {waitUntil:'networkidle'});
    await page.evaluate(async () => {
      await Promise.all(Array.from(document.images).map(image => {
        image.loading = 'eager';
        return image.decode();
      }));
    });
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      brokenImages: Array.from(document.images).filter(i => !i.complete || !i.naturalWidth).map(i => i.src),
      missingAnchors: Array.from(document.querySelectorAll('a[href^="#"]')).filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash)
    }));
    console.log(width, JSON.stringify(state));
    if(state.overflow || state.brokenImages.length || state.missingAnchors.length) throw Error('Layout QA failed');
    if(width===1440 || width===390) await page.screenshot({path:`ui-preview-${width}.png`,fullPage:true});
    if(width===390) {
      await page.locator('.menu-toggle').click();
      if(await page.locator('.menu-toggle').getAttribute('aria-expanded')!=='true') throw Error('Menu did not open');
      await page.keyboard.press('Escape');
      if(await page.locator('.menu-toggle').getAttribute('aria-expanded')!=='false') throw Error('Menu did not close');
    }
  }
  await page.locator('.faq-question').first().click();
  if(await page.locator('.faq-question').first().getAttribute('aria-expanded')!=='true') throw Error('FAQ did not open');
  await page.getByRole('button',{name:'Canada',exact:true}).click();
  if(await page.locator('.university-card:visible').count()!==1) throw Error('Destination filter failed');
  for(const route of ['portal.html','admin.html','exam.html']) {
    await page.goto(baseUrl+'/'+route,{waitUntil:'networkidle'});
    console.log(route, await page.evaluate(() => ({overflow:document.documentElement.scrollWidth>innerWidth,stylesheet:!!document.querySelector('link[href="redesign.css"]')})));
  }
  if(errors.length) throw Error(errors.join('\n'));
  await browser.close();
  console.log('UI checks passed.');
})().catch(error => {console.error(error);process.exitCode=1;});
