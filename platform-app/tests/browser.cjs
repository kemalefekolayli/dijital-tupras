/* Optional browser QA: PLAYWRIGHT_PATH points to an installed Playwright package. */
const { chromium }=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const {mkdtempSync,mkdirSync,rmSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {resolve}=require('node:path');
const {once}=require('node:events');
(async()=>{
 const {openDb,now}=await import('../server/db.js'),{seed}=await import('../server/seed.js'),{hashPassword}=await import('../server/auth.js'),{createApp}=await import('../server/app.js');
 const dir=mkdtempSync(resolve(tmpdir(),'pusula-browser-')),db=openDb(resolve(dir,'qa.sqlite'));seed(db);
 db.prepare("INSERT INTO users(id,name,email,password,role,created) VALUES('admin','Test Admin','qa@example.test',?,'admin',?)").run(await hashPassword('BrowserPassword123!'),now());
 const server=createApp({db,publicDir:resolve('public'),dataDir:dir});server.listen(0,'127.0.0.1');await once(server,'listening');
 let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1536,height:1100}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));const base=`http://127.0.0.1:${server.address().port}`;
  await page.goto(base);await page.getByRole('heading',{name:/Merhaba gezgin/}).waitFor();
  mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});
  await page.goto(base+'/#learn/gtip');await page.locator('video').waitFor();
  await page.waitForFunction(()=>document.querySelector('video')?.readyState>=1);
  const duration=await page.locator('video').evaluate(v=>v.duration);assert.ok(duration>180);
  await page.locator('video').evaluate(async v=>{v.muted=true;await v.play()});await page.waitForFunction(()=>document.querySelector('video').currentTime>.2);await page.locator('video').evaluate(v=>v.pause());
  await page.getByRole('button',{name:'Adımı tamamla'}).click();await page.locator('#follow-route').click();
  await page.getByRole('button',{name:'Adımı tamamla'}).click();await page.locator('#follow-route').click();
  await page.getByText('Eşyaya uygulanan vergi oranı',{exact:true}).click();await page.getByRole('button',{name:'Yanıtımı gönder'}).click();await page.locator('#follow-route').click();
  await page.locator('textarea[name=answer]').fill('Ortak kod eşyanın tanımını ülkeler arasında standartlaştırır. Vergi oranları ise değişebilir.');
  await page.getByRole('button',{name:'Yanıtımı gönder'}).click();await page.locator('#follow-route').click();
  await page.getByText('Yanlış',{exact:true}).click();await page.getByRole('button',{name:'Yanıtımı gönder'}).click();await page.locator('#follow-route').click();
  const matches=['Canlı hayvanlar','Makineler','Demir veya çelikten eşya','Pamuk'];for(let i=0;i<4;i++)await page.locator(`[name=match-${i}]`).selectOption(matches[i]);
  await page.getByRole('button',{name:'Yanıtımı gönder'}).click();await page.locator('#follow-route').click();
  await page.getByRole('button',{name:'Adımı tamamla'}).click();await page.locator('#follow-route').click();
  await page.getByText('Teknik özellikleri ve kullanım amacını doğrularım.',{exact:true}).click();await page.getByRole('button',{name:'Yanıtımı gönder'}).click();await page.locator('#follow-route').click();
  await page.getByText('Eğitmen incelemesinde',{exact:false}).first().waitFor();
  await page.goto(base+'/#auth/register');await page.locator('[name=name]').fill('Browser Öğrenen');await page.locator('[name=email]').fill('learner@example.test');await page.locator('[name=password]').fill('LearnerPassword123!');await page.locator('#auth-form button').click();await page.getByRole('heading',{name:/Merhaba Browser/}).waitFor();
  await page.reload();await page.getByRole('heading',{name:/Merhaba Browser/}).waitFor();
  const adminContext=await browser.newContext({viewport:{width:1536,height:1100}}),admin=await adminContext.newPage();admin.on('pageerror',e=>errors.push(e.message));
  await admin.goto(base+'/#auth');await admin.locator('[name=email]').fill('qa@example.test');await admin.locator('[name=password]').fill('BrowserPassword123!');await admin.locator('#auth-form button').click();await admin.getByRole('heading',{name:'Öğrenme deneyimlerini tasarla.'}).waitFor();
  await admin.locator('a[href="#reviews"]').click();await admin.locator('textarea[name=feedback]').fill('Kavramı doğru bir örnekle açıkladınız.');await admin.getByRole('button',{name:'Onayla'}).click();await admin.getByRole('heading',{name:'Tüm yanıtlar güncel.'}).waitFor();
  await page.goto(base+'/#profile');await page.getByText('GTİP temelleri',{exact:true}).waitFor();
  await admin.locator('a[href="#admin"]').click();await admin.locator('a[href="#edit/gtip"]').click();await admin.locator('#course-form [name=title]').fill('Tarayıcıda düzenlenen eğitim');await admin.locator('#save').click();await admin.waitForFunction(()=>document.querySelector('#save-state')?.textContent==='Kaydedildi');
  await admin.locator('[data-add=micro]').click();await admin.locator('#block-form [name=title]').fill('Ek öğrenme notu');await admin.locator('#block-form [name=body]').fill('Bu blok tarayıcıdan düzenlendi.');await admin.locator('#save').click();await admin.waitForFunction(()=>document.querySelector('#save-state')?.textContent==='Kaydedildi');
  await admin.screenshot({path:'test-results/editor-desktop.png',fullPage:true});
  await admin.locator('[data-node=scenario]').click();await admin.locator('#block-form [name=next]').selectOption({label:'Ek öğrenme notu'});await admin.locator('#publish').click();await admin.waitForFunction(()=>document.querySelector('.page .eyebrow')?.textContent.includes('YAYIN SÜRÜMÜ 2'));
  await admin.reload();await admin.getByRole('heading',{name:'Eğitim tasarımcısı'}).waitFor();assert.equal(await admin.locator('#course-form [name=title]').inputValue(),'Tarayıcıda düzenlenen eğitim');
  await page.goto(base+'/#catalog');await page.locator('#search').fill('iletişim');await page.getByRole('heading',{name:'Etkili iletişimin temelleri'}).waitFor();assert.equal(await page.locator('#catalog-grid .course').count(),1);
  await page.setViewportSize({width:390,height:844});await page.goto(base+'/#home');await page.getByRole('heading',{name:/Merhaba Browser/}).waitFor();await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  // New academy: actual form controls, survey low scores, persistence and admin reporting.
  await page.setViewportSize({width:1536,height:1100});await page.goto(base+'/#learn/akademi-ai');
  await page.locator('video').waitFor();await page.waitForFunction(()=>document.querySelector('video')?.readyState>=1);
  assert.ok(await page.locator('video').evaluate(v=>v.duration>150));
  await page.locator('video').evaluate(async v=>{v.muted=true;await v.play()});await page.waitForFunction(()=>document.querySelector('video').currentTime>.2);await page.locator('video').evaluate(v=>v.pause());
  // Traverse preceding activities through the same API; their UI types are exercised above.
  await page.evaluate(async()=>{
   const session=await (await fetch('/api/session')).json();
   const answers=[['access-video',true],['access-case','pilot'],['tool-compare',true],['access-checklist',true],['evolution-video',true],['impact-quiz','b'],['roles-match',{'Akademi':'Öğrenme tasarımı ve beceri desteği','Bilgi teknolojileri':'Onaylı ortam ve teknik kontroller','İş birimi':'İhtiyaç, başarı ölçütü ve süreç sahipliği','Konu uzmanı':'İçeriğin ve örnek çıktıların doğruluğu'}],['ai-boolean','false'],['ai-case','safe'],['pilot-plan','Haftalık raporu sentetik verilerle onaylı bir ortamda hazırlayacağım. BT uzmanı kodu inceleyecek, akademi bakım sahibi olacak. Süre ve hata oranını ölçüp 30 gün sonunda devam kararını vereceğiz.'],['sources',true]];
   for(const [blockId,answer] of answers){const r=await fetch('/api/courses/akademi-ai/submit',{method:'POST',headers:{'Content-Type':'application/json','X-Pusula-Client':'web','X-CSRF-Token':session.csrf},body:JSON.stringify({blockId,answer})});if(!r.ok)throw Error(await r.text());}
  });
  await page.goto(base+'/#learn/akademi-ai/satisfaction');await page.locator('.survey').waitFor();
  for(let i=0;i<3;i++)await page.locator(`[name=rating-${i}][value="1"]`).check({force:true});
  await page.locator('[name=comment]').fill('Tarayıcı testi: daha çok uygulama örneği.');
  await page.screenshot({path:'test-results/academy-survey-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Yanıtımı gönder'}).click();await page.getByText('Geri bildiriminiz kaydedildi.',{exact:false}).waitFor();
  await page.reload();await page.locator('.survey').waitFor();assert.ok(await page.locator('[name=rating-0][value="1"]').isChecked());
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/academy-survey-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await admin.goto(base+'/#reports');await admin.getByRole('heading',{name:'Memnuniyet anketleri'}).waitFor();await admin.getByText('Tarayıcı testi: daha çok uygulama örneği.',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);console.log('BROWSER PASS: video playback, all activities, registration, reload persistence, review, skills, editor, publish, search and mobile overflow.');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));db.close();rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
