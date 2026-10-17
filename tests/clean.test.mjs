import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanPhonetic,
  cleanTranslation,
  normalizeWord,
  parseTags,
  posFamily,
} from "../scripts/lib/clean.mjs";

test("normalizeWord keeps simple English headwords only", () => {
  assert.equal(normalizeWord(" abandon "), "abandon");
  assert.equal(normalizeWord("well-being"), "well-being");
  assert.equal(normalizeWord("'hood"), null);
  assert.equal(normalizeWord("ice cream"), null);
  assert.equal(normalizeWord("a"), null);
});

test("parseTags keeps known exam tags", () => {
  assert.deepEqual(parseTags("zk gk cet4 cet6 ky toefl ielts gre"), [
    "zk",
    "gk",
    "cet4",
    "cet6",
    "ky",
    "toefl",
    "ielts",
    "gre",
  ]);
  assert.deepEqual(parseTags("gre unknown"), ["gre"]);
});

test("posFamily normalizes ECDICT part-of-speech prefixes", () => {
  assert.equal(posFamily("n"), "n");
  assert.equal(posFamily("vt"), "v");
  assert.equal(posFamily("vi"), "v");
  assert.equal(posFamily("a"), "adj");
  assert.equal(posFamily("ad"), "adv");
  assert.equal(posFamily("weird"), "other");
});

test("cleanTranslation handles literal ECDICT newlines and POS prefixes", () => {
  const result = cleanTranslation(
    "n. 苹果；苹果树\\nv. 苹果树（英国俚语）\\n[网络] 苹果",
  );
  assert.ok(result);
  assert.equal(result.pos, "n");
  assert.equal(result.text, "苹果；苹果树");
});

test("cleanTranslation drops web and name lines", () => {
  assert.equal(cleanTranslation("[网络] 只是一条网络释义"), null);
  assert.equal(cleanTranslation("n. (Gate)人名；(英)盖特"), null);
  assert.equal(cleanTranslation("n. 项目（item的复数形式）").text, "项目");
});

test("cleanTranslation truncates at a readable boundary", () => {
  const result = cleanTranslation(
    "n. 一个非常长的释义；另一个很长的释义；第三个释义；第四个释义",
    { maxSenses: 4, maxLength: 20 },
  );
  assert.ok(result);
  assert.ok(result.text.length <= 21);
  assert.ok(result.text.endsWith("…"));
});

test("cleanTranslation converts ASCII punctuation and skips non-Chinese", () => {
  assert.equal(cleanTranslation("n. hello, world"), null);
  assert.equal(cleanTranslation("n. 你好, 世界").text, "你好；世界");
  assert.equal(cleanPhonetic(" ,hʊd, "), "hʊd");
});
