import test from 'node:test';
import assert from 'node:assert/strict';
import {openDb,now} from '../server/db.js';
import {seed} from '../server/seed.js';
import {enroll,submit,skipModule,courseView,catalog} from '../server/learning.js';
import {evaluate,validateCourse,studentContent} from '../server/content.js';
import {excelCourse} from '../server/excel.js';
import {cellValue} from '../public/js/sheet-engine.js';
test('safe spreadsheet formulas and validation',()=>{
 const cells={A1:10,A2:20,A3:30,B1:'=SUM(A1:A3)',B2:'=if(A1>=10;"Geçti";"Tekrar")',B3:'=EĞERSAY(A1:A3;">=20")'};
 assert.equal(cellValue(cells,'B1'),60);assert.equal(cellValue(cells,'B2'),'Geçti');assert.equal(cellValue(cells,'B3'),2);
 assert.equal(cellValue({...cells,B1:'=ORTALAMA(A1:A3)'},'B1'),20);
 for(const formula of ['=globalThis.process.exit()','=1/0','=B1','=SUM(A1:A3)garbage'])assert.throws(()=>cellValue({...cells,B1:formula},'B1'));
 const c=validateCourse(excelCourse,{publish:true});validateCourse(c,{publish:true});
 const safe=studentContent(c);assert.ok(!('answer' in safe.blocks[0].questions[0]));assert.ok(!('solutions' in safe.blocks[2].tasks[0]));
 assert.equal(evaluate(c.blocks[2],{B6:'=60'}).status,'incorrect');
 assert.equal(evaluate(c.blocks[2],{B6:'=SUM(B2:B5)'}).status,'passed');
 assert.equal(evaluate(c.blocks[2],{B6:'=B2+B3+B4+B5'}).status,'passed');
 const bad=structuredClone(excelCourse);bad.blocks[0].skipTarget='m3-test';assert.throws(()=>validateCourse(bad,{publish:true}));
});
test('5/8 cannot skip; 6/8 can skip; choice and skipped progress persist',()=>{
 const db=openDb(':memory:');seed(db);db.prepare("INSERT INTO users(id,name,created) VALUES('u','Excel test',?)").run(now());enroll(db,'u','excel-lab');
 try{
  const c=validateCourse(excelCourse,{publish:true}),b=c.blocks[0];
  const answers=n=>Object.fromEntries(b.questions.map((q,i)=>[q.id,i<n?q.answer:q.options.find(o=>o.id!==q.answer).id]));
  assert.throws(()=>skipModule(db,'u','excel-lab',b.id));
  assert.throws(()=>submit(db,'u','excel-lab','m2-test',answers(8)));
  let result=submit(db,'u','excel-lab',b.id,answers(5));assert.equal(result.score,5);assert.equal(result.canSkip,false);assert.equal(result.next,'m1-lesson');assert.throws(()=>skipModule(db,'u','excel-lab',b.id));
  result=submit(db,'u','excel-lab',b.id,answers(6));assert.equal(result.canSkip,true);
  assert.ok(!courseView(db,'u','excel-lab').enrollment.unlocked.includes('m2-test'));
  assert.equal(courseView(db,'u','excel-lab').assessments[b.id].score,6);
  assert.equal(skipModule(db,'u','excel-lab',b.id).next,'m2-test');
  assert.equal(courseView(db,'u','excel-lab').progress.filter(p=>p.status==='skipped').length,2);
  // Choose to study the second module, despite passing its pretest.
  const second=c.blocks.find(x=>x.id==='m2-test');submit(db,'u','excel-lab',second.id,Object.fromEntries(second.questions.map(q=>[q.id,q.answer])));
  submit(db,'u','excel-lab','m2-lesson',true);
  const sheet=c.blocks.find(x=>x.id==='m2-sheet');const answer=Object.fromEntries(sheet.tasks.map(t=>[t.cell,t.solutions[0]]));assert.equal(submit(db,'u','excel-lab',sheet.id,answer).status,'passed');
  const third=c.blocks.find(x=>x.id==='m3-test');submit(db,'u','excel-lab',third.id,Object.fromEntries(third.questions.map(q=>[q.id,q.answer])));skipModule(db,'u','excel-lab',third.id);
  assert.equal(submit(db,'u','excel-lab','finish',{ratings:[3,4,5],comment:''}).courseStatus,'completed');
  assert.equal(catalog(db,'u').find(c=>c.id==='excel-lab').progress,100);
 }finally{db.close();}
});
