export const SCOPES = [
  {
    slug: "all",
    name: "综合词汇",
    short: "综合",
    english: "Overall",
    tag: null,
    target: 12000,
    blurb: "12,000 个高频词，估算整体词汇量",
    accent: "ink",
  },
  {
    slug: "cet4",
    name: "四级 CET-4",
    short: "四级",
    english: "CET-4",
    tag: "cet4",
    target: 4500,
    blurb: "大学英语四级核心词汇",
    accent: "green",
  },
  {
    slug: "cet6",
    name: "六级 CET-6",
    short: "六级",
    english: "CET-6",
    tag: "cet6",
    target: 6000,
    blurb: "六级高频与进阶词汇",
    accent: "blue",
  },
  {
    slug: "kaoyan",
    name: "考研英语",
    short: "考研",
    english: "Postgraduate",
    tag: "ky",
    target: 5500,
    blurb: "考研英语大纲词汇",
    accent: "amber",
  },
  {
    slug: "toefl",
    name: "托福 TOEFL",
    short: "托福",
    english: "TOEFL",
    tag: "toefl",
    target: 8000,
    blurb: "学术场景与校园词汇",
    accent: "violet",
  },
  {
    slug: "ielts",
    name: "雅思 IELTS",
    short: "雅思",
    english: "IELTS",
    tag: "ielts",
    target: 7000,
    blurb: "雅思听说读写核心词",
    accent: "coral",
  },
  {
    slug: "gre",
    name: "GRE",
    short: "GRE",
    english: "GRE",
    tag: "gre",
    target: 10000,
    blurb: "高阶学术与填空词汇",
    accent: "slate",
  },
] as const;

export type ScopeSlug = (typeof SCOPES)[number]["slug"];

export const SCOPE_MAP = new Map<string, (typeof SCOPES)[number]>(
  SCOPES.map((scope) => [scope.slug, scope]),
);

export function getScope(slug: string | null | undefined) {
  return SCOPE_MAP.get(slug ?? "") ?? null;
}

export const TEST_LENGTHS = [
  { value: 20, label: "快速", hint: "约 2 分钟" },
  { value: 30, label: "标准", hint: "约 3 分钟" },
  { value: 50, label: "精确", hint: "约 5 分钟" },
] as const;

export function normalizeLength(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(parsed)) return null;
  const length = Math.trunc(parsed as number);
  return TEST_LENGTHS.some((item) => item.value === length) ? length : null;
}

export type Level = {
  min: number;
  label: string;
  note: string;
};

/** Reference bands for an overall (not book-scoped) estimate. */
export const LEVELS: Level[] = [
  { min: 0, label: "起步", note: "基础日常词汇" },
  { min: 1500, label: "高中基础", note: "可应付日常阅读" },
  { min: 3000, label: "四级边缘", note: "距四级大纲仍有距离" },
  { min: 4500, label: "四级水平", note: "达到 CET-4 大纲词汇量" },
  { min: 5800, label: "六级水平", note: "达到 CET-6 大纲词汇量" },
  { min: 6600, label: "考研水平", note: "覆盖考研英语大纲" },
  { min: 8000, label: "雅思 6.5 / 托福 90", note: "可读学术材料" },
  { min: 10000, label: "雅思 7.5 / 托福 105", note: "接近母语者阅读词汇" },
  { min: 11500, label: "GRE 水平", note: "高阶学术词汇储备" },
];

export function levelForScore(score: number): Level {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (score >= level.min) current = level;
  }
  return current;
}

export type CoverageLevel = {
  label: string;
  note: string;
};

export function coverageLevel(coverage: number): CoverageLevel {
  if (coverage >= 0.92) return { label: "烂熟于心", note: "这本书几乎没有盲区" };
  if (coverage >= 0.78) return { label: "相当扎实", note: "核心词掌握良好" };
  if (coverage >= 0.58) return { label: "稳步进阶", note: "常用词已过，进阶词待补" };
  if (coverage >= 0.35) return { label: "基础尚可", note: "建议先补齐高频词" };
  return { label: "刚刚起步", note: "从最高频的词开始更高效" };
}

/** Exam reference points drawn on the 0–12,000 scale. */
export const EXAM_MARKS = [
  { value: 3000, label: "高考" },
  { value: 4500, label: "四级" },
  { value: 5500, label: "考研" },
  { value: 6000, label: "六级" },
  { value: 7000, label: "雅思" },
  { value: 8500, label: "托福" },
  { value: 11000, label: "GRE" },
] as const;

export const SCALE_MAX = 12000;
