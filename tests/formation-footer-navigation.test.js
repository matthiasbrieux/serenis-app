'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'views/seller/library.html'), 'utf8');
const footerCss = fs.readFileSync(path.join(root, 'public/css/formation-footer-navigation.css'), 'utf8');
const offerJs = fs.readFileSync(path.join(root, 'public/js/formation-offer-lessons.js'), 'utf8');

function footerContext() {
  const calls = [];
  const writes = [];
  const cards = {};
  const modules = Array.from({ length: 6 }, (_, mi) => ({
    num: String(mi + 1),
    title: `Chapitre ${mi + 1}`,
    steps: Array.from({ length: mi === 5 ? 4 : 2 }, () => ({}))
  }));
  const context = {
    MODULES: modules,
    formationProgressKey: (mi, si) => mi === 5 ? ['5_0', '5_offre_action', '5_1', '5_2'][si] : `${mi}_${si}`,
    doneSteps: {},
    localStorage: { setItem: (key, value) => writes.push([key, value]) },
    syncProgress: (key, value) => calls.push(['sync', key, value]),
    updateProgress: () => calls.push(['progress']),
    celebratedModules: new Set(),
    showCelebration: () => {},
    setTimeout: () => {},
    navigateFormation: (...args) => calls.push(['navigate', ...args]),
    document: { getElementById: id => cards[id] || null }
  };
  const sourceStart = html.indexOf('function renderLessonNavigation(');
  const sourceEnd = html.indexOf("document.addEventListener('click', e => {", sourceStart);
  assert(sourceStart >= 0 && sourceEnd > sourceStart, 'shared footer/progression helpers are present');
  vm.createContext(context);
  vm.runInContext(html.slice(sourceStart, sourceEnd), context);
  return { context, calls, writes };
}

test('Every lesson footer retains previous, central progress and a next action, including final lesson', () => {
  const { context } = footerContext();
  const first = context.renderLessonNavigation(0, 0);
  assert.match(first, /class="formation-footer-empty"/);
  assert.match(first, /formation-footer-progress/);
  assert.match(first, /onclick="advanceFormationLesson\(0,0\)"/);
  assert.match(first, />Suivante</);

  const chapterEnd = context.renderLessonNavigation(0, 1);
  assert.match(chapterEnd, /Précédente/);
  assert.match(chapterEnd, /CHAPITRE SUIVANT/);
  assert.match(chapterEnd, /onclick="advanceFormationLesson\(0,1\)"/);

  const courseEnd = context.renderLessonNavigation(5, 3);
  assert.match(courseEnd, /Précédente/);
  assert.match(courseEnd, /formation-footer-empty/);
  assert.doesNotMatch(courseEnd, /advanceFormationLesson\(5,3\)/);
});

test('Next uses the existing progress key, local cache, server sync and correct boundary navigation', () => {
  const { context, calls, writes } = footerContext();
  context.advanceFormationLesson(0, 0);
  assert.equal(context.doneSteps['0_0'], true);
  assert.deepEqual(writes[0], ['vpm_done_steps', JSON.stringify({ '0_0': true })]);
  assert.equal(calls[0][0], 'sync');
  assert.equal(calls[0][1], 'vpm_done_steps');
  assert.deepEqual(calls.at(-1), ['navigate', 'lesson', 0, 1]);

  calls.length = 0;
  context.advanceFormationLesson(0, 1);
  assert.equal(context.doneSteps['0_1'], true);
  assert.deepEqual(calls.at(-1), ['navigate', 'lesson', 1, 0]);

  calls.length = 0;
  context.advanceFormationLesson(5, 3);
  assert.equal(context.doneSteps['5_2'], true);
  assert.deepEqual(calls.at(-1), ['navigate', 'home']);

  calls.length = 0;
  context.formationView = { level: 'lesson', mi: 5, si: 3 };
  context.doneSteps['5_2'] = undefined;
  context.returnToFormationHome();
  assert.equal(context.doneSteps['5_2'], true);
  assert.deepEqual(calls.at(-1), ['navigate', 'home']);
});

test('Lesson footer no longer renders the three removed blocks; floating Alex and shared resources remain available', () => {
  assert.doesNotMatch(html, /Ressources complémentaires|Demander à Alex sur cette étape|Terminer cette leçon/);
  assert.doesNotMatch(offerJs, /chapter-six-validation|chapter-six-complete/);
  assert.match(html, /id="coachToggle"/);
  assert.match(html, /function updateChapterDocuments\(/);
  assert.match(html, /formation-lesson-footer/);
  assert.match(footerCss, /data-formation-view="lesson".*\.step-chk \{ display:none/);
});
