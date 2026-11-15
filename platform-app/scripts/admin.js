import { randomBytes,randomUUID } from 'node:crypto';
import { openDb,now } from '../server/db.js';
import { hashPassword,emailAddress } from '../server/auth.js';
import { createInterface } from 'node:readline/promises';
const rl=createInterface({input:process.stdin,output:process.stdout});
try{
 const email=emailAddress(process.env.ADMIN_EMAIL||await rl.question('Yönetici e-posta adresi: '));
 const db=openDb();const existing=db.prepare('SELECT id FROM users WHERE email=?').get(email);
 if(existing&&!process.argv.includes('--reset'))throw new Error('Bu hesap zaten var. Parolayı sıfırlamak için --reset seçeneğini kullanın.');
 const password=process.env.ADMIN_PASSWORD||randomBytes(18).toString('base64url'),hash=await hashPassword(password);
 if(existing)db.prepare("UPDATE users SET password=?,role='admin',guest=0 WHERE id=?").run(hash,existing.id);
 else db.prepare("INSERT INTO users(id,email,name,password,role,created) VALUES(?,?,?,?,'admin',?)").run(randomUUID(),email,'Yönetici',hash,now());
 if(existing)db.prepare('DELETE FROM sessions WHERE user_id=?').run(existing.id);
 console.log(`Yönetici hazır: ${email}`);if(!process.env.ADMIN_PASSWORD)console.log(`Oluşturulan parola (güvenli saklayın): ${password}`);db.close();
}catch(e){console.error(e.message);process.exitCode=1}finally{rl.close()}
