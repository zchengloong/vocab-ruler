/**
 * Local visual QA: drives the app through Windows Edge over CDP, answers the
 * real questions using the generated SQLite word bank, and captures screenshots
 * for docs/.
 *
 * Prerequisites (this machine):
 *   1. npm run build && npm start   (or npm run dev)
 *   2. Launch Edge headless with:
 *      msedge.exe --headless=new --disable-gpu --remote-debugging-port=9222
 *   3. node scripts/visual-check.mjs
 *
 * Not part of the production build; kept for reproducible UI verification.
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.APP_URL ?? "http://localhost:3210";
const CDP = process.env.CDP_URL ?? "http://localhost:9222";
const OUT = path.resolve("docs/screenshots");
const db = new DatabaseSync(path.resolve("data/vocab.db"));

const browser = await chromium.connectOverCDP(CDP);
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
const watch = (target) => {
  target.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  target.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
};
watch(page);

function translationOf(word) {
  return db
    .prepare("SELECT translation FROM words WHERE word = ?")
    .get(word.toLowerCase())?.translation;
}

function correctIndexOf(item) {
  const translation = translationOf(item.word);
  const index = item.options.findIndex((option) => option.text === translation);
  return index >= 0 ? index : 0;
}

async function seedHistoricalResult(scope) {
  const startResponse = await fetch(`${BASE}/api/tests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scope, length: 20 }),
  });
  const start = await startResponse.json();
  let item = start.item;

  for (let index = 0; index < 20; index += 1) {
    const correct = correctIndexOf(item);
    const choice = index % 4 === 3 ? (correct + 1) % item.options.length : correct;
    const response = await fetch(`${BASE}/api/tests/${start.testId}/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wordId: item.wordId, choice }),
    });
    const data = await response.json();
    if (data.finished) return data.result;
    item = data.nextItem;
  }
  throw new Error("seed test did not finish");
}

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/home.png`, fullPage: true });
  console.log("captured home");

  await page.getByRole("radio", { name: /快速/ }).click();
  await page.getByRole("button", { name: /开始 20 题测试/ }).click();
  await page.waitForURL(/\/test\?/, { timeout: 15000 });
  await page.waitForSelector('[data-testid="word"]', { timeout: 15000 });
  await page.waitForTimeout(750);
  await page.screenshot({ path: `${OUT}/test.png` });
  console.log("captured test start");

  const total = 20;
  const wrongAt = new Set([4, 11, 17]);

  for (let index = 0; index < total; index += 1) {
    const word = (await page.locator('[data-testid="word"]').innerText()).trim();
    const options = page.locator('[data-testid^="option-"]');
    const optionCount = await options.count();
    const translation = translationOf(word);
    let correct = 0;

    for (let optionIndex = 0; optionIndex < optionCount; optionIndex += 1) {
      const text = (
        await options.nth(optionIndex).locator("span").last().innerText()
      ).trim();
      if (text === translation) {
        correct = optionIndex;
        break;
      }
    }

    const chosen = wrongAt.has(index) ? (correct + 1) % optionCount : correct;
    await options.nth(chosen).click();
    await page.waitForSelector('[data-testid="next"]', { timeout: 8000 });

    if (index === 0) {
      await page.screenshot({ path: `${OUT}/test-feedback.png` });
    }
    if (index === 4) {
      await page.screenshot({ path: `${OUT}/test-wrong.png` });
    }

    await page.locator('[data-testid="next"]').click();

    if (index < total - 1) {
      await page.waitForFunction(
        (previous) => {
          const element = document.querySelector('[data-testid="word"]');
          return element && element.textContent?.trim() !== previous;
        },
        word,
        { timeout: 8000 },
      );
    }
  }

  await page.waitForURL(/\/result\//, { timeout: 15000 });
  const resultUrl = page.url();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/result.png`, fullPage: true });
  console.log("result score:", await page.locator('[data-testid="score"]').innerText());

  const stars = page.locator('[data-testid^="star-"]');
  const starCount = await stars.count();
  for (let index = 0; index < Math.min(6, starCount); index += 1) {
    await stars.nth(index).click();
  }

  await page.locator('[data-testid="share"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/share.png` });
  await page.keyboard.press("Escape");

  const seeded = await seedHistoricalResult("cet4");
  await page.evaluate((result) => {
    const key = "vocab-ruler:history:v1";
    const list = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    const entry = {
      id: result.id,
      scope: result.scope,
      scopeName: result.scopeName,
      score: result.score,
      ciLow: result.ciLow,
      ciHigh: result.ciHigh,
      coverage: result.coverage,
      mode: result.mode,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    };
    list.push(entry);
    list.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    window.localStorage.setItem(key, JSON.stringify(list));
  }, seeded);

  await page.goto(`${BASE}/history`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/history.png`, fullPage: true });

  await page.goto(`${BASE}/wordbook`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/wordbook.png`, fullPage: true });

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  watch(mobile);
  await mobile.goto(BASE, { waitUntil: "networkidle" });
  await mobile.waitForTimeout(600);
  await mobile.screenshot({ path: `${OUT}/home-mobile.png`, fullPage: true });
  await mobile.goto(resultUrl, { waitUntil: "networkidle" });
  await mobile.waitForTimeout(1200);
  await mobile.screenshot({ path: `${OUT}/result-mobile.png`, fullPage: true });

  console.log("errors:", errors.length ? errors : "none");
  process.exit(errors.length ? 1 : 0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
