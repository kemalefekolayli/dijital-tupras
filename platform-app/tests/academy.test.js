import test from 'node:test';
import assert from 'node:assert/strict';
import {openDb,now} from '../server/db.js';
import {seed} from '../server/seed.js';
import {enroll,submit,courseView,refreshStatus} from '../server/learning.js';
import {evaluate,validateCourse} from '../server/content.js';
import {academyCourse} from '../server/academy.js';
test('academy branching, open review and ungraded persistent survey',()=>{
 const db=openDb(':memory:');seed(db);
 try{
  db.prepare("INSERT INTO users(id,name,created) VALUES('learner','Learner',?)").run(now());
  enroll(db,'learner','akademi-ai');
  const c=validateCourse(academyCourse,{publish:true});
  const survey=c.blocks.find(b=>b.type==='survey');
  for(const answer of [null,{},true,{ratings:[0,3,3]},{ratings:[1,2]},{ratings:[1,2,6]},{ratings:[1,2,'3']},{ratings:[1,2,3],comment:'x'.repeat(2001)}])assert.throws(()=>evaluate(survey,answer));
  for(const b of c.blocks){
   if(b.type==='scenario'){
    const wrong=submit(db,'learner',c.id||'akademi-ai',b.id,b.options.find(o=>o.id!==b.answer).id);
    assert.equal(wrong.status,'incorrect');assert.equal(wrong.next,b.id);
   }
   const answer=b.type==='survey'?{ratings:[1,1,1],comment:'Daha fazla örnek isterim.'}:b.type==='open'?'İş: haftalık rapor. Sentetik verilerle onaylı ortamda deneme yapılacak. BT uzmanı inceleyecek, akademi sahibi bakım yapacak. Süre ve hata oranı başlangıçla karşılaştırılıp 30 gün sonunda karar verilecek.':b.type==='match'?Object.fromEntries(b.pairs.map(p=>[p.left,p.right])):b.answer||true;
   submit(db,'learner','akademi-ai',b.id,answer);
  }
  assert.equal(courseView(db,'learner','akademi-ai').enrollment.status,'awaiting_review');
  assert.equal(courseView(db,'learner','akademi-ai').progress.find(p=>p.block_id==='satisfaction').answer.ratings[0],1);
  submit(db,'learner','akademi-ai','satisfaction',{ratings:[2,3,4],comment:'Güncellenmiş yorum'});
  assert.deepEqual(courseView(db,'learner','akademi-ai').progress.find(p=>p.block_id==='satisfaction').answer.ratings,[2,3,4]);
  db.prepare("UPDATE progress SET status='passed' WHERE block_id='pilot-plan'").run();
  assert.equal(refreshStatus(db,'learner','akademi-ai'),'completed');
 }finally{db.close();}
});
