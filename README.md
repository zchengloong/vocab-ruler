# 词尺 · Vocab Ruler

仿墨墨背单词「词汇量测试」的自适应英语词汇量 Web 应用。30 道四选一，按作答实时调整题目难度，最后给出带 **90% 置信区间** 的词汇量，以及它对应的四级、六级、考研、托福、雅思、GRE 位置。

[![首页](docs/screenshots/home.png)](docs/screenshots/home.png)

## 功能

- **四选一 + 不认识**：每题四个中文释义，可点「不认识」。不是简单数正确率，而是用 3PL 项目反应模型校正 25% 的蒙对概率。
- **自适应出题**：每次作答后更新能力估计 θ，在 θ 附近抽取下一道词频难度相近的词；已出现的词不会重复。
- **多词书**：综合 12,000 词、四级 3,830、六级 5,382、考研 4,799、托福 6,843、雅思 4,721、GRE 7,122。综合测整体词汇量，单项测对应词书掌握量。
- **结果可解释**：词汇量点估计、90% 置信区间、正确率、用时、四段词频的掌握率、与常见考试参考线的对照。
- **逐题回顾与生词本**：回看每道题的正确释义与你的选择，点星标加入生词本；支持搜索、朗读、CSV 导出。
- **历史趋势**：多次测试的词汇量/词库覆盖率曲线，含置信区间阴影。
- **分享卡片**：浏览器 Canvas 生成 1080 × 1350 PNG，可下载或复制文案。
- **免登录**：历史与生词本保存在浏览器 localStorage；服务端只匿名保存测试结果 30 天，用于刷新/分享后仍可查看。
- **响应式**：桌面与移动端均可完成整场测试。

## 快速开始

要求 **Node.js ≥ 22.5**（使用内置 `node:sqlite`，无需原生编译）。

```bash
npm install
npm run dev
# http://localhost:3210
```

如果默认 npm 源较慢（本机实测中国大陆网络很慢），可改用镜像：

```bash
npm install --registry=https://registry.npmmirror.com
```

生产构建：

```bash
npm run build
npm start
```

`predev` / `prebuild` 会自动检查 `data/vocab.db`；缺失时会从已提交的 `data/vocab.db.gz` 解压恢复，因此全新 clone 不需要联网下载 63MB 的 ECDICT。

## 项目内隔离

没有全局安装，也不依赖 Docker：

- 依赖全部落在项目内 `node_modules/`；
- npm 缓存通过 `.npmrc` 指向项目内 `.cache/npm`（环境变量优先时请在命令里显式加 `--cache .cache/npm`）；
- 生成的数据库、CSV 原始数据、构建产物、截图与缓存均已加入 `.gitignore`，只有 2.1MB 的数据库快照 `data/vocab.db.gz` 会进版本库。

## 词库流水线

