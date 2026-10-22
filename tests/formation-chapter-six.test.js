'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'views/seller/library.html'),'utf8');
const start=source.indexOf('const MODULES = ')+16;
const modules=JSON.parse(source.slice(start,source.indexOf('\n];',start)+2));
const reference=require('./fixtures/formation-chapter-six-content.json');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const context=vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function formationProgressKey('),source.indexOf('// ── State ──')),context);
test('Chapter 6: four real lessons, exact approved partition, every source block preserved once',()=>{
  const lessons=modules[5].steps;
  assert.equal(lessons.length,4);
  assert.deepEqual(lessons.map(l=>l.title),['◆ Comprendre et accepter mon offre',"◆ Passer à l'action",'◆ La signature de mon compromis',"◆ Les 3 dates jusqu'à la vente de mon bien"]);
  assert.equal(hash(modules.slice(0,5)),reference.otherChapters);
  assert.equal(hash(lessons[2]),reference.oldCompromis);
  assert.equal(hash(lessons[3]),reference.oldDates);
  assert.equal(hash(lessons[0].explication),reference.introduction);
  assert.equal(lessons[1].explication,undefined,'No duplicated introduction');
  const seen=[];
  for(let page=0;page<2;page++){
    assert.equal(lessons[page].sections.length,reference.groups[page].length);
    lessons[page].sections.forEach((section,index)=>{
      const original=reference.groups[page][index];seen.push(original);
      assert.equal(section.title,reference.sections[original].title);
      assert.equal(hash(section),reference.sections[original].sha256,section.title);
    });
    assert.equal(hash(lessons[page].speakText),reference.speech[page],'Original speech fragments preserved in the same approved order');
  }
  assert.equal(new Set(seen).size,15);
  assert.equal(source.includes('/js/formation-offer-pagination.js'),false);
});
test('Legacy progress: all eight completion combinations preserve historical states without completing the new action lesson',()=>{
  const keys=[0,1,2,3].map(i=>context.formationProgressKey(5,i));
  assert.deepEqual(keys,['5_0','5_offre_action','5_1','5_2']);
  for(let mask=0;mask<8;mask++){
    const old={'5_0':!!(mask&1),'5_1':!!(mask&2),'5_2':!!(mask&4)};
    const current=keys.map(key=>old[key]===true);
    assert.deepEqual(current,[old['5_0'],false,old['5_1'],old['5_2']]);
    assert.equal(current.filter(Boolean).length/4,[old['5_0'],old['5_1'],old['5_2']].filter(Boolean).length/4);
    const completed={...old,'5_offre_action':true};
    assert.equal(keys.filter(key=>completed[key]).length,current.filter(Boolean).length+1);
  }
  assert.equal(context.formationProgressKey(0,0),'0_1');
  assert.equal(context.formationProgressKey(0,1),'0_0');
  for(let mi=1;mi<5;mi++)modules[mi].steps.forEach((_,si)=>assert.equal(context.formationProgressKey(mi,si),mi+'_'+si));
});
test('Resume migration: old keys and index-only records resolve idempotently; new action remains independent',()=>{
  const resolve=context.resolveStoredFormationLesson;
  for(const [si,lessonKey,expected]of [[0,'5_0',0],[1,'5_1',2],[2,'5_2',3],[1,'5_offre_action',1]]){
    const migrated=resolve({mi:5,si,lessonKey});assert.equal(migrated.si,expected);assert.equal(resolve(migrated).si,expected);
  }
  for(const [si,expected]of [[0,0],[1,2],[2,3]]){
    const migrated=resolve({mi:5,si});assert.equal(migrated.si,expected);assert.equal(resolve(migrated).si,expected);
  }
  assert.equal(resolve({mi:5,si:1,structureVersion:2}).si,1);
  assert.equal(resolve({mi:0,si:0,lessonKey:'0_0'}).si,1);
});
