# ZENG-Hui.github.io

线上地址：<https://zeng-hui.github.io/>

曾晖的个人主页。页面由他的「小鲸鱼」助手维护——以第三方口吻介绍他，
而不是假装成他本人在说话。

零依赖静态站点：手写 HTML + CSS + 一点点原生 JS。没有构建步骤、没有 npm 包、没有框架。

## 本地预览

    node tools/serve.mjs 4321

打开 <http://127.0.0.1:4321/>。直接双击 `index.html` 也能看。

## 页面结构

| 区块 | 内容 |
| --- | --- |
| Hero | 小鲸鱼的开场 + 「近况」卡片（手上三件事） |
| `#about` 关于他 | 现在做什么、学历、从物理到模型的线索 |
| `#research` 他在忙什么 | 主动学习、数据效率；两条技术路线 |
| `#papers` 代表工作 | 四篇物理论文，各一句话 |
| `#contact` 联系他 | 邮箱；说明初步来信由助手先看 |

## 背景里的小虎鲸：一堆 0 和 1

`index.html` 里只有一行 `<canvas id="ocean">`。虎鲸完全由字组成，没有图片。

**它是怎么长出来的**（`assets/js/orca-bits.js`）：

1. 在「身体坐标系」里画一遍白剪影（身子、背鳍、尾鳍、胸鳍），得到一个掩膜；
2. 对掩膜做一次倒角距离变换，每个点都知道自己离轮廓有多远；
3. 按固定格距铺格子，落在剪影里的格子放一个字——`0` 或 `1`；
4. 离轮廓越近越亮（`exp(-d)`），越靠外越稀（`keepProb` 随距离衰减），
   于是边缘不是一条硬边，而是一圈化进黑暗里的碎点。

所以"复现"不是淡入淡出，是**阈值**：每个字有自己的出生阈值，`appear` 从 0 抬到 1 时，
字从散点里一层层长出来。散开时反过来。

**它的一生**（`assets/js/ocean.js`）：

| 阶段 | 行为 |
| --- | --- |
| off | 消失 4–10 秒（只在黑暗里） |
| 浮现 | 2.2 秒，字逐个亮起，勾出虎鲸的轮廓 |
| 游动 | 16–28 秒，约 13 px/s 往右飘，尾鳍摆动 22°，身体走正弦波 |
| 抬头 | 每隔 14–25 秒停一次：速度降到 12%，眼睛放大、眨两下，约 3.4 秒 |
| 散开 | 2.4 秒，字往外掉光 |

其他约束：

- `pointer-events: none`，不挡点击、不参与选中；
- `z-index: 0`，正文在 `z-index: 1`，永远压在文字下面；
- 每帧只画字，不触发布局；渲染限到约 35fps；切到后台停 rAF；
- `prefers-reduced-motion` 下不游，只静态画一帧；
- 出错时自己停掉（`try/catch`），不会连累页面上其他脚本。

想调整：`ocean.js` 顶部的 `CFG`（速度、持续时长、间距、透明度）；字形与配色在 `orca-bits.js` 的 `makeAtlas` 里。

**回退**：上一版是纯 SVG 的虎鲸（`git tag v1-svg-orca`）。要退回去：

    git checkout v1-svg-orca -- index.html assets/css/agent.css assets/js/ocean.js

## 样式分层

- `assets/css/style.css` —— 基础版式：配色变量、排版、卡片、导航、响应式。换主色只改 `:root` 的 `--accent`。
- `assets/css/agent.css` —— 本页增量：论文列表、旁注行、鲸鱼图层。

新组件请加进 `agent.css`，不要往 `style.css` 里堆——后者要能独立复用。

## 写作原则

1. **第三人称**。页面介绍的是曾晖，说话的是助手，两者不能混。
2. **不搬简历**。简历的密度放进网页会变成 HR 系统。事实压缩，判断留下。
3. **不编链接**。没有 DOI 的论文就不给链接，不造一个看起来像真的。
4. **只写对访客有用的事**。联系方式只留邮箱。

## 发布

推到 `main` 就等于发布（仓库名是 `<用户名>.github.io`），通常一分钟内生效。

    git add -A
    git commit -m "..."
    git push

## 踩过的坑

1. **沙盒里 `git push` 报 `signal pipe, Win32 error 5`**
   Git 自带的 MSYS ssh 依赖命名管道。改用系统 OpenSSH：

       git config core.sshCommand "C:/Windows/System32/OpenSSH/ssh.exe"

2. **PowerShell 5.1 的 `Add-Content -Encoding utf8`**
   会写入 BOM、并把换行变成字面量 `\n`，CSS 直接坏掉。
   改样式请用编辑器或 Node 的 `writeFile(..., 'utf8')`。

3. **Pages 设置页的 Save 是灰的**
   说明 Pages 已经启用（`has_pages: true`），没有待保存的改动。

4. **层叠陷阱**：给 `.site-header` 设 `position: relative` 会把 sticky 顶掉。
   背景层与内容的层级只加在 `main` 和 `.site-footer` 上。

## 目录

    ├── index.html
    ├── assets/
    │   ├── css/style.css     基础版式
    │   ├── css/agent.css     本页增量
    │   ├── js/main.js        主题切换 / 滚动淡入
    │   └── js/ocean.js       背景虎鲸
    ├── tools/serve.mjs       本地预览服务器（无依赖）
    ├── .nojekyll             GitHub Pages 用
    └── README.md
