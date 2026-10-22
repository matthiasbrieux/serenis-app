// Reuse the established sandbox: temporary SQLite/files, blocked external services,
// real Express routes and Multer, without opening a network listener.
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const filename = path.join(__dirname, 'security-runner.cjs');
let setup = fs.readFileSync(filename, 'utf8').split('(async()=>{')[0];
const marker = "app.use(require(root+'/node_modules/cookie-parser')());";
if (!setup.includes(marker)) throw new Error('Isolated fixture layout changed');
setup = setup.replace(marker, "app.use(require(root+'/middleware/rate-limits').requestLimiter);" + marker);
const body = `
(async()=>{
const ids=[seed('photo-quota-a@example.test'),seed('photo-quota-b@example.test')];
const image=await require(root+'/node_modules/sharp')({create:{width:8,height:8,channels:3,background:'#ffffff'}}).png().toBuffer();
for(const id of ids){
 const c=cookie(id);
 assert((await request('POST','/api/property',{cookie:c,body:{type:'maison',city:'Démo',price:250000}})).json.success);
 for(let i=0;i<150;i++){
  const q=await request('POST','/api/property/photos',{cookie:c,...upload('photos','test.png','image/png',image)});
  assert.equal(q.status,200);assert(q.json.success,JSON.stringify(q.json));
 }
 const p=db.prepare('SELECT id FROM properties WHERE seller_id=?').get(id);
 assert.equal(db.prepare('SELECT count(*) n FROM property_photos WHERE property_id=?').get(p.id).n,150);
 const overflow=await request('POST','/api/property/photos',{cookie:c,...upload('photos','test.png','image/png',image)});
 assert.match(overflow.json.error,/Maximum 150/);
 // A rejected extra file must never erase any of the 150 saved records.
 assert.equal(db.prepare('SELECT count(*) n FROM property_photos WHERE property_id=?').get(p.id).n,150);
}
console.log('PASS 150 real isolated uploads per seller on shared IP, count cap preserved, prior successes retained');
db.close();
})().catch(e=>{console.error(e.stack);process.exitCode=1});
`;
const runner = new Module(filename, module);
runner.filename = filename;
runner.paths = Module._nodeModulePaths(__dirname);
runner._compile(setup + body, filename);
