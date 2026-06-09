# Contributing

感谢你考虑为 Tool Platform 做贡献。这个项目是一个浏览器插件化工具平台，贡献重点通常是新增工具、改进平台运行时、提升工具质量和完善文档。

## 开发环境

- Node.js 20+
- pnpm 10.x，仓库通过 packageManager 固定为 pnpm@10.28.1
- 推荐启用 Corepack

    corepack enable
    pnpm install
    pnpm dev

开发服务默认运行在 http://localhost:3000。

## 提交前检查

提交 PR 前至少运行：

    pnpm lint
    pnpm test
    pnpm build

如果新增、删除或重命名工具，请先运行：

    pnpm generate:tools

生成文件位于 `packages/tool-sdk/src/generated/*`，应随相关工具变更一起提交。

## 新增工具

创建本地工具：

    pnpm create-tool my-tool --name "My Tool" --category developer-tools --runtime simple

创建远程 iframe 工具：

    pnpm create-tool vendor-tool --name "Vendor Tool" --category developer-tools --runtime remote --remote-url https://tools.example.com/app

本地工具目录包含：

    tools/my-tool/
    ├── package.json
    ├── manifest.ts
    ├── app.tsx
    └── README.md

远程 iframe 工具目录包含：

    tools/vendor-tool/
    ├── package.json
    ├── manifest.ts
    └── README.md

工具要求：

- `manifest.id` 必须和目录名一致。
- `category` 必须使用 `packages/tool-contracts/src/index.ts` 中定义的 category id，例如 `developer-tools`、`data-tools`。
- 本地工具必须导出 `./manifest` 和 `./app`；远程 iframe 工具只导出 `./manifest`。
- 远程 iframe 工具必须设置 `runtime: "remote"` 和 `microFrontend.kind: "iframe"`。
- `description`、`tags`、`subCategory` 应使用用户会搜索的关键词。
- 工具 UI 应保持自包含，不要把工具业务逻辑写进 `apps/web`。
- 大文件、重计算或长任务优先使用 Worker、WASM 或专用 runtime。
- 涉及文件、剪贴板、摄像头、麦克风、通知等能力时，应在 manifest 中声明权限，并在 UI 中保持清晰反馈。

## 分类

当前支持的 category id：

    ai-tools, developer-tools, ops-tools, security-tools, file-tools, image-tools, media-tools, text-tools, data-tools, office-tools, design-tools, seo-tools, webmaster-tools, learning-tools, calculator-tools, social-tools, ecommerce-tools, productivity-tools, entertainment-tools, discovery-tools

## 代码风格

- TypeScript 优先，保持类型边界清晰。
- 复用现有 runtime、SDK 和组件约定。
- 变更范围保持聚焦，不在同一个 PR 中混入无关重构。
- 不提交密钥、真实用户数据、生产日志或不可公开的样例数据。

## PR 建议

一个好的 PR 应包含：

- 变更目的和影响范围。
- 用户可见行为说明。
- 测试命令和结果。
- 新增工具截图或简短说明，尤其是 UI 变化。
- 对安全、隐私、文件处理或远程请求的说明。
