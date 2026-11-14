'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),path=require('node:path');
test('Admin facture : statut, renvoi sécurisé, garde 24h, force, numéro stable',()=>{
  const r=spawnSync(process.execPath,[path.join(__dirname,'fixtures/admin-invoice-runner.cjs')],{encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});
  assert.equal(r.status,0,r.stdout+'\n'+r.stderr);
  assert(!r.stdout.includes('FAIL '),'Unexpected failures:\n'+r.stdout);
  console.log(r.stdout);
});