数据源是 [ECDICT](https://github.com/skywind3000/ECDICT)（MIT License，约 77 万词条，含中文释义、词频与考试标签）。

```bash
# 1. 下载（约 63MB；raw.githubusercontent.com 不通时可用 codeload）
curl -L -o data/ecdict.tar.gz \
  https://codeload.github.com/skywind3000/ECDICT/tar.gz/refs/heads/master
tar -xzf data/ecdict.tar.gz --wildcards '*/ecdict.csv' --strip-components=1 -C data
rm data/ecdict.tar.gz

# 2. 清洗、生成干扰项、写入 SQLite 并压缩快照
npm run db:build
```

构建结果（`data/bank-meta.json` 中也有记录）：

| 词书 | 收录词数 |
| --- | ---: |
| 综合词汇（按词频取前 12,000） | 12,000 |
| 四级 CET-4 | 3,830 |
| 六级 CET-6 | 5,382 |
| 考研英语 | 4,799 |
| 托福 TOEFL | 6,843 |
| 雅思 IELTS | 4,721 |
| GRE | 7,122 |

清洗规则：

- 仅保留带考试标签（`zk/gk/cet4/cet6/ky/toefl/ielts/gre`）、有中文释义、有词频排名的小写单词；
- 处理 ECDICT 的 `\n` 转义、POS 前缀、`[网络]`/`[人名]` 行、含英文的括注；
- 每条释义最多取 2 个义项，按中文分号连接并做边界截断；
- 干扰项从相同词性、相近词频、相近长度的词中确定性抽取，避免同义释义和同词根泄漏；
- 每个词条生成 3 个干扰项；本次构建 14,088 词全部成功。

## 算法

完整推导在应用内 `/method` 页面，代码核心在 `lib/irt.ts`、`lib/engine.ts`。

1. 词频百分位 `p` 映射为难度：`b = 1.55 × Φ⁻¹(p)`，截断到 `[−3.4, 3.4]`。
2. 四选一作答用 3PL：`P(答对|θ) = c + (1−c)/(1+e^(−a(θ−b)))`，取 `a=1.1`、`c=0.25`。
3. 每答一题，在 `[−4.5, 4.5]` 的网格上计算后验（先验 `N(0, 1.35²)`）。
4. 下一题从难度距当前 θ 最近的一批未出现词中随机抽取。
5. 词汇量估计为 `Σ_i ∫ P(掌握_i|θ)p(θ|作答)dθ`；5%/95% 分位构成 90% 置信区间。
6. 词书模式以该词书内部排序计算 b 与 θ，因此不能把「四级 3,500」和「综合 8,000」直接比较。

## 页面与 API

| 路由 | 说明 |
| --- | --- |
| `/` | 首页、词书与题量选择、最近记录 |
| `/test?scope=all&length=30` | 答题流程；支持键盘 1–4 / A–D、N / 空格不认识、Enter 下一题 |
| `/result/[id]` | 结果、置信区间、等级对照、逐题回顾、分享卡片 |
| `/history` | 趋势图、记录列表、删除/清空 |
| `/wordbook` | 生词本、搜索、导出 CSV |
| `/method` | 方法、数据与隐私、局限说明 |

| API | 说明 |
| --- | --- |
| `POST /api/tests` | `{scope, length}` → 创建测试与第一题 |
| `POST /api/tests/:id/answer` | `{wordId, choice}`，`choice=null` 表示不认识 |
| `GET /api/tests/:id` | 已完成测试的结果 |
| `DELETE /api/tests/:id` | 删除匿名测试记录 |
| `GET /api/health` | 词库健康检查与词书规模 |

服务端不返回未作答题目的正确答案；选项顺序由 `testId + wordId` 的哈希确定，提交时服务端可复算并校验。

## 验证

```bash
npm run typecheck   # TypeScript strict
npm test            # Node 内置 test runner：IRT、词库清洗
npm run build       # Next.js 生产构建
```

浏览器端已在 Windows Edge（CDP）+ `scripts/visual-check.mjs` 中跑通完整流程：首页 → 选择 20 题 → 逐题作答 → 结果页 → 星标生词 → 分享卡片 → 历史 → 生词本，并检查 console/page error 为零。截图位于 [`docs/screenshots`](docs/screenshots)。

```bash
# 可选：本机 Windows Edge 已用 --remote-debugging-port=9222 启动时
node scripts/visual-check.mjs
```

## 隐私

- 不设账号、不收集邮箱或设备指纹；
- 历史记录与生词本只写 localStorage；
- 服务端保存的是无身份标识的测试 JSON（UUID 主键），30 天后启动新测试时自动清理；
- 在历史页删除记录会同时请求 `DELETE /api/tests/:id`；
- 分享卡片只在浏览器内生成，不上传图片。

## 目录

```
app/                  Next.js App Router 页面与 API
components/           测试流、结果、历史、生词本、分享卡片等
lib/
  irt.ts              3PL、EAP 后验、词汇量积分、分位
  engine.ts           抽题、作答校验、结果生成
  db.ts               node:sqlite 连接、词库与测试表
  books.ts            词书、等级参考线
  storage.ts          localStorage 历史/生词本
scripts/
  build-db.mjs        ECDICT CSV → SQLite + 干扰项 + gzip
  ensure-db.mjs       从快照恢复数据库
  visual-check.mjs    Edge CDP 视觉/流程回归
data/
  vocab.db.gz         构建好的词库快照（提交）
  bank-meta.json      词库元信息（提交）
tests/                IRT 与清洗单元测试
docs/screenshots/     桌面/移动端截图
```

## 已知局限

- 词频只是难度的近似；熟词僻义、抽象词的难度可能被低估或高估。
- 中文释义与干扰项来自 ECDICT 与程序生成，可能有个别不自然的选项。
- 四选一无法完全消除蒙对；模型只能从统计上校正。
- 自适应抽题导致四段词频题量不均，词书覆盖率是模型估计而非逐词普查。
- 结果不是四六级/托福/雅思/GRE 分数，也不代表听说读写综合能力。

## 致谢

- 词库：[ECDICT](https://github.com/skywind3000/ECDICT)，MIT License；
- 交互灵感：墨墨背单词的词汇量测试；
- 本项目的视觉、文案与代码为独立实现。

## License

MIT（见 [LICENSE](LICENSE)）。ECDICT 数据仍归其原作者所有。
