import {advancedActivity,bindAdvanced,resultDetails,bindVideoMoments} from './advanced-ui.js';
import { api,post } from './api.js';
import { esc,lines,$,types,statuses,toast } from './ui.js';

function activity(b,p){
 const answer=p?.answer;
 const advanced=advancedActivity(b,p);if(advanced!==null)return advanced;
 switch(b.type){
  case 'survey':return `<div class="survey"><p class="notice">1 = Hiç katılmıyorum · 5 = Tamamen katılıyorum. Bu anket puanlanmaz. Yanıtların eğitmen tarafından hesabınla birlikte görülebilir.</p>${b.questions.map((q,i)=>`<fieldset class="survey-question"><legend>${esc(q)}</legend><div class="survey-scale">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="rating-${i}" value="${n}" ${answer?.ratings?.[i]===n?'checked':''} required><span>${n}</span></label>`).join('')}</div></fieldset>`).join('')}<label class="form-field">Neyi iyileştirelim? <small>İsteğe bağlı</small><textarea name="comment" maxlength="2000" placeholder="Önerini paylaş…">${esc(answer?.comment||'')}</textarea></label></div>`;
  case 'video':return `<video id="lesson-video" controls preload="metadata" poster="${esc(b.poster||'/assets/hero.png')}"><source src="${esc(b.url)}">Tarayıcınız videoyu desteklemiyor.</video><p id="video-unavailable" class="notice" role="status" hidden>Video şu anda oynatılamıyor. Ders notlarını okuyup “Adımı tamamla” ile devam edebilirsin.</p><p class="quiet">Oynatma konumunuz kaydedilir. “Adımı tamamla” düğmesi sizin tamamladığınızı beyan eder.</p>`;
  case 'micro':return `<div class="micro-art">Oku <span>→</span> Düşün <span>→</span> Uygula</div><p class="notice">Kısa bir durak. Ana fikri kendi kelimelerinle düşün ve sonraki adıma geç.</p>`;
  case 'scenario':return `<div class="case-brief"><span class="case-avatar">D</span><div><strong>${esc(b.context?.sender||(b.id==='access-case'?'Deniz · Akademi asistanı':b.id==='ai-case'?'Ece · Eğitim tasarımcısı':'İş arkadaşından mesaj'))}</strong><small>Rolün: ${esc(b.context?.role||(['access-case','ai-case'].includes(b.id)?'Akademi yöneticisi':'Karar verici'))}</small><p>${lines(b.context?.message||b.body)}</p></div></div><div class="case-decision"><span class="eyebrow">BİR SONRAKİ ADIMI SEÇ</span><p>Seçimini gönder; kararının olası sonucunu gör.</p></div><fieldset class="options"><legend class="sr-only">Kararın</legend>${b.options.map((o,i)=>`<label class="option case-option"><input type="radio" name="answer" value="${esc(o.id)}" ${answer===o.id?'checked':''} required><span><b>SEÇENEK ${String.fromCharCode(65+i)}</b>${esc(o.text)}</span></label>`).join('')}</fieldset>`;
  case 'choice':case 'boolean':return `<fieldset class="options"><legend class="sr-only">Yanıtını seç</legend>${b.options.map(o=>`<label class="option"><input type="radio" name="answer" value="${esc(o.id)}" ${answer===o.id?'checked':''} required><span>${esc(o.text)}</span></label>`).join('')}</fieldset>`;
  case 'open':return `<label class="form-field">Yanıtın <small>En az ${b.minLength} karakter</small><textarea name="answer" minlength="${b.minLength}" maxlength="5000" required ${p?.status==='pending'?'disabled':''} placeholder="Düşünceni bir örnekle açıkla…">${esc(typeof answer==='string'?answer:'')}</textarea></label><p class="quiet">Eğitmen bu yanıtı inceleyecek. Değerlendirme tamamlanana kadar eğitim sonucu beklemede kalabilir.</p>`;
  case 'match':return `<div class="matching">${b.left.map((left,i)=>`<label class="match-row"><strong>${esc(left)}</strong><select name="match-${i}" required><option value="">Bir karşılık seç</option>${b.right.map(right=>`<option value="${esc(right)}" ${answer?.[left]===right?'selected':''}>${esc(right)}</option>`).join('')}</select></label>`).join('')}</div>`;
  case 'compare':return `<div class="compare">${b.columns.map(c=>`<div class="panel"><div class="eyebrow">${esc(c.title)}</div><p class="compare-value">${lines(c.body)}</p></div>`).join('')}</div>`;
 }
}
export async function renderLearner(id,requested,refresh){
 const view=await post(`/courses/${id}/enroll`),{content:c,enrollment:e,progress}=view;
 const b=c.blocks.find(b=>b.id===requested&&e.unlocked.includes(b.id))||c.blocks.find(b=>b.id===e.current_block)||c.blocks[0];
 const p=progress.find(p=>p.block_id===b.id),idx=c.blocks.indexOf(b),done=progress.filter(p=>['passed','pending','skipped'].includes(p.status)).length;
 const messages=await api(`/courses/${id}/messages`);
 const html=`<header class="page"><div><div class="eyebrow">${esc(c.category)} / ${esc(b.module)} · SÜRÜM ${view.version}</div><h1>${esc(c.title)}</h1><p>${esc(c.description)}</p></div><a class="button" href="#catalog">← Eğitimlere dön</a></header><div class="learning"><aside class="panel"><div class="eyebrow">EĞİTİM İÇERİĞİ</div><h3>${done} / ${c.blocks.length} adım</h3><div class="progress"><i style="width:${done/c.blocks.length*100}%"></i></div><div class="module-list">${c.blocks.map((x,i)=>{const pr=progress.find(p=>p.block_id===x.id);return `${i===0||c.blocks[i-1].module!==x.module?`<div class="module-heading">${esc(x.module)}</div>`:''}<button data-lesson="${esc(x.id)}" ${e.unlocked.includes(x.id)?'':'disabled'} class="${x.id===b.id?'active':''}">${pr?.status==='skipped'?'↗':pr?.status==='passed'?'✓':e.unlocked.includes(x.id)?String(i+1).padStart(2,'0'):'🔒'} · ${esc(x.title)}<small>${esc(x.module)} · ${pr?statuses[pr.status]:types[x.type]}</small></button>`}).join('')}</div><div class="notice">${statuses[e.status]}</div></aside><section class="panel"><div class="eyebrow">${types[b.type]} · ADIM ${idx+1}</div><h2>${esc(b.title)}</h2>${b.type==='scenario'?'':`<p class="lesson-copy">${lines(b.body)}</p>`}<form id="activity"><div class="lesson-content">${activity(b,p)}</div>${p?.feedback?`<div class="feedback ${p.status==='revision'?'warning':''}"><strong>${statuses[p.status]}</strong><br>${esc(p.feedback)}</div>`:''}<div id="activity-result" aria-live="polite">${view.assessments?.[b.id]?resultDetails(b,view.assessments[b.id])+'<button type="button" id="study-module">Modülü çalış →</button>':''}</div><div class="lesson-footer"><button type="button" id="previous" ${idx===0?'disabled':''}>← Önceki</button>${p?.status==='pending'?`<button type="button" id="pending-next" class="primary">Sonraki adıma geç →</button>`:`<button type="submit" class="primary">${['video','micro','compare'].includes(b.type)?'Adımı tamamla':'Yanıtımı gönder'} ✓</button>`}</div></form>${e.status==='completed'?'<div class="feedback">Tebrikler! Bu eğitimi tamamladın. Yetkinliklerin profiline eklendi. <a href="#profile">Profilimi gör →</a></div>':''}</section><aside class="panel chat"><div class="eyebrow">ÖĞRENME REHBERİN</div><h3>Birlikte düşünelim ✦</h3><div class="notice">Yerel içerik rehberi · Yapay zekâ API bağlantısı yok</div><div class="chat-log"><div class="bubble">Bu eğitimdeki kavramları tekrar etmene yardımcı olabilirim. Mesajların hesabına kaydedilir.</div>${messages.messages.map(m=>`<div class="bubble ${m.role==='user'?'user':''}">${lines(m.body)}</div>`).join('')}</div><form id="chat-form"><input name="message" required maxlength="2000" aria-label="Rehbere mesaj" placeholder="Bir kavramı sor…"><button aria-label="Mesaj gönder">↑</button></form></aside></div>`;
 let videoTimer,last=0;
 const go=target=>{location.hash=target?`learn/${id}/${target}`:'profile'};
 const bindSkip=()=>{const el=$('#skip-module');if(el)el.onclick=async()=>{el.disabled=true;try{const r=await post(`/courses/${id}/skip`,{blockId:b.id});go(r.next)}catch(err){toast(err.message);el.disabled=false}};};
 return {html,bind(){
  bindAdvanced(b);bindSkip();$('#study-module')?.addEventListener('click',()=>go(b.next));
  document.querySelectorAll('[data-lesson]').forEach(el=>el.onclick=()=>go(el.dataset.lesson));
  $('#previous').onclick=()=>{const previous=c.blocks.slice(0,idx).reverse().find(x=>e.unlocked.includes(x.id));if(previous)go(previous.id)};
  $('#pending-next')?.addEventListener('click',()=>go(b.next));
  $('#activity').onsubmit=async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;try{
   const form=new FormData(event.target);let answer=true;
   if(['choice','scenario','boolean','open'].includes(b.type))answer=form.get('answer');
   if(b.type==='match')answer=Object.fromEntries(b.left.map((x,i)=>[x,form.get(`match-${i}`)]));
   if(b.type==='assessment')answer=Object.fromEntries(b.questions.map(q=>[q.id,form.get(`question-${q.id}`)]));
   if(b.type==='sheet')answer=Object.fromEntries(b.tasks.map(t=>[t.cell,form.get(`cell-${t.cell}`)]));
   if(b.type==='survey')answer={ratings:b.questions.map((_,i)=>Number(form.get(`rating-${i}`))),comment:form.get('comment')};
   const result=await post(`/courses/${id}/submit`,{blockId:b.id,answer});
   $('#activity-result').innerHTML=`<div class="feedback ${result.status==='incorrect'?'warning':''}">${esc(result.feedback)}${resultDetails(b,result)}<div class="row" style="margin-top:12px"><button type="button" id="follow-route">${result.next?(result.status==='incorrect'?'Tekrar incele ↶':'Devam et →'):(result.courseStatus==='awaiting_review'?'İnceleme durumunu gör':'Sonucumu gör')} </button></div></div>`;
   bindSkip();
   $('#follow-route').onclick=()=>{if(result.next===b.id)refresh();else go(result.next)};
  }catch(err){toast(err.message)}finally{button.disabled=false}};
  const video=$('#lesson-video');if(video){
   const showUnavailable=()=>{
    video.hidden=true;
    document.querySelector('#video-unavailable').hidden=false;
    document.querySelectorAll('.moment-rail,.video-moment').forEach(el=>el.hidden=true);
   };
   video.addEventListener('error',showUnavailable,true);
   bindVideoMoments(video,b);
   if(video.error||video.networkState===HTMLMediaElement.NETWORK_NO_SOURCE)showUnavailable();
   video.addEventListener('loadedmetadata',()=>{video.currentTime=Math.min(p?.position||0,Math.max(0,video.duration-1))},{once:true});const save=()=>{if(!Number.isFinite(video.currentTime)||Math.abs(video.currentTime-last)<1)return;last=video.currentTime;post(`/courses/${id}/position`,{blockId:b.id,position:last}).catch(()=>{});};video.addEventListener('pause',save);videoTimer=setInterval(save,5000);}
  $('#chat-form').onsubmit=async event=>{event.preventDefault();const input=event.target.elements.message,body=input.value.trim();if(!body)return;const btn=event.target.querySelector('button');btn.disabled=true;try{const data=await post(`/courses/${id}/messages`,{body,blockId:b.id});$('.chat-log').insertAdjacentHTML('beforeend',`<div class="bubble user">${esc(body)}</div><div class="bubble">${lines(data.reply)}</div>`);input.value='';$('.chat-log').scrollTop=$('.chat-log').scrollHeight}catch(err){toast(err.message)}finally{btn.disabled=false}};
 },cleanup(){clearInterval(videoTimer);const video=$('#lesson-video');if(video&&Number.isFinite(video.currentTime))post(`/courses/${id}/position`,{blockId:b.id,position:video.currentTime}).catch(()=>{});}};
}
