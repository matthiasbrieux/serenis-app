const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');
const vm = require('node:vm');
const { createLimits, requestBudget, LIMITS } = require('../middleware/rate-limits');
function harness() {
  const app = express();
  const limits = createLimits();
  app.use(limits.requestLimiter);
  app.use((req, res, next) => { req.seller = { id: req.headers['x-test-seller'] }; next(); });
  app.post(['/api/property/photos', '/api/property/documents'], limits.sellerUploadLimiter, (req, res) => res.json({ success: true }));
  app.use((req, res) => res.json({ success: true }));
  return (method, url, seller = '1', ip = '192.0.2.1') => new Promise((resolve, reject) => {
    const socket = new net.Socket();
    Object.defineProperty(socket, 'remoteAddress', { value: ip });
    const req = new http.IncomingMessage(socket);
    req.method = method; req.url = url; req.headers = { 'x-test-seller': seller };
    const res = new http.ServerResponse(req);
    res.end = data => { let body = data && String(data); try { body = JSON.parse(body); } catch {} resolve({ status: res.statusCode, body, headers: res.getHeaders() }); res.emit('finish'); return res; };
    app.handle(req, res, reject);
  });
}
test('150 photos each for two sellers on one IP, despite exhausted ordinary and static budgets', async () => {
  const request = harness();
  for (let i = 0; i < LIMITS.application; i++) assert.equal((await request('GET', '/api/property')).status, 200);
  assert.equal((await request('GET', '/api/property')).status, 429);
  for (let i = 0; i < LIMITS.static; i++) assert.equal((await request('GET', '/images/photo.jpg')).status, 200);
  assert.equal((await request('GET', '/images/photo.jpg')).status, 429);
  for (const seller of ['1', '2']) for (let i = 0; i < 150; i++) assert.equal((await request('POST', '/api/property/photos', seller)).status, 200);
});
test('seller quota shared by photos/documents and independent of IP; other seller unaffected', async () => {
  const request = harness();
  for (let i = 0; i < LIMITS.uploadSeller; i++) assert.equal((await request('POST', i % 2 ? '/api/property/photos' : '/api/property/documents')).status, 200);
  const blocked = await request('POST', '/api/property/photos', '1', '192.0.2.2');
  assert.equal(blocked.status, 429); assert.match(blocked.body.error, /déjà enregistrés/); assert(Number(blocked.headers['retry-after']) > 0);
  assert.equal((await request('POST', '/api/property/photos', '2')).status, 200);
});
test('IP abuse still blocked across seller identities', async () => {
  const request = harness();
  for (let i = 0; i < LIMITS.uploadIp; i++) assert.equal((await request('POST', '/api/property/photos', String(i))).status, 200);
  assert.equal((await request('POST', '/api/property/photos', 'another')).status, 429);
});
test('private documents and deceptive suffixes remain in application budget; auth precedes upload limiter', () => {
  assert.equal(requestBudget({ method: 'POST', path: '/API/PROPERTY/PHOTOS/' }), 'uploadIp');
  for (const path of ['/api/property/document/42.jpg', '/uploads/documents/private.pdf', '/images/../api/property', '/images/%2e%2e/private.jpg']) assert.equal(requestBudget({ method: 'GET', path }), 'application');
  const source = fs.readFileSync(require.resolve('../routes/seller'), 'utf8');
  for (const route of ['photos', 'documents']) assert(source.includes(`router.post('/api/property/${route}', requireAuth, sellerUploadLimiter,`));
});
function clientHarness(responses) {
  const source = fs.readFileSync(require.resolve('../views/seller/property.html'), 'utf8');
  const fn = source.slice(source.indexOf('async function uploadPhotos('), source.indexOf('\nasync function refreshPhotoSection'));
  const elements = new Map(); const messages = []; let calls = 0; let active = 0; let peak = 0;
  const context = { _uploadLock: {}, _tempIdCounter: 0, allPhotos: { pro: [] }, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, FormData: class { append() {} }, document: { getElementById(id) { if (!elements.has(id)) elements.set(id, { classList: { add() {}, remove() {} }, closest: () => null, style: {} }); return elements.get(id); } }, renderGrid() {}, showToast: msg => messages.push(msg), setTimeout() {}, fetch: async () => { active++; peak = Math.max(peak, active); const index = calls++; await Promise.resolve(); active--; if (responses[index] instanceof Error) throw responses[index]; return responses[index] || { ok: true, status: 200, json: async () => ({ photos: [{ cloudinary_id: 'saved-' + index, url: '/photo.jpg' }] }) }; } };
  vm.createContext(context); vm.runInContext(fn, context);
  return { context, messages, run: n => context.uploadPhotos(Array.from({ length: n }, (_, i) => ({ name: `${i}.jpg` })), 'pro'), calls: () => calls, peak: () => peak };
}
test('150 photos generate exactly 150 sequential POSTs, without retry', async () => {
  const h = clientHarness([]); await h.run(150); assert.equal(h.calls(), 150); assert.equal(h.peak(), 1); assert.equal(h.context.allPhotos.pro.length, 150);
});
for (const [name, response] of [['429', { ok: false, status: 429, json: async () => ({ error: 'Veuillez patienter' }) }], ['network', new Error('Connexion interrompue')], ['non-JSON', { ok: false, status: 500, json: async () => { throw new Error('JSON'); } }]]) test(`partial success survives ${name}, unfinished previews removed, no retry`, async () => {
  const h = clientHarness([undefined, response]); await h.run(5); assert.equal(h.calls(), 2); assert.equal(h.context.allPhotos.pro.length, 1); assert.equal(h.context.allPhotos.pro[0].cloudinary_id, 'saved-0'); assert.equal(h.context._uploadLock.pro, false); assert.equal(h.messages.length, 1);
});
test('photo guide reports 429 without deleting the existing image or retrying', async () => {
  const source = fs.readFileSync(require.resolve('../views/seller/guide-photos.html'), 'utf8');
  const fn = source.slice(source.indexOf('async function handleFiles('), source.indexOf('\nasync function deletePhoto'));
  let calls = 0; const messages = [];
  const context = { photosByRoom: { room: { angle: { cid: 'existing', url: '/existing.jpg' } } }, document: { getElementById: () => ({ classList: { add() {}, remove() {} } }) }, FormData: class { append() {} }, fetch: async () => { calls++; return { status: 429, ok: false, json: async () => ({ error: 'Veuillez patienter' }) }; }, showToast: msg => messages.push(msg) };
  vm.createContext(context); vm.runInContext(fn, context);
  await context.handleFiles([{ name: 'test.jpg' }], 'room', 'angle');
  assert.equal(calls, 1); assert.equal(context.photosByRoom.room.angle.cid, 'existing'); assert.equal(messages[0], 'Veuillez patienter');
});
test('modified inline scripts parse successfully', () => {
  for (const file of ['property', 'guide-photos']) {
    const source = fs.readFileSync(require.resolve(`../views/seller/${file}.html`), 'utf8');
    for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) if (match[1].trim()) new vm.Script(match[1]);
  }
});
test('real upload routes save 150 photos for each seller on shared IP in isolated storage', () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, [require.resolve('./fixtures/photo-quota-runner.cjs')], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /PASS 150 real isolated uploads/);
});
