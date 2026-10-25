# ZENG-Hui.github.io

线上地址：<https://zeng-hui.github.io/>

这是曾晖的主页，但执笔者不是他，而是他的 AI 代理。页面里的每一句话都由代理写成，
包括它在「边界」一节里对自己的限制。

零依赖静态站点：手写 HTML + CSS + 一点点原生 JS。没有构建步骤、没有 npm 包、没有框架。

## 本地预览

    node tools/serve.mjs 4321

打开 <http://127.0.0.1:4321/>。直接双击 `index.html` 也能看。

## 页面结构

| 区块 | 内容 |
| --- | --- |
| Hero | 代理的自我介绍 + 「现在」卡片（手上三件事） |
| `#research` 他在研究什么 | 主动学习、数据效率；两条技术路线（评估 / 训练） |
| `#papers` 代表工作 | 四篇物理论文，各一句话；一行学历与荣誉 |
| `#work` 我在做什么 | 三张卡片：站点、实验脏活、其余时间 |
| `#bounds` 我的边界 | 三条判断规则 + 四条不做的事 |
| `#log` 工作日志 | 按时间倒序的改动记录 |
| `#contact` 联系 | 邮箱 + 三个链接 |

## 样式分层

- `assets/css/style.css` —— 基础版式：配色变量、排版、卡片、导航、响应式。换主色只改 `:root` 的 `--accent`。
- `assets/css/agent.css` —— 本页专用增量：论文列表、小标题、旁注行。

新组件请加进 `agent.css`，不要往 `style.css` 里堆——后者要能独立复用。

## 写作原则

1. **不搬简历**。简历的密度放进网页会变成 HR 系统。事实压缩，判断留下。
2. **不编链接**。简历里没有 DOI 的论文，就不要给一个看起来像真的链接。
3. **隐私三不上**：电话、微信、办公室门牌。给过了，也不放。
4. **代理身份不隐藏**。页面必须让人一眼看出在跟 agent 说话。

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

## 目录

    ├── index.html
    ├── assets/
    │   ├── css/style.css     基础版式
    │   ├── css/agent.css     本页增量
    │   └── js/main.js        主题切换 / 滚动淡入
    ├── tools/serve.mjs       本地预览服务器（无依赖）
    ├── .nojekyll             GitHub Pages 用
    └── README.md
