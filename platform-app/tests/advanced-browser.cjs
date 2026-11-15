const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const {mkdtempSync,rmSync,mkdirSync}=require('node:fs');
const {tmpdir}=require('node:os');const {resolve}=require('node:path');const {once}=require('node:events');
(async()=>{
 const {openDb,now}=await import('../server/db.js'),{seed}=await import('../server/seed.js'),{createApp}=await import('../server/app.js'),{hashPassword}=await import('../server/auth.js'),{excelCourse}=await import('../server/excel.js');
 const dir=mkdtempSync(resolve(tmpdir(),'pusula-advanced-')),db=openDb(resolve(dir,'test.sqlite'));seed(db);
 db.prepare("INSERT INTO users(id,name,email,password,role,created) VALUES('admin','QA','qa@example.test',?,'admin',?)").run(await hashPassword('BrowserPassword123!'),now());
 const server=createApp({db,publicDir:resolve('public'),dataDir:dir});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1536,height:1100}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/#learn/excel-lab');await p.locator('.exam-question').first().waitFor();assert.equal(await p.locator('.exam-question').count(),8);
  const first=excelCourse.blocks[0];for(let i=0;i<8;i++){const q=first.questions[i];await p.locator(`[name=question-${i}][value="${i<6?q.answer:(q.answer+1)%q.options.length}"]`).check();}
  await p.getByRole('button',{name:'Yanıtımı gönder'}).click();await p.locator('#skip-module').waitFor();await p.screenshot({path:'test-results/excel-score.png',fullPage:true});
  await p.reload();await p.locator('#skip-module').click();await p.getByRole('heading',{name:'Ön test · Operasyon uzmanı',exact:true}).waitFor();
  const second=excelCourse.blocks.find(b=>b.id==='m2-test');for(let i=0;i<8;i++)await p.locator(`[name=question-${i}][value="${second.questions[i].answer}"]`).check();
  await p.getByRole('button',{name:'Yanıtımı gönder'}).click();await p.locator('#follow-route').click();await p.getByRole('button',{name:'Adımı tamamla'}).click();await p.locator('#follow-route').click();
  await p.locator('[name=cell-C2]').fill('=IF(B2>=70;"Geçti";"Tekrar")');await p.locator('[name=cell-C3]').fill('=EĞER(B3>=70;"Geçti";"Tekrar")');await p.locator('[name=cell-B6]').fill('=EĞERSAY(B2:B4;">=70")');await p.locator('#calculate-sheet').click();
  assert.equal(await p.locator('[data-value=C2]').innerText(),'Geçti');assert.equal(await p.locator('[data-value=B6]').innerText(),'2');
  await p.screenshot({path:'test-results/excel-lab-desktop.png',fullPage:true});await p.setViewportSize({width:390,height:844});await p.screenshot({path:'test-results/excel-lab-mobile.png',fullPage:true});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.getByRole('button',{name:'Yanıtımı gönder'}).click();await p.getByText('3/3 hücre doğru.',{exact:false}).waitFor();await p.reload();assert.equal(await p.locator('[name=cell-C2]').inputValue(),'=IF(B2>=70;"Geçti";"Tekrar")');
  await p.setViewportSize({width:1536,height:1100});await p.goto(base+'/#learn/akademi-ai');await p.locator('[data-moment="0"]').click();await p.getByText('Deniz’in ilk prototipine hangi veriyi verirsin?',{exact:true}).waitFor();assert.ok(await p.locator('video').evaluate(v=>v.paused));await p.locator('[data-pick="1"]').click();await p.screenshot({path:'test-results/academy-video-decision.png',fullPage:true});await p.getByRole('button',{name:'Videoya devam et'}).click();await p.locator('video').evaluate(v=>v.pause());
  await p.goto(base+'/#auth');await p.locator('[name=email]').fill('qa@example.test');await p.locator('[name=password]').fill('BrowserPassword123!');await p.locator('#auth-form button').click();await p.getByRole('heading',{name:'Öğrenme deneyimlerini tasarla.'}).waitFor();await p.goto(base+'/#edit/excel-lab');await p.locator('[name=passScore]').fill('6');await p.locator('#save').click();await p.waitForFunction(()=>document.querySelector('#save-state')?.textContent==='Kaydedildi');await p.reload();assert.equal(await p.locator('[name=passScore]').inputValue(),'6');
  await p.locator('[data-node=m1-sheet]').click();await p.locator('[name=tc-0]').waitFor();assert.equal(await p.locator('[name=tc-0]').inputValue(),'B6');await p.locator('#publish').click();await p.waitForFunction(()=>document.querySelector('.page .eyebrow')?.textContent.includes('YAYIN SÜRÜMÜ 2'));
  assert.deepEqual(errors,[]);console.log('PASS: diagnostic 6/8, persisted skip, formula results, saved cells, mobile, video decision and editor publish.');
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));db.close();rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
