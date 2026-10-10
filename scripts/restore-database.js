// Offline restoration into a NEW target only; never overwrites a live database.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),Database=require('better-sqlite3');
const [source,target]=process.argv.slice(2);
if(!source||!target)throw Error('Usage: node scripts/restore-database.js SAUVEGARDE NOUVELLE_BASE');
const dest=path.resolve(target);
if(fs.existsSync(dest)||fs.existsSync(dest+'-wal')||fs.existsSync(dest+'-shm'))throw Error('Destination existante : restauration refusée.');
let bytes=fs.readFileSync(source);
if(bytes.subarray(0,10).toString()==='VPMBACKUP1'){
 const key=process.env.BACKUP_ENCRYPTION_KEY;
 if(!key||!/^[a-f\d]{64}$/i.test(key))throw Error('Clé de sauvegarde requise');
 const decipher=crypto.createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),bytes.subarray(10,22));decipher.setAuthTag(bytes.subarray(22,38));
 bytes=Buffer.concat([decipher.update(bytes.subarray(38)),decipher.final()]);
}
const temp=dest+'.verify-'+crypto.randomUUID();fs.writeFileSync(temp,bytes,{mode:0o600,flag:'wx'});
try{
 const db=new Database(temp,{readonly:true,fileMustExist:true});
 try{if(db.pragma('integrity_check',{simple:true})!=='ok')throw Error('Intégrité SQLite invalide');if(db.pragma('foreign_key_check').length)throw Error('Relations SQLite invalides');}finally{db.close()}
 // Exclusive creation: no race that can replace a newly created target.
 fs.copyFileSync(temp,dest,fs.constants.COPYFILE_EXCL);fs.chmodSync(dest,0o600);console.log('Copie restaurée et vérifiée. Aucune base existante remplacée.');
}finally{for(const file of [temp,temp+'-wal',temp+'-shm']){try{fs.unlinkSync(file)}catch(e){if(e.code!=='ENOENT')throw e}}}
