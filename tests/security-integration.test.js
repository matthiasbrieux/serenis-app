const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
test('Routes réelles, SQLite fictif, permissions, validations et sauvegardes sans réseau',()=>{
 const result=spawnSync(process.execPath,[path.join(__dirname,'fixtures/security-runner.cjs')],{encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
 assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
 assert(!result.stdout.includes('FAIL '));
 console.log(result.stdout);
});
