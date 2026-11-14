const db=require('../database');
async function deliverOnce(key,send) {
  const now=Date.now();
  const claim=db.transaction(()=>{
    db.prepare("INSERT OR IGNORE INTO delivery_events(event_key,state,lease_until) VALUES(?,'pending',0)").run(key);
    return db.prepare("UPDATE delivery_events SET state='sending',lease_until=?,attempts=attempts+1 WHERE event_key=? AND state!='sent' AND (lease_until IS NULL OR lease_until<?)").run(now+10*60*1000,key,now).changes===1;
  })();
  if(!claim)return db.prepare('SELECT state FROM delivery_events WHERE event_key=?').get(key)?.state==='sent';
  try {
    const ok=await send();if(ok!==true)throw Error('Livraison non confirmée');
    db.prepare("UPDATE delivery_events SET state='sent',sent_at=CURRENT_TIMESTAMP,lease_until=NULL,last_error=NULL WHERE event_key=?").run(key);return true;
  }catch(e){db.prepare("UPDATE delivery_events SET state='failed',lease_until=NULL,last_error=? WHERE event_key=?").run(String(e.message).slice(0,200),key);return false;}
}
module.exports={deliverOnce};
