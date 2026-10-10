const db=require('../database');
async function cleanupMedia(){
 for(const job of db.prepare("SELECT * FROM media_cleanup_jobs WHERE state='pending' LIMIT 100").all()){
  try{const item=JSON.parse(job.media_json);await require('./documents').removeMedia(item,'documents');db.prepare("DELETE FROM media_cleanup_jobs WHERE id=?").run(job.id);}
  catch(e){db.prepare('UPDATE media_cleanup_jobs SET last_error=? WHERE id=?').run('Suppression stockage en attente',job.id);}
 }
}
module.exports={cleanupMedia};
