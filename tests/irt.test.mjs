import assert from "node:assert/strict";
import test from "node:test";

import {
  difficultyFromPercentile,
  estimateVocabulary,
  itemProbability,
  masteryProbability,
  posteriorFor,
  probit,
  roundScore,
  THETA_GRID,
  weightedQuantile,
} from "../lib/irt.ts";

test("probit matches known normal quantiles", () => {
  assert.ok(Math.abs(probit(0.5)) < 1e-9);
  assert.ok(Math.abs(probit(0.975) - 1.959964) < 1e-4);
  assert.ok(Math.abs(probit(0.025) + 1.959964) < 1e-4);
});

test("3PL probability respects the guessing floor", () => {
  assert.ok(Math.abs(itemProbability(0, 0) - 0.625) < 1e-12);
  assert.ok(itemProbability(-10, 0) >= 0.25);
  assert.ok(itemProbability(10, 0) <= 1);
  assert.ok(Math.abs(masteryProbability(0, 0) - 0.5) < 1e-12);
});

test("difficulty grows with rarity", () => {
  const easy = difficultyFromPercentile(0.1);
  const middle = difficultyFromPercentile(0.5);
  const hard = difficultyFromPercentile(0.9);
  assert.equal(middle, 0);
  assert.ok(easy < middle);
  assert.ok(middle < hard);
});

test("posterior is normalized and sharpens with evidence", () => {
  const empty = posteriorFor([]);
  const weights = empty.weights.reduce((sum, weight) => sum + weight, 0);
  assert.ok(Math.abs(weights - 1) < 1e-12);
  assert.ok(empty.grid.length === THETA_GRID.length);

  const responses = Array.from({ length: 20 }, () => ({ b: 0, correct: true }));
  const strong = posteriorFor(responses);
  assert.ok(strong.mean > empty.mean);
  assert.ok(strong.sd < empty.sd);
});

test("all-correct and all-wrong move the estimate in opposite directions", () => {
  const difficulties = Array.from({ length: 1200 }, (_, index) =>
    difficultyFromPercentile((index + 0.5) / 1200),
  );
  const correct = Array.from({ length: 30 }, (_, index) => ({
    b: difficulties[Math.min(difficulties.length - 1, 100 + index * 30)],
    correct: true,
  }));
  const wrong = correct.map((response) => ({ ...response, correct: false }));

  const high = estimateVocabulary(correct, difficulties);
  const low = estimateVocabulary(wrong, difficulties);

  assert.ok(high.score > low.score);
  assert.ok(high.score <= difficulties.length);
  assert.ok(low.score >= 0);
  assert.ok(high.ciLow <= high.score && high.score <= high.ciHigh);
  assert.ok(low.ciLow <= low.score && low.score <= low.ciHigh);
});

test("weighted quantile and score rounding are stable", () => {
  assert.equal(weightedQuantile([10, 20, 30], [0.2, 0.4, 0.4], 0.5), 20);
  assert.equal(weightedQuantile([10], [1], 0.95), 10);
  assert.equal(roundScore(8234), 8230);
  assert.equal(roundScore(8236), 8240);
});

test("a large vocabulary bank estimate stays within bounds", () => {
  const difficulties = Array.from({ length: 12000 }, (_, index) =>
    difficultyFromPercentile((index + 0.5) / 12000),
  );
  const responses = Array.from({ length: 30 }, (_, index) => ({
    b: difficulties[index * 400],
    correct: index % 3 !== 0,
  }));
  const estimate = estimateVocabulary(responses, difficulties);
  assert.ok(estimate.score >= 0 && estimate.score <= 12000);
  assert.ok(estimate.se > 0.05 && estimate.se < 1.35);
});
