/**
 * Item Response Theory helpers for the adaptive vocabulary test.
 *
 * Model: 3PL with a fixed discrimination and a 1/4 guessing floor,
 * because every item is a four-option multiple-choice question.
 *
 *   P(correct | theta) = c + (1 - c) / (1 + exp(-a * (theta - b)))
 *
 * `theta` is the latent vocabulary ability; `b` is item difficulty derived
 * from the word's frequency rank inside the selected word list.
 *
 * The vocabulary estimate is the posterior expectation of
 *   sum_i mastery(theta, b_i)
 * over all words in the list, where mastery omits the guessing floor.
 */

export const GUESSING = 0.25;
export const DISCRIMINATION = 1.1;
export const PRIOR_SD = 1.35;

export const GRID_MIN = -4.5;
export const GRID_MAX = 4.5;
export const GRID_STEP = 0.05;

export type Response = {
  /** Item difficulty on the latent scale. */
  b: number;
  /** Whether the answer was correct. "Don't know" counts as incorrect. */
  correct: boolean;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function logistic(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

export function normalPdf(x: number, mean = 0, sd = 1): number {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/**
 * Inverse standard normal CDF (Acklam's algorithm).
 * Accuracy is around 1e-9, far beyond what this app needs.
 */
export function probit(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const plow = 0.02425;
  const phigh = 1 - plow;

  let q: number;
  let r: number;

  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  if (p > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }

  q = p - 0.5;
  r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

/** Convert a 0..1 rank percentile into an item difficulty. */
export function difficultyFromPercentile(percentile: number): number {
  const p = clamp(percentile, 0.002, 0.998);
  return clamp(probit(p) * 1.55, -3.4, 3.4);
}

export function itemProbability(theta: number, b: number): number {
  return GUESSING + (1 - GUESSING) * logistic(DISCRIMINATION * (theta - b));
}

/** Probability the learner actually knows the word, without lucky guesses. */
export function masteryProbability(theta: number, b: number): number {
  return logistic(DISCRIMINATION * (theta - b));
}

export function buildGrid(): number[] {
  const grid: number[] = [];
  const steps = Math.round((GRID_MAX - GRID_MIN) / GRID_STEP);
  for (let i = 0; i <= steps; i += 1) {
    grid.push(Number((GRID_MIN + i * GRID_STEP).toFixed(4)));
  }
  return grid;
}

export const THETA_GRID = buildGrid();

export type Posterior = {
  grid: number[];
  weights: number[];
  mean: number;
  sd: number;
};

/**
 * Expected a posteriori (EAP) estimate over a fixed grid.
 * The prior is a broad normal centered at 0 (median difficulty of the list).
 */
export function posteriorFor(responses: Response[]): Posterior {
  const grid = THETA_GRID;
  const logWeights: number[] = new Array(grid.length);

  for (let i = 0; i < grid.length; i += 1) {
    const theta = grid[i];
    let logw = Math.log(normalPdf(theta, 0, PRIOR_SD));
    for (const response of responses) {
      const p = itemProbability(theta, response.b);
      logw += Math.log(response.correct ? p : 1 - p);
    }
    logWeights[i] = logw;
  }

  let max = -Infinity;
  for (const logw of logWeights) {
    if (logw > max) max = logw;
  }

  const weights = new Array<number>(grid.length);
  let total = 0;
  for (let i = 0; i < logWeights.length; i += 1) {
    const w = Math.exp(logWeights[i] - max);
    weights[i] = w;
    total += w;
  }
  for (let i = 0; i < weights.length; i += 1) {
    weights[i] /= total;
  }

  let mean = 0;
  for (let i = 0; i < grid.length; i += 1) {
    mean += grid[i] * weights[i];
  }

  let variance = 0;
  for (let i = 0; i < grid.length; i += 1) {
    const delta = grid[i] - mean;
    variance += delta * delta * weights[i];
  }

  return { grid, weights, mean, sd: Math.sqrt(variance) };
}

export type VocabularyEstimate = {
  theta: number;
  se: number;
  score: number;
  ciLow: number;
  ciHigh: number;
  /** Posterior probabilities for each word, useful for diagnostics. */
  coverage: number;
};

/**
 * Integrate the number of mastered words over the posterior.
 * `difficulties` holds one b per word in the list.
 */
export function estimateVocabulary(
  responses: Response[],
  difficulties: number[],
): VocabularyEstimate {
  const posterior = posteriorFor(responses);
  const values: number[] = new Array(posterior.grid.length);

  for (let g = 0; g < posterior.grid.length; g += 1) {
    const theta = posterior.grid[g];
    let count = 0;
    for (let i = 0; i < difficulties.length; i += 1) {
      count += masteryProbability(theta, difficulties[i]);
    }
    values[g] = count;
  }

  const ciLow = weightedQuantile(values, posterior.weights, 0.05);
  const ciHigh = weightedQuantile(values, posterior.weights, 0.95);

  // The posterior mean of the vocabulary curve is the point estimate.
  const meanScore = values.reduce(
    (acc, value, index) => acc + value * posterior.weights[index],
    0,
  );

  return {
    theta: posterior.mean,
    se: posterior.sd,
    score: meanScore,
    ciLow,
    ciHigh,
    coverage: meanScore / Math.max(1, difficulties.length),
  };
}

/** Weighted quantile for monotonically increasing values. */
export function weightedQuantile(
  values: number[],
  weights: number[],
  q: number,
): number {
  if (values.length === 0) return 0;
  let cumulative = 0;
  for (let i = 0; i < values.length; i += 1) {
    cumulative += weights[i];
    if (cumulative >= q) return values[i];
  }
  return values[values.length - 1];
}

/** Box-Muller normal sampler. */
export function sampleNormal(mean = 0, sd = 1, rng: () => number = Math.random): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function percentileBand(percentile: number): {
  index: number;
  label: string;
} {
  if (percentile < 0.25) return { index: 0, label: "高频" };
  if (percentile < 0.5) return { index: 1, label: "常用" };
  if (percentile < 0.75) return { index: 2, label: "进阶" };
  return { index: 3, label: "低频" };
}

/** Round a vocabulary count to a friendly precision. */
export function roundScore(value: number, precision = 10): number {
  return Math.round(value / precision) * precision;
}
