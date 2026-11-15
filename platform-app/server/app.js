import { createServer } from 'node:http';
import { randomUUID,randomBytes } from 'node:crypto';
import { createReadStream,createWriteStream,existsSync,mkdirSync,statSync,readFileSync,renameSync,unlinkSync } from 'node:fs';
import { resolve,extname,sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { HttpError,check,text } from './errors.js';
import { now,transaction,audit } from './db.js';
import { sessionFrom,setSession,createGuest,requireUser,requireAdmin,publicUser,hashPassword,verifyPassword,emailAddress } from './auth.js';
import { catalog,enroll,courseView,submit,savePosition,getEnrollment,versionContent,refreshStatus,skipModule } from './learning.js';
import { validateCourse } from './content.js';

async function readJson(req){check((req.headers['content-type']||'').split(';')[0]==='application/json','JSON içerik gerekli.',415);let size=0;const parts=[];for await(const part of req){size+=part.length;check(size<=512000,'İstek çok büyük.',413);parts.push(part);}try{const value=JSON.parse(Buffer.concat(parts).toString()||'{}');check(value&&typeof value==='object'&&!Array.isArray(value),'JSON nesnesi gerekli.');return value}catch{throw new HttpError(400,'Geçersiz JSON nesnesi.')}}
function send(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
const mimes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.webm':'video/webm','.svg':'image/svg+xml'};
function serveFile(req,res,file){check(existsSync(file)&&statSync(file).isFile(),'Dosya bulunamadı.',404);const size=statSync(file).size,headers={'Content-Type':mimes[extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':extname(file)==='.html'?'no-cache':'private, max-age=60'};let start=0,end=size-1,status=200;if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}if(match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;}else start=Math.max(0,size-Number(match[2]));if(start>end||start>=size||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;}headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);if(req.method==='HEAD'||size===0){res.end();return;}const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);}

export function createApp({db,publicDir=resolve('public'),dataDir=resolve('data'),publicOrigin=process.env.PUBLIC_ORIGIN||'',production=process.env.NODE_ENV==='production'}={}){
 check(!production||/^https:\/\/[^/]+$/.test(publicOrigin),'Production için HTTPS PUBLIC_ORIGIN tanımlayın.');
 const secure=production||publicOrigin.startsWith('https:'),rates=new Map();
 const rate=(req,key,max=30)=>{const k=`${req.socket.remoteAddress}:${key}`,t=Date.now(),row=rates.get(k);if(!row||row.until<t)rates.set(k,{count:1,until:t+15*60000});else{check(row.count<max,'Çok fazla deneme. 15 dakika sonra tekrar deneyin.',429);row.count++;}if(rates.size>5000)for(const [key,r]of rates)if(r.until<t)rates.delete(key);};
 function assignDefault(user){db.prepare('INSERT OR IGNORE INTO assignments VALUES(?,?,?)').run(user,'gtip',now());}
 return createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");if(secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
  try{
   const url=new URL(req.url,'http://localhost'),path=url.pathname,method=req.method;
   if(path==='/health'&&method==='GET')return send(res,{status:'ok'});
   if(!path.startsWith('/api/')){check(['GET','HEAD'].includes(method),'İzin verilmeyen yöntem.',405);const root=path.startsWith('/uploads/')?resolve(dataDir,'uploads'):publicDir;let relative;try{relative=decodeURIComponent(path.startsWith('/uploads/')?path.slice(9):path.slice(1));}catch{throw new HttpError(400,'Geçersiz dosya yolu.');}if(!relative)relative='index.html';const file=resolve(root,relative);check(file.startsWith(root+sep),'Geçersiz dosya yolu.',403);return serveFile(req,res,file);}
   let session=sessionFrom(db,req);
   if(!['GET','HEAD'].includes(method)){
    check(req.headers['x-pusula-client']==='web','İstek doğrulanamadı.',403);
    const expected=publicOrigin||`http://${req.headers.host}`;
    if(req.headers.origin)check(req.headers.origin===expected,'Farklı kaynaktan gelen istek reddedildi.',403);
    check(req.headers['sec-fetch-site']!=='cross-site','Farklı kaynaktan gelen istek reddedildi.',403);
    if(session&&!['/api/auth/login','/api/auth/register','/api/auth/guest'].includes(path))check(req.headers['x-csrf-token']===session.csrf,'Oturum doğrulaması başarısız. Sayfayı yenileyin.',403);
   }
   if(path==='/api/session'&&method==='GET')return send(res,session?{user:publicUser(session),csrf:session.csrf}:{user:null});
   if(path==='/api/auth/guest'&&method==='POST'){if(session)return send(res,{user:publicUser(session),csrf:session.csrf});rate(req,'guest',100);const user=createGuest(db);assignDefault(user.id);return send(res,setSession(db,res,user,secure));}
   if(path==='/api/auth/register'&&method==='POST'){
    rate(req,'auth');const input=await readJson(req),email=emailAddress(input.email),name=text(input.name,100,2);check(!db.prepare('SELECT id FROM users WHERE email=?').get(email),'Bu e-posta adresi kullanılıyor.',409);const hash=await hashPassword(input.password);
    const user=transaction(db,()=>{const id=session?.guest?session.id:randomUUID();if(session?.guest)db.prepare('UPDATE users SET name=?,email=?,password=?,guest=0 WHERE id=?').run(name,email,hash,id);else db.prepare('INSERT INTO users(id,name,email,password,created) VALUES(?,?,?,?,?)').run(id,name,email,hash,now());assignDefault(id);return db.prepare('SELECT * FROM users WHERE id=?').get(id)});
    return send(res,setSession(db,res,user,secure,session?.session_id),201);
   }
   if(path==='/api/auth/login'&&method==='POST'){
    rate(req,'auth');const input=await readJson(req),email=emailAddress(input.email),user=db.prepare('SELECT * FROM users WHERE email=?').get(email);check(await verifyPassword(input.password,user?.password),'E-posta veya parola hatalı.',401);
    // Carry guest work only for courses the account has not started. Existing account history wins conflicts.
    if(session?.guest&&session.id!==user.id)transaction(db,()=>{for(const e of db.prepare('SELECT * FROM enrollments WHERE user_id=?').all(session.id)){if(getEnrollment(db,user.id,e.course_id))continue;db.prepare('INSERT INTO enrollments VALUES(?,?,?,?,?,?,?,?,?)').run(user.id,e.course_id,e.version,e.current_block,e.unlocked,e.terminal,e.status,e.started,e.updated);for(const p of db.prepare('SELECT * FROM progress WHERE user_id=? AND course_id=?').all(session.id,e.course_id))db.prepare('INSERT INTO progress VALUES(?,?,?,?,?,?,?,?)').run(user.id,p.course_id,p.block_id,p.status,p.answer,p.feedback,p.position,p.updated);}
     for(const a of db.prepare('SELECT * FROM assignments WHERE user_id=?').all(session.id))db.prepare('INSERT OR IGNORE INTO assignments VALUES(?,?,?)').run(user.id,a.course_id,a.created);
     db.prepare('UPDATE messages SET user_id=? WHERE user_id=?').run(user.id,session.id);db.prepare('UPDATE attempts SET user_id=? WHERE user_id=?').run(user.id,session.id);
     db.prepare('DELETE FROM enrollments WHERE user_id=?').run(session.id);db.prepare('DELETE FROM assignments WHERE user_id=?').run(session.id);db.prepare('DELETE FROM users WHERE id=?').run(session.id);
    });
    return send(res,setSession(db,res,user,secure,session?.session_id));
   }
   requireUser(session);
   if(path==='/api/auth/logout'&&method==='POST'){db.prepare('DELETE FROM sessions WHERE id=?').run(session.session_id);res.setHeader('Set-Cookie',`pusula_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`);return send(res,{ok:true});}
   if(path==='/api/auth/password'&&method==='POST'){check(!session.guest,'Önce hesap oluşturun.');const b=await readJson(req);check(await verifyPassword(b.currentPassword,session.password),'Mevcut parola hatalı.',400);const hash=await hashPassword(b.newPassword);db.prepare('UPDATE users SET password=? WHERE id=?').run(hash,session.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(session.id);return send(res,setSession(db,res,session,secure));}
   if(path==='/api/profile'&&method==='GET'){const courses=catalog(db,session.id,true),skills=[...new Set(courses.filter(c=>c.status==='completed').flatMap(c=>c.skills))];return send(res,{user:publicUser(session),courses,skills});}
   if(path==='/api/profile'&&method==='PATCH'){const b=await readJson(req);db.prepare('UPDATE users SET name=?,job=? WHERE id=?').run(text(b.name,100,2),text(b.job||'',140),session.id);return send(res,{user:publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(session.id))});}
   if(path==='/api/courses'&&method==='GET')return send(res,{courses:catalog(db,session.id)});
   let m=path.match(/^\/api\/courses\/([\w-]+)(?:\/(.*))?$/);
   if(m){const [,id,action]=m;
    if(action==='enroll'&&method==='POST'){enroll(db,session.id,id);return send(res,courseView(db,session.id,id));}
    if(!action&&method==='GET')return send(res,courseView(db,session.id,id));
    if(action==='skip'&&method==='POST'){const b=await readJson(req);return send(res,skipModule(db,session.id,id,b.blockId));}
    if(action==='submit'&&method==='POST'){const b=await readJson(req);return send(res,submit(db,session.id,id,b.blockId,b.answer));}
    if(action==='position'&&method==='POST'){const b=await readJson(req);savePosition(db,session.id,id,b.blockId,b.position);return send(res,{ok:true});}
    if(action==='messages'&&method==='GET')return send(res,{messages:db.prepare('SELECT role,body,created FROM messages WHERE user_id=? AND course_id=? ORDER BY id DESC LIMIT 60').all(session.id,id).reverse()});
    if(action==='messages'&&method==='POST'){
     rate(req,'chat',150);const b=await readJson(req),body=text(b.body,2000,1),e=getEnrollment(db,session.id,id);check(e,'Önce eğitime başlayın.',404);const c=versionContent(db,id,e.version),block=c.blocks.find(x=>x.id===b.blockId)||c.blocks.find(x=>x.id===e.current_block);
     const reply=/vergi|gtip|kod/i.test(body)&&id==='gtip'?'Ortak altı hane eşyanın sınıflandırılması içindir. Vergi oranı ülkeye göre değişebilir. Fasıl örnekleri: 01 canlı hayvanlar, 84 makineler, 73 demir veya çelikten eşya, 52 pamuk.':`“${block.title}” adımında şu konuya odaklanıyoruz: ${block.body.slice(0,650)}\n\nYanıtını kendi örneğinle açıklamayı deneyebilirsin.`;
     const insert=db.prepare('INSERT INTO messages(user_id,course_id,role,body,created) VALUES(?,?,?,?,?)');transaction(db,()=>{insert.run(session.id,id,'user',body,now());insert.run(session.id,id,'assistant',reply,now());});return send(res,{reply,mode:'local-guide'});
    }
   }
   if(path.startsWith('/api/admin/')){
    requireAdmin(session);
    if(path==='/api/admin/courses'&&method==='GET')return send(res,{courses:db.prepare('SELECT * FROM courses ORDER BY updated DESC').all().map(c=>({...c,draft:JSON.parse(c.draft)}))});
    if(path==='/api/admin/courses'&&method==='POST'){const b=await readJson(req),draft=validateCourse(b),id=randomUUID();db.prepare('INSERT INTO courses(id,draft,updated) VALUES(?,?,?)').run(id,JSON.stringify(draft),now());audit(db,session.id,'course.create',{id});return send(res,{id,revision:1},201);}
    m=path.match(/^\/api\/admin\/courses\/([\w-]+)(?:\/(publish|archive))?$/);
    if(m){const [,id,action]=m,row=db.prepare('SELECT * FROM courses WHERE id=?').get(id);check(row,'Eğitim bulunamadı.',404);
     if(!action&&method==='GET')return send(res,{...row,draft:JSON.parse(row.draft)});
     if(!action&&method==='PUT'){const b=await readJson(req),draft=validateCourse(b.draft);const result=db.prepare('UPDATE courses SET draft=?,revision=revision+1,updated=? WHERE id=? AND revision=?').run(JSON.stringify(draft),now(),id,b.revision);check(result.changes===1,'İçerik başka bir oturumda değişti. Yeniden yükleyin.',409);audit(db,session.id,'course.save',{id});return send(res,{revision:b.revision+1});}
     if(action==='publish'&&method==='POST'){const b=await readJson(req),current=db.prepare('SELECT * FROM courses WHERE id=?').get(id);check(b.revision===current.revision,'Yayımlamadan önce güncel taslağı kaydedin.',409);const draft=validateCourse(JSON.parse(current.draft),{publish:true});for(const block of draft.blocks.filter(x=>x.type==='video')){const file=block.url.startsWith('/uploads/')?resolve(dataDir,block.url.slice(1)):resolve(publicDir,block.url.slice(1));check(existsSync(file),'Bir video dosyası bulunamadı. Önce dosyayı yükleyin.');}const version=(current.published_version||0)+1;transaction(db,()=>{db.prepare('INSERT INTO versions VALUES(?,?,?,?)').run(id,version,JSON.stringify(draft),now());db.prepare('UPDATE courses SET published_version=?,archived=0,updated=? WHERE id=?').run(version,now(),id);audit(db,session.id,'course.publish',{id,version});});return send(res,{version});}
     if(action==='archive'&&method==='POST'){const b=await readJson(req);db.prepare('UPDATE courses SET archived=?,updated=? WHERE id=?').run(b.archived?1:0,now(),id);return send(res,{ok:true});}
    }
    if(path==='/api/admin/users'&&method==='GET')return send(res,{users:db.prepare('SELECT id,name,email,role,guest FROM users ORDER BY created DESC LIMIT 500').all()});
    if(path==='/api/admin/assign'&&method==='POST'){const b=await readJson(req);check(db.prepare('SELECT 1 FROM users WHERE id=?').get(b.userId)&&db.prepare('SELECT 1 FROM courses WHERE id=? AND published_version IS NOT NULL').get(b.courseId),'Kullanıcı veya yayımlanmış eğitim bulunamadı.');db.prepare('INSERT OR IGNORE INTO assignments VALUES(?,?,?)').run(b.userId,b.courseId,now());return send(res,{ok:true});}
    if(path==='/api/admin/reviews'&&method==='GET'){const rows=db.prepare("SELECT p.*,u.name,u.email,e.version FROM progress p JOIN users u ON u.id=p.user_id JOIN enrollments e ON e.user_id=p.user_id AND e.course_id=p.course_id WHERE p.status='pending' ORDER BY p.updated").all();return send(res,{reviews:rows.map(r=>{const c=versionContent(db,r.course_id,r.version),b=c.blocks.find(x=>x.id===r.block_id);return {...r,answer:JSON.parse(r.answer),courseTitle:c.title,question:b.body,rubric:b.rubric};})});}
    if(path==='/api/admin/reviews'&&method==='POST'){const b=await readJson(req);check(['passed','revision'].includes(b.status),'İnceleme kararı geçersiz.');const comment=text(b.feedback,3000,3);transaction(db,()=>{const pending=db.prepare("SELECT 1 FROM progress WHERE user_id=? AND course_id=? AND block_id=? AND status='pending'").get(b.userId,b.courseId,b.blockId);check(pending,'Yanıt daha önce incelenmiş.',409);db.prepare('UPDATE progress SET status=?,feedback=?,updated=? WHERE user_id=? AND course_id=? AND block_id=?').run(b.status,comment,now(),b.userId,b.courseId,b.blockId);if(b.status==='revision')db.prepare('UPDATE enrollments SET current_block=? WHERE user_id=? AND course_id=?').run(b.blockId,b.userId,b.courseId);refreshStatus(db,b.userId,b.courseId);audit(db,session.id,'answer.review',{...b,feedback:comment});});return send(res,{ok:true});}
    if(path==='/api/admin/surveys'&&method==='GET'){
     const rows=db.prepare("SELECT p.*,u.name,u.email,e.version FROM progress p JOIN users u ON u.id=p.user_id JOIN enrollments e ON e.user_id=p.user_id AND e.course_id=p.course_id WHERE p.status='passed' ORDER BY p.updated DESC").all();
     return send(res,{surveys:rows.filter(r=>versionContent(db,r.course_id,r.version).blocks.find(b=>b.id===r.block_id)?.type==='survey').slice(0,500).map(r=>({name:r.name,email:r.email,course:versionContent(db,r.course_id,r.version).title,answer:JSON.parse(r.answer),updated:r.updated}))});
    }
    if(path==='/api/admin/report'&&method==='GET')return send(res,{enrollments:db.prepare('SELECT e.*,u.name,u.email FROM enrollments e JOIN users u ON u.id=e.user_id ORDER BY e.updated DESC LIMIT 500').all().map(r=>({...r,title:versionContent(db,r.course_id,r.version).title,unlocked:JSON.parse(r.unlocked)}))});
    if(path==='/api/admin/upload'&&method==='POST'){
     const mime=req.headers['content-type'],ext=mime==='video/mp4'?'.mp4':mime==='video/webm'?'.webm':null;check(ext,'Yalnızca MP4 veya WebM yüklenebilir.',415);const max=150*1024*1024;check(Number(req.headers['content-length']||0)<=max,'Video en fazla 150 MB olabilir.',413);const dir=resolve(dataDir,'uploads');mkdirSync(dir,{recursive:true});const name=randomUUID()+ext,temp=resolve(dir,name+'.tmp');let bytes=0,head=Buffer.alloc(0);
     try{await pipeline(req,new Transform({transform(chunk,enc,cb){bytes+=chunk.length;if(head.length<64)head=Buffer.concat([head,chunk.subarray(0,64-head.length)]);cb(bytes>max?new HttpError(413,'Video en fazla 150 MB olabilir.'):null,chunk);}}),createWriteStream(temp,{flags:'wx'}));check(bytes>12&&(ext==='.mp4'?head.toString('ascii',4,8)==='ftyp':head.subarray(0,4).toString('hex')==='1a45dfa3'),'Video dosyası doğrulanamadı.');renameSync(temp,resolve(dir,name));return send(res,{url:'/uploads/'+name},201);}catch(e){if(existsSync(temp))unlinkSync(temp);throw e;}
    }
   }
   throw new HttpError(404,'İşlem bulunamadı.');
  }catch(e){if(res.headersSent){res.destroy();return;}if(!e.status)console.error(e);send(res,{error:e.status?e.message:'Sunucuda beklenmeyen bir hata oluştu.'},e.status||500);}
 });
}
