# Tool Platform UI / UX 设计系统文档

# 1. UI 设计目标

打造一个：

* 现代化
* 高可扩展
* 工具型产品友好
* AI 工具友好
* 开发者友好
* 长时间使用舒适
* 多工具协同清晰

的 Tool Platform UI 体系。

核心目标：

# UI 不只是“好看”

而是：

# 高效率工具工作台（Workspace）

---

# 2. UI 设计理念

## 2.1 平台定位

本平台不是普通官网。

而是：

```text
Web App Platform
Developer Workspace
Browser Tool OS
```

因此 UI 设计应该更接近：

* IDE
* 工作台
* 专业工具软件
* SaaS 平台

而不是营销官网。

---

## 2.2 UI 核心原则

## 极简

减少视觉噪音。

---

## 工具优先

功能高于装饰。

---

## 内容优先

让用户专注于工具本身。

---

## 高信息密度

适合长期使用。

---

## 一致性

所有工具共享统一交互。

---

# 3. 设计风格推荐

推荐：

```text
Linear
Vercel
Raycast
Notion
VSCode
```

融合风格。

---

# 4. 主题系统

## 4.1 必须支持 Dark Mode

工具平台：

# 深色主题优先

推荐默认：

```text
Dark Mode
```

---

## 4.2 推荐主题结构

```text
Light
Dark
OLED
System
```

---

## 4.3 主题变量

推荐使用：

```css
--background
--foreground
--primary
--secondary
--border
--muted
--card
--accent
```

---

# 5. 页面整体布局

推荐布局：

```text
┌──────────────────────────────┐
│ Top Navigation               │
├──────────────┬───────────────┤
│ Sidebar      │ Main Content  │
│              │               │
│ 分类          │ 工具区域       │
│ 搜索          │               │
│ 收藏          │               │
│ 历史          │               │
└──────────────┴───────────────┘
```

---

# 6. 首页设计

## 6.1 首页目标

首页应该：

* 快速进入工具
* 快速搜索
* 展示热门工具
* 展示分类
* 展示工作区

而不是大量介绍文案。

---

## 6.2 推荐首页结构

```text
Hero
↓
全局搜索
↓
快捷工具
↓
分类入口
↓
热门工具
↓
最近使用
↓
AI Workspace
```

---

## 6.3 Hero 区域

推荐：

```text
标题
搜索框
快速入口
```

避免：

* 大量 Banner
* 复杂动画
* 营销文案

---

# 7. 导航系统设计

## 7.1 Top Navigation

推荐包含：

```text
Logo
搜索
主题切换
用户中心
通知
```

---

## 7.2 Sidebar

推荐：

```text
AI工具
开发工具
运维工具
网络安全
文件工具
图片工具
视频音频
文本工具
数据工具
办公工具
设计工具
SEO工具
站长工具
学习工具
计算工具
社媒工具
电商工具
效率工具
娱乐工具
导航发现
收藏
历史
```

---

## 7.3 Command Menu（强烈推荐）

推荐：

```text
⌘K / Ctrl+K
```

快速打开工具。

类似：

* Raycast
* VSCode
* Linear

---

# 8. 搜索系统 UI

## 8.1 搜索是核心入口

工具平台：

# 搜索比导航更重要

---

## 8.2 搜索框设计

推荐：

```text
全局搜索
支持工具/标签/功能搜索
```

---

## 8.3 搜索结果

推荐显示：

```text
工具名称
分类
标签
最近使用
快捷操作
```

---

# 9. 工具卡片设计

## 9.1 卡片结构

推荐：

```text
图标
工具名
简介
标签
收藏按钮
最近使用时间
```

---

## 9.2 卡片尺寸

推荐：

```text
统一高度
支持 Grid
支持 List
```

---

## 9.3 Hover 效果

推荐：

* 边框高亮
* Shadow 微变化
* 背景轻变化

避免：

* 大幅动画
* 复杂特效

---

# 10. 工具页面设计

## 10.1 页面结构

推荐：

```text
Tool Header
↓
Tool Workspace
↓
Tool Actions
↓
Tool Docs
↓
FAQ
```

---

## 10.2 Tool Header

包含：

```text
工具名
描述
标签
收藏
分享
```

---

## 10.3 Workspace

工具核心区域。

应占据最大空间。

---

## 10.4 Tool Actions

推荐：

```text
复制
下载
导出
重置
分享
```

---

# 11. Workspace 设计

## 11.1 Workspace 是核心

工具平台最重要的不是页面。

而是：

# 工作区（Workspace）

---

## 11.2 推荐 Workspace 布局

```text
Input
↓
Processing
↓
Output
```

---

## 11.3 双栏布局（推荐）

适用于：

```text
JSON
Markdown
代码转换
AI
```

布局：

```text
输入区 | 输出区
```

---

## 11.4 多面板布局

适用于：

```text
AI Studio
视频编辑
OCR
```

布局：

```text
Sidebar
Canvas
Preview
Logs
```

---

# 12. AI 工具 UI

## 12.1 AI 工具特殊性

AI 工具不是普通表单。

而是：

# 对话 + 工作流

---

## 12.2 推荐 AI 布局

