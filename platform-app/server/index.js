import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync,writeFileSync } from 'node:fs';
import { randomBytes,randomUUID } from 'node:crypto';
import { openDb,now } from './db.js';
import { seed } from './seed.js';
import { hashPassword,emailAddress } from './auth.js';
import { createApp } from './app.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=resolve(process.env.DATA_DIR||resolve(root,'data'));
const db=openDb(resolve(dataDir,'pusula.sqlite'));seed(db);
if(!db.prepare("SELECT 1 FROM users WHERE role='admin'").get()&&process.env.NODE_ENV!=='production'){
 const password=randomBytes(15).toString('base64url'),email='admin@pusula.local';
 db.prepare("INSERT INTO users(id,email,name,password,role,created) VALUES(?,?,?,?,'admin',?)").run(randomUUID(),email,'Yönetici',await hashPassword(password),now());
 writeFileSync(resolve(dataDir,'ilk-giris.txt'),`Pusula yerel yönetici hesabı\nE-posta: ${email}\nParola: ${password}\n\nGirişten sonra Profil > Parola değiştir bölümünden değiştirebilirsiniz.\nBu dosyayı paylaşım paketine eklemeyin.\n`,{mode:0o600});
 console.log('Yerel yönetici giriş bilgileri: '+resolve(dataDir,'ilk-giris.txt'));
}
db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
const server=createApp({db,publicDir:resolve(root,'public'),dataDir});
server.listen(port,host,()=>console.log(`Pusula hazır: http://${host==='0.0.0.0'?'localhost':host}:${port}`));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} kullanımda. PORT ortam değişkeniyle başka bir port seçin.`:e);process.exitCode=1;db.close();});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0)}));
