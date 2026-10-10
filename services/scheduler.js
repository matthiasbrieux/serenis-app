const {parisDay}=require('./validation');
const {deliverOnce}=require('./delivery');
function due(now=new Date()){
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',hourCycle:'h23'}).format(now));
  return hour>=18;
}
async function runDueJobs(jobs,now=new Date()){
  if(!due(now))return [];
  const day=parisDay(now),results=[];
  for(const [name,run] of Object.entries(jobs)){
    const ok=await deliverOnce(`daily:${name}:${day}`,async()=>{await run();return true});
    results.push({name,day,ok});
  }
  return results;
}
module.exports={due,runDueJobs};