```text
Prompt Area
↓
Context
↓
Result
↓
Actions
```

---

## 12.3 流式输出

必须支持：

```text
stream response
```

---

## 12.4 AI 状态反馈

推荐：

```text
thinking
running
loading model
processing
```

---

# 13. WASM 工具 UI

## 13.1 WASM 工具特点

通常：

* 运行时间长
* 文件大
* 内存高

因此必须：

* 明确状态
* 明确进度
* 明确资源使用

---

## 13.2 推荐 UI

```text
Progress
Memory Usage
Task Queue
Logs
```

---

# 14. 文件处理 UI

## 14.1 Upload Zone

推荐：

```text
Drag & Drop
Paste
Select File
```

---

## 14.2 文件列表

显示：

```text
文件名
大小
类型
状态
```

---

## 14.3 大文件处理

必须：

```text
进度条
暂停
取消
重试
```

---

# 15. 在线 IDE UI

## 15.1 推荐布局

```text
Sidebar
Editor
Terminal
Preview
```

---

## 15.2 编辑器

推荐：

```text
Monaco Editor
```

---

## 15.3 Terminal

推荐：

```text
xterm.js
```

---

# 16. Dashboard 设计

## 16.1 Dashboard 功能

推荐：

```text
最近使用
收藏工具
工作区
AI 历史
文件历史
```

---

## 16.2 Analytics Dashboard

推荐：

```text
热门工具
使用时长
最近任务
资源占用
```

---

# 17. 响应式设计

## 17.1 Desktop First

工具平台：

# 优先 Desktop

---

## 17.2 平板支持

推荐：

```text
折叠 Sidebar
```

---

## 17.3 Mobile 策略

推荐：

* 保留轻工具
* 简化 Workspace
* 隐藏复杂面板

---

# 18. 动画系统

## 18.1 推荐动画原则

```text
轻
快
少
```

---

## 18.2 推荐动画场景

适合：

```text
Modal
Sidebar
Command Menu
Tool Switch
```

---

## 18.3 避免

避免：

```text
大面积粒子动画
复杂 3D
首页重动画
```

---

# 19. 图标系统

## 19.1 推荐图标库

推荐：

```text
Lucide
Tabler Icons
```

---

## 19.2 图标规则

统一：

```text
线性图标
统一尺寸
统一描边
```

---

# 20. 字体系统

## 20.1 推荐字体

推荐：

```text
Inter
Geist
```

中文推荐：

```text
MiSans
HarmonyOS Sans
Noto Sans SC
```

---

## 20.2 字体层级

推荐：

```text
Heading
Title
Body
Caption
Code
```

---

# 21. 颜色系统

## 21.1 推荐主色

推荐：

```text
Blue
Indigo
Slate
```

---

## 21.2 功能色

```text
Success
Warning
Danger
Info
```

---

## 21.3 避免

避免：

```text
高饱和渐变
大量彩虹色
复杂背景
```

---

# 22. Design System

## 22.1 推荐组件层级

```text
Primitive
Component
Pattern
Template
Page
```

---

## 22.2 推荐组件

基础组件：

```text
Button
Input
Textarea
Card
Tabs
Dialog
Tooltip
Dropdown
```

---

## 22.3 高级组件

```text
Tool Workspace
File Explorer
Command Menu
AI Chat
Task Queue
```

---

# 23. Tool Workspace Components

## 23.1 推荐核心组件

```text
Editor
Preview
Uploader
Console
Logs
Sidebar
Inspector
```

---

## 23.2 工具状态组件

```text
Loading
Progress
Error
Success
```

---

# 24. UX 设计原则

## 24.1 减少步骤

用户应该：

```text
打开即用
```

---

## 24.2 避免复杂配置

默认即可运行。

---

## 24.3 实时反馈

必须明确：

```text
运行中
加载中
失败
成功
```

---

## 24.4 Undo / Redo

推荐支持：

```text
撤销
重做
```

---

# 25. Accessibility

## 25.1 必须支持

```text
键盘导航
焦点管理
ARIA
高对比度
```

---

## 25.2 Command First

推荐大量快捷键。

---

# 26. 性能 UX

## 26.1 Skeleton

推荐：

```text
Skeleton Loading
```

---

## 26.2 Progressive Loading

推荐：

```text
渐进加载
```

---

## 26.3 懒加载

大型工具：

```text
动态 import
```

---

# 27. Workspace OS 化（高级阶段）

未来推荐：

```text
多个工具同时运行
多窗口
Dock
Workspace Layout
```

---

# 28. 多工具协同 UI

例如：

```text
OCR
→ AI 总结
→ Markdown
→ PDF
```

UI 推荐：

```text
Workflow Canvas
```

---

# 29. 推荐 UI 技术栈

推荐：

```text
React
Tailwind
shadcn/ui
Framer Motion
Lucide
Monaco Editor
xterm.js
```

---

# 30. 最终 UI 目标

最终目标不是：

```text
一个漂亮网站
```

而是：

# Browser Workspace / Tool OS UI

具备：

* Workspace
* Runtime
* 多工具协同
* AI 工作流
* 文件系统
* 多窗口
* Tool Dock
* Command Center

等现代工具平台能力。
