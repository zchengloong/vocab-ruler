#!/usr/bin/env node
/**
 * Restore the generated word bank from the committed gzip snapshot when the
 * working database is missing. Keeps a fresh clone runnable without network.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "vocab.db");
const GZ_PATH = path.join(DATA_DIR, "vocab.db.gz");
const CSV_PATH = path.join(DATA_DIR, "ecdict.csv");
const TMP_PATH = `${DB_PATH}.restore`;

function isValidSqlite(filePath) {
  try {
    const buffer = readFileSync(filePath);
    return buffer.length > 1024 && buffer.subarray(0, 16).toString() === "SQLite format 3\u0000";
  } catch {
    return false;
  }
}

function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  if (existsSync(DB_PATH) && isValidSqlite(DB_PATH)) {
    const size = (statSync(DB_PATH).size / 1024 / 1024).toFixed(1);
    console.log(`[db] using data/vocab.db (${size} MB)`);
    return;
  }

  if (existsSync(GZ_PATH)) {
    console.log("[db] restoring data/vocab.db from the committed snapshot …");
    const buffer = gunzipSync(readFileSync(GZ_PATH));
    writeFileSync(TMP_PATH, buffer);
    rmSync(DB_PATH, { force: true });
    renameSync(TMP_PATH, DB_PATH);
    if (!isValidSqlite(DB_PATH)) {
      throw new Error("restored database failed its sanity check");
    }
    console.log(`[db] restored ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
    return;
  }

  console.error("[db] word bank is missing.");
  if (existsSync(CSV_PATH)) {
    console.error("[db] data/ecdict.csv is present — run: npm run db:build");
  } else {
    console.error("[db] download ECDICT first:");
    console.error("     https://github.com/skywind3000/ECDICT → data/ecdict.csv");
    console.error("     then run: npm run db:build");
  }
  process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(`[db] ${error.message}`);
  process.exit(1);
}
