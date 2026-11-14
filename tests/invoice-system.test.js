'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('Système de facturation : PDF, numérotation, archivage, accès admin/vendeur', () => {
  const r = spawnSync(
    process.execPath,
    [path.join(__dirname, 'fixtures/invoice-system-runner.cjs')],
    { encoding: 'utf8', timeout: 90000, maxBuffer: 8 * 1024 * 1024 }
  );
  assert.equal(r.status, 0, r.stdout + '\n' + r.stderr);
  assert(!r.stdout.includes('FAIL '), 'Échecs inattendus :\n' + r.stdout);
  console.log(r.stdout);
});
