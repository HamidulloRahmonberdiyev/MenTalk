// Checks the word-learning logic (scheduling, round building, streaks):
//   node scripts/vocab-check.mjs
// The modules use extensionless imports, so they are transpiled to a temp folder first.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const SRC = new URL('../src/features/vocabulary/', import.meta.url);
const out = mkdtempSync(join(tmpdir(), 'vocab-check-'));
for (const name of ['words', 'srs', 'progress', 'exercises']) {
  const source = readFileSync(new URL(`${name}.ts`, SRC), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  writeFileSync(join(out, `${name}.mjs`), outputText.replace(/from '\.\/(\w+)'/g, "from './$1.mjs'"));
}
const load = (name) => import(pathToFileURL(join(out, `${name}.mjs`)).href);
const [words, srs, progress, exercises] = await Promise.all(['words', 'srs', 'progress', 'exercises'].map(load));

let failed = false;
const check = (name, fn) => {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    failed = true;
    console.log(`✗ ${name}\n  ${error.message}`);
  }
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = new Date(2026, 9, 10, 12).getTime();
const card = (word, translation, extra = {}) => ({ ...srs.newCard({ word, translation, ...extra }, NOW) });
const seeded = (seed = 1) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

check('tokenize keeps punctuation and emoji out of words', () => {
  const tokens = words.tokenize('Привет, как дела? 😊');
  assert.deepEqual(tokens.filter((t) => t.word).map((t) => t.text), ['Привет', 'как', 'дела']);
  assert.equal(tokens.map((t) => t.text).join(''), 'Привет, как дела? 😊');
});

check('sentenceOf and maskWord', () => {
  const text = 'Здравствуйте! Хотите кофе или чай?';
  assert.equal(words.sentenceOf(text, 'кофе'), 'Хотите кофе или чай?');
  assert.equal(words.maskWord('Хотите кофе или чай?', 'кофе'), 'Хотите _____ или чай?');
  assert.equal(words.maskWord('Хотите чай?', 'кофе'), null);
});

check('a due word climbs the ladder and waits longer each time', () => {
  let c = card('кофе', 'qahva');
  let previousWait = 0;
  for (let stage = 1; stage <= 6; stage += 1) {
    c = srs.review(c, true, c.due);
    assert.equal(c.stage, stage);
    assert.ok(c.due >= previousWait);
    previousWait = c.due;
  }
  assert.equal(srs.review(c, true, c.due).stage, 6, 'capped at the top stage');
});

check('a wrong answer drops two stages and returns within minutes', () => {
  const c = { ...card('чай', 'choy'), stage: 4 };
  const wrong = srs.review(c, false, NOW);
  assert.equal(wrong.stage, 2);
  assert.equal(wrong.lapses, 1);
  assert.ok(wrong.due - NOW <= HOUR);
});

check('early practice does not inflate the schedule', () => {
  const c = { ...card('чай', 'choy'), stage: 2, due: NOW + 2 * DAY };
  const early = srs.review(c, true, NOW);
  assert.equal(early.stage, 2);
  assert.equal(early.due, c.due);
});

check('mastery bands', () => {
  assert.deepEqual([0, 1, 3, 5].map(srs.masteryOf), ['new', 'learning', 'known', 'mastered']);
});

check('streak: continues yesterday, resets after a gap, stays within a day', () => {
  const today = progress.dayKey(NOW);
  const yesterday = progress.dayKey(NOW - DAY);
  const older = progress.dayKey(NOW - 3 * DAY);
  assert.equal(progress.streakAfterRound(4, yesterday, NOW), 5);
  assert.equal(progress.streakAfterRound(4, today, NOW), 4);
  assert.equal(progress.streakAfterRound(4, older, NOW), 1);
  assert.equal(progress.streakAfterRound(0, null, NOW), 1);
  assert.equal(progress.currentStreak(4, older, NOW), 0);
  assert.equal(progress.currentStreak(4, yesterday, NOW), 4);
});

check('combo XP grows then caps', () => {
  assert.deepEqual([1, 2, 3, 9].map(progress.xpForAnswer), [10, 12, 14, 20]);
});

const deck = [
  card('кофе', 'qahva', { example: 'Хотите кофе или чай?' }),
  card('чай', 'choy', { example: 'Хотите кофе или чай?' }),
  card('вода', 'suv'),
  card('хлеб', 'non'),
  card('молоко', 'sut'),
];

check('a round has no duplicate cards, valid options and no repeated kinds', () => {
  const round = exercises.buildRound(deck, NOW, seeded(3));
  assert.equal(round.length, deck.length);
  assert.equal(new Set(round.map((e) => e.card.id)).size, deck.length);
  for (const e of round) {
    if (e.kind === 'spell') {
      assert.equal(e.tiles.length, e.answer.length);
      assert.deepEqual([...e.tiles].sort(), [...e.answer].sort());
    } else {
      assert.ok(e.options.includes(e.answer), `${e.kind} options contain the answer`);
      assert.equal(new Set(e.options).size, e.options.length, 'options are unique');
    }
  }
});

check('every word is testable even with a tiny deck', () => {
  for (const size of [1, 2, 3]) {
    const round = exercises.buildRound(deck.slice(0, size), NOW, seeded(5));
    assert.equal(round.length, size);
  }
});

check('cloze needs the word inside the example, otherwise another kind is used', () => {
  const stage3 = deck.map((c) => ({ ...c, stage: 3 }));
  for (let seed = 1; seed < 30; seed += 1) {
    for (const e of exercises.buildRound(stage3, NOW, seeded(seed))) {
      if (e.kind === 'cloze') assert.ok(e.sentence.includes('_____') && e.card.example);
    }
  }
});

check('due words come before words that are not due yet', () => {
  const later = { ...card('стол', 'stol'), due: NOW + DAY };
  const picked = exercises.pickCards([later, ...deck], NOW, 5, () => 0.5).map((c) => c.id);
  assert.ok(!picked.includes('стол'));
});

check('isCorrect ignores case and spacing', () => {
  const e = exercises.exerciseFor(deck[0], deck, null, seeded(2));
  assert.ok(exercises.isCorrect(e, `  ${e.answer.toUpperCase()} `));
  assert.ok(!exercises.isCorrect(e, 'nope'));
});

process.exitCode = failed ? 1 : 0;
