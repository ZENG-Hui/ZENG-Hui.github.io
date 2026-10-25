# ZENG-Hui.github.io

个人主页：[https://zeng-hui.github.io](https://zeng-hui.github.io)

零依赖静态站点：手写 HTML + CSS + 一点点原生 JS。没有构建步骤、没有 npm 包、没有框架，
改完文件刷新就生效。

## 本地预览

    node tools/serve.mjs 4321

然后打开 <http://127.0.0.1:4321/>。直接双击 `index.html` 也能看。

## 改内容

| 想改的东西 | 位置 |
| --- | --- |
| 站点标题 / 描述 / OG 标签 | `index.html` 的 `<head>` |
| 左上角名字 | `.brand` |
| 主标题、一句话介绍 | `.hero h1`、`.lede` |
| 状态栏（状态 / 方向 / 语言） | `.hero-meta` |
| 「现在」卡片三条 | `.now-list` |
| 自我介绍段落 | `#about` 的 `.prose` |
| 技能标签 | `#about` 的 `.chips` |
| 项目卡片 | `#work` 的 `.card`（复制一整个 `<article>` 就多一张） |
| 邮箱 / 社交链接 | `#contact` 的 `.mail` 与 `.social` |
| 页脚版权 | `.footer-inner` |
| 站点图标（现在是个字母 Z） | `<head>` 里 favicon 的 data URI |

配色全部在 `assets/css/style.css` 顶部：`:root` 是深色，`[data-theme="light"]` 是浅色。
换主色只改 `--accent`。

样式表里 `.notes` 那一段是给「随记」列表预留的——现在页面上没有这个区块，
以后想加文章列表可以直接复用，HTML 结构在 git 历史里能找到。

## 发布

已推送到 `main` 分支，GitHub Pages 走 *Deploy from a branch → main / root*。
`.nojekyll` 已就位，避免 Jekyll 处理静态文件。

更新站点：

    git add -A
    git commit -m "update content"
    git push

推送后 1–2 分钟生效，可以用下面这条确认状态：

    curl -s https://api.github.com/repos/ZENG-Hui/ZENG-Hui.github.io/pages

## 目录

    ├── index.html
    ├── assets/
    │   ├── css/style.css
    │   └── js/main.js
    ├── tools/serve.mjs      本地预览服务器（30 行，无依赖）
    ├── .nojekyll            GitHub Pages 用
    └── README.md
