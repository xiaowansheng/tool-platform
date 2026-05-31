import type { ToolManifest, ToolPermission, ToolRuntime } from "@tool-platform/tool-contracts";

export type ToolPageGuide = {
  name: string;
  description: string;
  intro: string;
  steps: string[];
  examples: string[];
};

const zhToolPageGuides: Record<string, ToolPageGuide> = {
  "json-formatter": {
    name: "JSON 格式化工具",
    description: "格式化、压缩并校验 JSON 文本，适合接口调试、配置整理和日志排查。",
    intro: "把接口响应、配置片段或日志里的 JSON 粘贴进来，快速得到缩进清晰或单行压缩的结果；解析失败时会直接显示错误原因。",
    steps: [
      "将 JSON 文本粘贴到输入区。",
      "选择 2、4 或 8 空格缩进后点击格式化；需要单行输出时点击压缩。",
      "如果出现解析错误，按错误提示检查逗号、引号、括号和转义字符。"
    ],
    examples: ["把 API 返回值整理成可读结构。", "发布前将配置 JSON 压缩成一行，方便写入环境变量。"]
  },
  "base64-studio": {
    name: "Base64 编解码工作台",
    description: "对文本进行 Base64 编码和解码，支持中文等 UTF-8 内容。",
    intro: "用于处理 HTTP Basic Auth、Data URL、配置片段或调试日志中的 Base64 文本，输入和输出都保留在本地浏览器中。",
    steps: [
      "输入原始文本后点击编码，生成 Base64 字符串。",
      "输入 Base64 字符串后点击解码，恢复 UTF-8 文本。",
      "解码失败时先检查是否有多余空格、换行或非 Base64 字符。"
    ],
    examples: ["将 `用户名:密码` 编码为 Basic Auth 片段。", "把日志中的 Base64 payload 解码成可读文本。"]
  },
  "url-codec": {
    name: "URL 编解码工具",
    description: "编码或解码 URL、查询参数和路径片段，避免特殊字符破坏链接。",
    intro: "适合处理回调地址、带中文的链接、查询参数和嵌套 URL，快速确认最终发送给浏览器或接口的字符串。",
    steps: [
      "粘贴完整 URL、查询参数或路径片段。",
      "选择编码或解码，查看特殊字符、空格和中文的转换结果。",
      "复制结果前确认是否需要保留 `?`、`&`、`/` 这类结构字符。"
    ],
    examples: ["把中文搜索词编码到查询参数中。", "解码 OAuth redirect_uri，检查实际回调地址。"]
  },
  "query-param-builder": {
    name: "查询参数构建器",
    description: "拆解、编辑并重新生成 URL 查询参数，适合排查分享链接和 API 请求。",
    intro: "把带参数的 URL 放进工具后，可以逐项查看参数名和值，减少手写 `&`、`=` 和转义时的错误。",
    steps: [
      "粘贴已有链接或从空白参数开始编辑。",
      "逐项调整参数名和值，删除无效参数。",
      "复制生成后的 URL，用于接口调试、埋点链接或分享链接。"
    ],
    examples: ["整理带 UTM 参数的落地页链接。", "为 API 请求拼出稳定的筛选和分页参数。"]
  },
  "hash-generator": {
    name: "哈希生成器",
    description: "为文本生成常用摘要，便于校验内容、生成标识和比对变更。",
    intro: "输入任意文本后生成摘要值，适合检查内容是否变更、生成短标识或辅助排查缓存命中问题。",
    steps: [
      "粘贴需要摘要的文本内容。",
      "选择或查看目标哈希算法的输出。",
      "把摘要值用于比对，不要把普通哈希当作密码存储方案。"
    ],
    examples: ["对配置片段生成摘要，确认两份配置是否一致。", "为文档内容生成可追踪的短指纹。"]
  },
  "timestamp-converter": {
    name: "时间戳转换器",
    description: "在 Unix 时间戳和可读日期时间之间互转，适合日志、接口和排障场景。",
    intro: "快速确认秒级或毫秒级时间戳对应的具体时间，并把日期时间转换为接口常用的 Unix 时间戳。",
    steps: [
      "输入 Unix 时间戳或日期时间。",
      "根据来源确认单位是秒还是毫秒。",
      "对照本地时间和 UTC 时间，避免跨时区排查时误判。"
    ],
    examples: ["把日志中的 `1717238400` 转成可读时间。", "为接口请求生成某个截止时间的毫秒时间戳。"]
  },
  "jwt-decoder": {
    name: "JWT 解码器",
    description: "本地解码 JWT 的 Header 和 Payload，并标记过期时间与签名状态。",
    intro: "粘贴 Token 后立即查看 Base64URL 解码结果，适合排查登录态、OAuth 回调和接口鉴权问题。",
    steps: [
      "粘贴 JWT 字符串，工具会拆分 Header、Payload 和 Signature。",
      "查看 alg、exp、签名是否存在等摘要信息。",
      "只用它做解码排查；需要确认签名可信时请切换到 JWT JWK Verifier。"
    ],
    examples: ["检查用户 Token 的角色字段和过期时间。", "排查接口 401 是否由 exp 已过期引起。"]
  },
  "jwt-jwk-verifier": {
    name: "JWT/JWK 签名校验器",
    description: "用 HMAC 密钥或 RSA 公钥 JWK 在本地校验 HS256 / RS256 JWT 签名。",
    intro: "适合确认 Token 是否被指定密钥签发，默认 HS256 示例可以直接验证通过，便于理解输入格式。",
    steps: [
      "粘贴完整 JWT，并填写 HMAC secret 或 RSA public JWK。",
      "点击验证签名，查看解码内容、算法和校验结果。",
      "校验失败时检查 alg、密钥来源、JWK 格式和 Token 是否被改写。"
    ],
    examples: ["用服务端共享密钥验证 HS256 调试 Token。", "用身份提供方 JWKS 中的公钥验证 RS256 Token。"]
  },
  "webhook-signature-verifier": {
    name: "Webhook 签名校验器",
    description: "本地验证 GitHub、Stripe、Slack Webhook 的 HMAC 签名。",
    intro: "用平台实际收到的原始 Body、签名请求头 和密钥重算 HMAC，快速定位回调验签失败的原因。",
    steps: [
      "选择 GitHub、Stripe 或 Slack，并填入签名密钥。",
      "粘贴原始 Body、时间戳和签名请求头。",
      "点击验证签名，对比工具生成的期望 Header。"
    ],
    examples: ["排查 GitHub webhook 的 X-Hub-Signature-256 不匹配。", "确认 Stripe 签名是否因时间戳或 Body 格式变化而失败。"]
  },
  "cors-diagnostics": {
    name: "CORS 诊断工具",
    description: "生成 CORS 响应头，并诊断凭据、Origin 和预检方法配置问题。",
    intro: "输入请求 Origin、允许列表、方法和请求头后，生成推荐响应头并指出常见跨域配置错误。",
    steps: [
      "填写请求 Origin 和服务端允许的 Origin 列表。",
      "配置允许方法、允许请求头和是否携带凭据。",
      "复制生成的响应头，并根据诊断结果修正服务端配置。"
    ],
    examples: ["排查浏览器提示 CORS preflight failed。", "检查 credentials 模式下是否错误使用 wildcard origin。"]
  },
  "http-security-headers-checker": {
    name: "HTTP 安全头检查器",
    description: "检查 CSP、HSTS、XFO、Cookie Flags 等响应 Header 安全配置。",
    intro: "把响应头粘贴进来即可看到评分、通过项和待处理建议，适合上线前快速复核 Web 安全基线。",
    steps: [
      "从浏览器 DevTools、curl 或代理工具复制响应头。",
      "查看 CSP、HSTS、Cookie 等检查项是否通过。",
      "按待处理建议补齐 Header，再结合业务场景复核策略。"
    ],
    examples: ["检查生产站点是否缺少 HSTS。", "确认 Cookie 是否包含 Secure、HttpOnly 和 SameSite。"]
  },
  "cvss-calculator": {
    name: "CVSS 计算器",
    description: "计算 CVSS v3.1 基础分、严重级别和标准 Vector 字符串。",
    intro: "按 CVSS v3.1 基础指标逐项选择，自动生成分数和 Vector，适合漏洞报告、分级处置和复核评级。",
    steps: [
      "根据漏洞触发条件选择攻击向量、复杂度、权限和用户交互。",
      "选择机密性、完整性、可用性影响。",
      "复制生成的 CVSS Vector 写入报告或工单。"
    ],
    examples: ["为远程未授权 RCE 生成高危或严重评分。", "对需要本地权限和用户交互的漏洞复核评分。"]
  },
  "basic-auth-generator": {
    name: "Basic Auth 生成器",
    description: "生成 HTTP Basic Authorization 请求头，支持中文用户名和密码。",
    intro: "输入用户名和密码后，本地生成 `Authorization: Basic ...` 请求头，适合接口调试、curl 示例和临时网关验证。",
    steps: [
      "填写用户名和密码，必要时先确认服务端是否要求 UTF-8。",
      "复制完整 Authorization Header 或只复制 Base64 token。",
      "避免在共享屏幕或不可信设备上输入生产凭据。"
    ],
    examples: ["为内部 API 调试生成 Basic Auth 请求头。", "把 `username:password` 转换为 curl 可直接使用的 Header。"]
  },
  "data-url-generator": {
    name: "Data URL 生成器",
    description: "把文本、SVG 或小型资源内容转换为可复制的 data: URL。",
    intro: "适合把短文本、SVG、JSON 或演示用 HTML 内联到示例代码中，可在 Base64 和 URL 编码两种模式之间切换。",
    steps: [
      "填写 MIME Type，并粘贴要内联的内容。",
      "选择 Base64 或 URL 编码模式，查看生成后的 Data URL 长度。",
      "复制结果前确认目标环境允许 data: URL，并避免放入过大的资源。"
    ],
    examples: ["把小型 SVG 图标转成 CSS background-image。", "为 Markdown 或 HTML demo 生成内联文本资源。"]
  },
  "html-entity-codec": {
    name: "HTML 实体编解码工具",
    description: "编码和解码 HTML 实体，避免文案或代码片段被浏览器误解析。",
    intro: "把 HTML 片段、文案或错误日志粘贴进来，在显示源码和恢复可读文本之间快速切换。",
    steps: [
      "粘贴需要处理的 HTML 片段或实体文本。",
      "点击编码将 `<`、`>`、`&` 等字符转成实体；点击解码恢复原文。",
      "复制输出后再放入模板、Markdown 或文档示例。"
    ],
    examples: ["在文章中展示 `<button>` 示例而不让浏览器执行。", "把日志中的 `&amp;`、`&quot;` 还原成可读文本。"]
  },
  "number-base-converter": {
    name: "进制转换器",
    description: "在二进制、八进制、十进制和十六进制之间转换整数。",
    intro: "支持常见 `0b`、`0o`、`0x` 前缀，并使用 BigInt 处理大整数，适合调试位标志、权限值和协议字段。",
    steps: [
      "输入整数，并选择当前输入所使用的进制。",
      "查看其他进制的结果，必要时复制带前缀的表示。",
      "如果提示前缀不匹配，检查输入值是否与所选进制一致。"
    ],
    examples: ["把十进制状态码转成十六进制便于查看协议字段。", "把二进制位标志转换成十进制配置值。"]
  },
  "uuid-generator": {
    name: "UUID 生成器",
    description: "使用浏览器 Crypto API 批量生成 UUID v4。",
    intro: "按数量生成随机 UUID，适合 mock 数据、测试记录、迁移脚本占位和临时对象标识。",
    steps: [
      "输入需要生成的数量，范围为 1 到 100。",
      "点击生成刷新列表，或直接复制当前 UUID 列表。",
      "如果需要可复现 ID，请使用固定 seed 的专用生成器，而不是随机 UUID。"
    ],
    examples: ["为测试 JSON 数组生成一批唯一 id。", "给本地 demo 数据快速补齐对象主键。"]
  },
  "color-converter": {
    name: "颜色转换器",
    description: "转换 HEX、RGB 和 HSL 表示，并实时预览颜色。",
    intro: "输入 3 位或 6 位 HEX 颜色，立即得到标准 HEX、RGB、HSL 和可复制的 CSS 值，适合设计 token 和样式调试。",
    steps: [
      "输入 HEX 色值，或使用颜色选择器调整颜色。",
      "查看预览卡片和 RGB、HSL 转换结果。",
      "复制目标格式后写入 CSS、设计 token 或组件属性。"
    ],
    examples: ["把品牌 HEX 色转换成 HSL，便于调浅调深。", "确认设计稿颜色在 CSS 中的 RGB 表示。"]
  },
  "case-converter": {
    name: "命名风格转换器",
    description: "在 camelCase、snake_case、kebab-case、Title Case 等命名风格之间转换。",
    intro: "把变量名、字段名或标题粘贴进来，自动拆词并生成常见命名风格，适合前后端字段对齐、文档标题整理和批量重命名准备。",
    steps: [
      "输入一段英文、数字或混合分隔符文本。",
      "查看 camelCase、PascalCase、snake_case 等结果。",
      "复制目标风格，写入代码、配置或接口字段。"
    ],
    examples: ["把 `user profile URL` 转成 `userProfileUrl`。", "把接口字段名快速转成 CONSTANT_CASE 环境变量名。"]
  },
  "csv-json-converter": {
    name: "CSV / JSON 转换器",
    description: "在 CSV 表格和 JSON 对象数组之间互转，适合小型数据整理和接口样例准备。",
    intro: "支持带引号 CSV 的基础解析和对象数组 JSON 输出，适合把表格数据转成 mock payload，或把接口样例转成可粘贴表格。",
    steps: [
      "粘贴 CSV 或 JSON 对象数组。",
      "选择 CSV 转 JSON 或 JSON 转 CSV。",
      "检查行数、列数和错误提示，再复制输出。"
    ],
    examples: ["把产品清单 CSV 转成前端 mock JSON。", "把接口返回的对象数组转成 CSV，便于贴到表格工具。"]
  },
  "text-diff": {
    name: "文本差异对比",
    description: "对比两段文本，生成行级新增、删除和未变更统计。",
    intro: "用于快速比较配置、文档片段、错误日志或复制前后的文本差异，结果按行展示新增和删除。",
    steps: [
      "把旧文本粘贴到左侧，新文本粘贴到右侧。",
      "查看新增、删除、未变更行数。",
      "在差异列表中定位需要复核的具体行。"
    ],
    examples: ["比较两版 Nginx 配置的改动行。", "检查发布说明前后是否漏掉关键条目。"]
  },
  "sql-formatter": {
    name: "SQL 格式化工具",
    description: "对常见 SQL 关键字换行缩进，也可压缩为单行查询。",
    intro: "把日志、监控或代码中的 SQL 粘贴进来，快速整理为更容易阅读的结构；需要放回配置时也可以压缩成一行。",
    steps: [
      "粘贴 SELECT、JOIN、WHERE、ORDER BY 等常见 SQL。",
      "点击格式化查看换行缩进结果，或点击压缩生成单行。",
      "复制输出前确认复杂子查询的缩进是否符合团队习惯。"
    ],
    examples: ["把慢查询日志里的 SQL 整理成可审查格式。", "将多行查询压缩后放入调试命令。"]
  },
  "markdown-table-generator": {
    name: "Markdown 表格生成器",
    description: "把 CSV 或 TSV 文本转换为 Markdown 表格。",
    intro: "适合把表格工具、日志或接口字段清单转换成 README、Issue 和文档中可直接粘贴的 Markdown 表格。",
    steps: [
      "粘贴 CSV 或 TSV 内容，第一行会作为表头。",
      "检查识别出的行数和列数。",
      "复制生成的 Markdown 表格到文档或评论中。"
    ],
    examples: ["把接口字段清单转换成 README 表格。", "把测试矩阵 TSV 转成 Markdown。"]
  },
  "line-tools": {
    name: "行文本处理工具",
    description: "按行修剪、去空行、排序、去重和反转文本。",
    intro: "面向清单类文本处理，例如域名、日志样本、ID 列表和配置项列表，常用操作可以一键生成输出。",
    steps: [
      "把多行文本粘贴到输入区。",
      "选择修剪、去空行、排序、去重或反转。",
      "查看行数变化后复制输出。"
    ],
    examples: ["去掉域名列表中的空行和重复项。", "把任务清单按字母升序整理。"]
  },
  "unicode-inspector": {
    name: "Unicode 字符检查器",
    description: "查看字符、码点、十六进制表示和 UTF-8 字节。",
    intro: "用于排查不可见字符、空格差异、Emoji、中文和跨系统编码问题，按字符展示 Unicode code point 与 UTF-8 字节。",
    steps: [
      "粘贴需要检查的文本。",
      "逐字符查看显示名称、Code Point 和 UTF-8 字节。",
      "复制有问题的码点或字节，辅助定位编码异常。"
    ],
    examples: ["确认字符串里是否混入不间断空格。", "查看 Emoji 或中文字符的 UTF-8 字节序列。"]
  },
  "env-parser": {
    name: "ENV 配置解析器",
    description: "解析 .env 文本，生成 JSON、shell export 或 .env.example 模板。",
    intro: "把 .env 内容粘贴进来，快速查看键值、生成安全示例模板或 shell export，适合配置迁移、文档整理和上线前脱敏。",
    steps: [
      "粘贴 .env 文本，支持注释、空行和 export 前缀。",
      "选择 JSON、Shell export 或 .env.example 输出模式。",
      "检查敏感键提示后复制需要的输出。"
    ],
    examples: ["把本地 .env 转成 JSON，方便核对配置项。", "根据真实 .env 生成不含值的 .env.example。"]
  },
  "cookie-parser": {
    name: "Cookie 解析与安全检查",
    description: "解析 Cookie 与 Set-Cookie，展开属性并诊断 Secure、HttpOnly、SameSite 等 Flags。",
    intro: "粘贴响应 Set-Cookie 或请求 Cookie Header，查看解码后的名称和值、属性列表和常见安全问题。",
    steps: [
      "选择 Set-Cookie 或 Cookie 模式并粘贴 Header。",
      "查看解析出的 Cookie 数量、属性和高风险问题。",
      "按诊断结果补齐 Secure、HttpOnly、SameSite 或前缀要求。"
    ],
    examples: ["检查登录 Session Cookie 是否缺少 HttpOnly。", "解析浏览器请求里的 Cookie 值，定位编码后的偏好字段。"]
  },
  "user-agent-parser": {
    name: "User-Agent 解析器",
    description: "本地解析 User-Agent 中的浏览器、系统、渲染引擎和设备类型线索。",
    intro: "用于排查兼容性、日志分析和客服问题，把 UA 字符串转换为更容易阅读的浏览器、系统和设备摘要。",
    steps: [
      "粘贴浏览器、日志或请求头中的 User-Agent。",
      "查看浏览器版本、操作系统、渲染引擎和设备类型。",
      "结合真实特性检测判断兼容性，不要只依赖 UA。"
    ],
    examples: ["从访问日志判断用户是否来自移动端浏览器。", "排查 Safari 或 Chrome 版本相关的兼容问题。"]
  },
  "regex-tester": {
    name: "正则表达式测试器",
    description: "实时测试 JavaScript 正则表达式，查看匹配数量、位置和结果。",
    intro: "输入 pattern、flags 和测试文本后，本地执行 JavaScript RegExp，适合验证提取规则、日志匹配和表单校验片段。",
    steps: [
      "填写正则 pattern 和 flags。",
      "粘贴测试文本，查看匹配数量和每个匹配位置。",
      "如果表达式报错，根据错误提示检查转义和重复 flags。"
    ],
    examples: ["验证日志里订单号的提取规则。", "检查邮箱、slug 或版本号的匹配表达式。"]
  },
  "markdown-preview": {
    name: "Markdown 预览器",
    description: "编辑 Markdown，并用安全的 React 渲染器预览常见语法。",
    intro: "适合快速检查 README、说明文档或 Issue 模板的标题、列表、引用、链接和代码块展示效果。",
    steps: [
      "把 Markdown 文本粘贴到编辑区。",
      "在右侧预览标题、列表、引用和代码块。",
      "根据块数量和行数检查文档结构是否合理。"
    ],
    examples: ["预览 README 片段的列表和代码块。", "检查文档链接是否以安全链接形式渲染。"]
  },
  "markdown-linter": {
    name: "Markdown 规范检查器",
    description: "检查标题层级、空行、尾随空格、代码块语言和行宽问题。",
    intro: "用于提交文档前快速扫描常见 markdownlint 风格问题，并提供尾随空格、连续空行和代码块语言的自动修复预览。",
    steps: [
      "粘贴 Markdown 文本并设置最大行宽。",
      "查看错误、警告和具体规则行号。",
      "应用自动修复或复制修复预览，再人工复核剩余提示。"
    ],
    examples: ["提交 README 前检查标题层级。", "批量去掉文档中的尾随空格和多余空行。"]
  },
  "json-to-ts": {
    name: "JSON 转 TypeScript",
    description: "根据 JSON 示例生成 TypeScript interface 草稿。",
    intro: "粘贴接口返回样例或配置 JSON，生成可复制的 interface 草稿，便于前端建模和接口对接。",
    steps: [
      "粘贴对象或对象数组形式的 JSON 示例。",
      "填写根 interface 名称。",
      "复制生成结果后，根据真实接口补充可选字段和联合类型。"
    ],
    examples: ["把 API 响应样例生成 `UserProfile` interface。", "为配置 JSON 草拟嵌套 TypeScript 类型。"]
  },
  "csp-generator": {
    name: "CSP 策略生成器",
    description: "生成 Content-Security-Policy Header，并提示常见高风险配置。",
    intro: "按资源类型填写允许来源，生成可复制的 CSP 响应头，适合上线前收敛脚本、样式、图片、接口和嵌入策略。",
    steps: [
      "填写 default-src、script-src、style-src 等指令。",
      "查看策略长度、指令数量和风险提示。",
      "复制 Header 后先在 Report-Only 环境观察，再切换为强制策略。"
    ],
    examples: ["为新站生成只允许 self 的基础 CSP。", "检查 script-src 是否误用了 unsafe-inline。"]
  },
  "http-header-parser": {
    name: "HTTP Header 解析器",
    description: "解析原始 HTTP Header 文本，输出结构化键值和常见安全提示。",
    intro: "粘贴 curl、浏览器 DevTools 或代理抓包里的响应头，快速拆出 Header 名和值，并检查常见安全头是否缺失。",
    steps: [
      "粘贴一段原始 HTTP Header。",
      "查看解析出的 Header 数量和结构化表格。",
      "根据安全提示补齐 CSP、HSTS、X-Content-Type-Options 等配置。"
    ],
    examples: ["整理 curl -I 的响应头。", "检查接口响应是否缺少 nosniff。"]
  },
  "http-status-reference": {
    name: "HTTP 状态码速查",
    description: "快速查询常见 HTTP 状态码含义和使用场景。",
    intro: "按状态码、英文标题或中文描述搜索，适合接口设计、排障和文档编写时确认状态码语义。",
    steps: [
      "输入状态码、分组或关键词。",
      "查看匹配状态码的含义和典型使用场景。",
      "按客户端错误、服务端错误或重定向语义选择更合适的响应码。"
    ],
    examples: ["比较 401 与 403 的使用边界。", "确认限流场景应返回 429。"]
  },
  "curl-builder": {
    name: "cURL 请求构建器",
    description: "根据方法、URL、Header 和 Body 生成可复制的 curl 命令。",
    intro: "用于把接口调试参数整理成 shell 可执行命令，适合复现 API 问题、编写文档示例和分享最小请求。",
    steps: [
      "选择 HTTP 方法并填写 URL。",
      "按行填写 Header，并在需要时填写 Body。",
      "复制生成的多行 curl 命令到终端或工单。"
    ],
    examples: ["把 Bearer Token 请求整理成可复现命令。", "为 POST JSON 接口生成文档示例。"]
  },
  "robots-txt-generator": {
    name: "robots.txt 生成器",
    description: "生成常用 robots.txt 规则，包含 User-agent、Allow、Disallow 和 Sitemap。",
    intro: "填写爬虫、允许路径、禁止路径和 sitemap 地址后生成 robots.txt，适合站点上线前配置基础爬取规则。",
    steps: [
      "填写 User-agent，默认 `*` 表示所有爬虫。",
      "按行配置 Allow 和 Disallow 路径。",
      "复制结果到站点根目录的 robots.txt 并上线验证。"
    ],
    examples: ["禁止爬取 /admin 和 /api。", "为站点添加 sitemap.xml 地址。"]
  },
  "mime-type-lookup": {
    name: "MIME 类型查询",
    description: "根据扩展名或 MIME 类型快速查询常见 Content-Type。",
    intro: "输入扩展名、MIME 或用途关键词，快速确认响应 Content-Type，适合静态资源、上传校验和接口返回排查。",
    steps: [
      "输入文件扩展名、MIME 片段或说明关键词。",
      "查看匹配结果中的扩展名、Content-Type 和用途。",
      "把正确 MIME 写入服务器配置、上传白名单或文档。"
    ],
    examples: ["确认 .wasm 应使用 application/wasm。", "查找 SVG 或 WebP 的正确 Content-Type。"]
  },
  "utm-builder": {
    name: "UTM 链接构建器",
    description: "生成带 UTM 参数的营销链接，并保留原始查询参数。",
    intro: "填写落地页地址和 source、medium、campaign 等参数，生成可复制的推广链接，适合邮件、广告和社媒投放。",
    steps: [
      "填写完整 Base URL。",
      "补充 utm_source、utm_medium、utm_campaign 等参数。",
      "复制生成链接，并确认原有查询参数没有被误删。"
    ],
    examples: ["为 newsletter 邮件生成 campaign 链接。", "区分 hero_cta 与 footer_cta 的 utm_content。"]
  },
  "slug-generator": {
    name: "Slug 生成器",
    description: "把标题、文件名或标签转换为 URL 友好的 slug。",
    intro: "把英文标题、文件名或标签粘贴进来，自动清理空格、符号和大小写，生成适合 URL、博客路径和文档锚点的短字符串。",
    steps: [
      "输入标题、文件名或标签文本。",
      "选择短横线或下划线作为分隔符。",
      "复制生成的 slug，并在发布前确认是否需要人工处理中文拼音或品牌词。"
    ],
    examples: ["把文章标题转换成博客 URL 路径。", "把设计稿文件名整理成稳定的资源名。"]
  },
  "password-generator": {
    name: "密码生成器",
    description: "使用浏览器 Crypto API 生成随机密码，并估算字符池和熵强度。",
    intro: "在本地生成随机密码，可控制长度、大小写字母、数字和符号组合，适合临时凭据、测试账号和管理员初始密码。",
    steps: [
      "设置密码长度，并勾选允许使用的字符类型。",
      "点击生成刷新密码，查看强度、熵估算和字符池大小。",
      "复制后尽快保存到密码管理器，避免在聊天、工单或日志中明文传播。"
    ],
    examples: ["为临时测试账号生成 20 位随机密码。", "生成包含符号和数字的管理员初始密码。"]
  },
  "chmod-calculator": {
    name: "chmod 权限计算器",
    description: "通过勾选读、写、执行权限生成 Unix 数字权限和符号权限。",
    intro: "适合检查 Linux、macOS 和容器镜像里的文件权限，把 owner、group、other 的权限组合转换为 chmod 命令。",
    steps: [
      "分别勾选所有者、用户组和其他用户的读、写、执行权限。",
      "查看数字权限和符号权限是否符合预期。",
      "复制 chmod 命令前确认目标文件路径和执行权限是否必要。"
    ],
    examples: ["为脚本文件生成 755 权限。", "为私钥文件检查是否应收敛到 600 权限。"]
  },
  "color-contrast-checker": {
    name: "颜色对比度检查器",
    description: "计算前景色和背景色的 WCAG 对比度，检查正文、字号和 UI 图形是否通过。",
    intro: "输入前景色和背景色 HEX 后，实时预览文本效果并给出 AA、AAA、正文、大字号和 UI 图形的通过结果。",
    steps: [
      "填写前景色和背景色，或使用颜色选择器调整。",
      "设置示例字号，查看预览文字和对比度比例。",
      "复制 CSS 前根据 AA/AAA 结果调整色值，确保关键文本可读。"
    ],
    examples: ["检查按钮文字和背景是否满足 AA 正文标准。", "为设计 token 复核深色模式下的文本对比度。"]
  },
  "open-graph-preview": {
    name: "Open Graph 预览器",
    description: "预览链接在 Facebook、LinkedIn、X 等平台中的 Open Graph 和 Twitter Card 展示效果。",
    intro: "填写标题、描述、URL、站点名和图片地址后，生成社交平台预览卡片和可复制的 meta 标签。",
    steps: [
      "填写页面标题、描述、站点名、URL 和图片 alt 文案。",
      "查看不同平台卡片中的标题截断、描述长度和图片比例。",
      "复制 Open Graph / Twitter 标签后放入页面 head，并用真实平台调试器复核。"
    ],
    examples: ["为产品发布页预览分享卡片效果。", "为博客文章生成 og:title、og:image 和 twitter:card 标签。"]
  },
  "readme-badge-generator": {
    name: "README Badge 生成器",
    description: "生成 shields.io Badge URL、Markdown 和 HTML 片段，适合 README 顶部状态区。",
    intro: "输入标签、状态、颜色、样式、Logo 和目标链接，生成可直接粘贴到 README 的 Markdown 或 HTML Badge。",
    steps: [
      "填写 Badge 的 label、message、颜色和样式。",
      "可选填写 simple-icons logo 名称和点击跳转链接。",
      "检查预览后复制 Markdown 或 HTML 片段。"
    ],
    examples: ["为构建状态生成 build passing Badge。", "为许可证、版本号或覆盖率生成 README 状态标识。"]
  },
  "readme-quality-checker": {
    name: "README 质量检查器",
    description: "按项目摘要、安装、使用、配置、许可证等维度评估 README 完整度。",
    intro: "粘贴 README 内容后，工具会按常见开源项目文档结构打分，并列出缺失章节和可改进建议。",
    steps: [
      "粘贴完整 README 或准备提交的片段。",
      "查看得分、字数和缺口数量。",
      "复制质量报告，并按缺口补齐安装、使用、配置、贡献、安全或变更记录。"
    ],
    examples: ["提交开源项目前检查 README 是否缺少快速开始。", "为内部工具文档补齐配置和支持信息。"]
  },
  "conventional-commit-helper": {
    name: "Conventional Commit 助手",
    description: "组合 type、scope、subject、body 和 footer，生成规范提交信息并检查常见问题。",
    intro: "按 Conventional Commits 格式生成提交信息，适合需要自动生成 changelog、语义化版本或统一提交风格的项目。",
    steps: [
      "选择提交类型，并填写 scope 和简短描述。",
      "按需补充正文、破坏性变更说明和 issue footer。",
      "检查 subject 长度和格式提醒后复制提交信息。"
    ],
    examples: ["生成 feat(auth): add passkey enrollment 提交。", "为破坏性 API 变更生成带 BREAKING CHANGE 的提交信息。"]
  },
  "incident-timeline-generator": {
    name: "故障时间线生成器",
    description: "把故障事件记录整理为时间线、状态更新或复盘草稿。",
    intro: "按 ISO 时间、参与者、级别、事件描述粘贴事件记录后，自动排序并生成可复制的沟通材料。",
    steps: [
      "粘贴每行一条的故障事件记录。",
      "选择时间线、状态更新或复盘草稿输出模式。",
      "检查持续时间、首个事件和级别统计后复制结果。"
    ],
    examples: ["把告警、回滚和恢复记录整理成复盘时间线。", "为值班群生成最新状态更新。"]
  },
  "file-name-batch-renamer": {
    name: "文件名批量重命名器",
    description: "粘贴文件名清单，预览批量重命名结果，并生成安全的 dry-run shell 命令。",
    intro: "适合整理图片、素材、文档和导入文件名，工具只生成预览和 mv -n 命令，不会直接访问或修改本地文件。",
    steps: [
      "粘贴原文件名，每行一个。",
      "设置前缀、后缀、分隔符、大小写模式和序号格式。",
      "复制预览或 shell 命令，并先在测试目录执行确认。"
    ],
    examples: ["把商品图片整理成带序号的 slug 文件名。", "为一批 Markdown 草稿生成统一命名格式。"]
  },
  "documentation-toc-anchor-generator": {
    name: "文档目录 / 锚点生成器",
    description: "从 Markdown 标题生成 GitHub 风格目录、锚点清单和带 TOC 标记的文档。",
    intro: "粘贴 Markdown 文档后，工具会解析标题层级、生成 GitHub 风格锚点，并可把目录插入到 TOC 标记之间。",
    steps: [
      "粘贴 Markdown 文档内容。",
      "选择是否包含 H1、是否编号，以及目录最大层级。",
      "复制目录或带 TOC 标记的完整文档。"
    ],
    examples: ["为长 README 自动生成目录。", "检查重复标题生成的锚点后缀是否符合预期。"]
  },
  "mermaid-preview-formatter": {
    name: "Mermaid 预览与格式化工具",
    description: "格式化 Mermaid 图表源码，并为常见 flowchart 语法生成轻量预览。",
    intro: "把 Mermaid 代码粘贴进来，工具会规范箭头和缩进，检查常见括号或边标签错误，并提供 flowchart 的本地轻量预览。",
    steps: [
      "粘贴 Mermaid 图表源码，可包含或不包含代码块围栏。",
      "查看格式化结果和基础语法检查。",
      "应用格式化或复制结果后，再用正式 Mermaid 渲染器复核复杂图表。"
    ],
    examples: ["整理流程图中的箭头、标签和缩进。", "在文档提交前检查 Mermaid 是否缺少图表声明。"]
  },
  "sku-generator": {
    name: "SKU 批量生成器",
    description: "按品牌、品类、颜色、尺码和序号批量生成规范 SKU，并导出 CSV 映射表。",
    intro: "输入商品维度后生成 SKU 组合，适合电商上新、库存初始化和测试商品数据准备。",
    steps: [
      "填写品牌、品类、颜色、尺码、起始序号和分隔符。",
      "选择大写或小写 SKU，查看变体数量和示例。",
      "复制 SKU 列表或 CSV，正式入库前再校验唯一性。"
    ],
    examples: ["为 T 恤的颜色和尺码组合生成 SKU。", "导出 CSV 映射表交给运营或库存系统导入。"]
  },
};

const zhRuntimeLabels: Record<ToolRuntime, string> = {
  simple: "本地简单运行",
  worker: "Worker 隔离运行",
  wasm: "WASM 运行",
  ai: "AI 运行",
  sandbox: "沙箱隔离运行",
  realtime: "实时会话"
};

const enRuntimeLabels: Record<ToolRuntime, string> = {
  simple: "Simple runtime",
  worker: "Worker runtime",
  wasm: "WASM runtime",
  ai: "AI runtime",
  sandbox: "Sandbox runtime",
  realtime: "Realtime session"
};

const zhPermissionLabels: Record<ToolPermission, string> = {
  clipboard: "剪贴板",
  filesystem: "本地文件",
  camera: "摄像头",
  microphone: "麦克风",
  webgpu: "WebGPU",
  notification: "系统通知"
};

const enPermissionLabels: Record<ToolPermission, string> = {
  clipboard: "clipboard",
  filesystem: "filesystem",
  camera: "camera",
  microphone: "microphone",
  webgpu: "WebGPU",
  notification: "notification"
};

export function isZhLocale(locale: string) {
  return locale.toLowerCase().startsWith("zh");
}

export function getToolPageGuide(toolId: string, locale: string) {
  return isZhLocale(locale) ? zhToolPageGuides[toolId] ?? null : null;
}

export function getToolPageManifest(manifest: ToolManifest, locale: string): ToolManifest {
  const guide = getToolPageGuide(manifest.id, locale);

  if (!guide) {
    return manifest;
  }

  return {
    ...manifest,
    name: guide.name,
    description: guide.description
  };
}

export function getRuntimeLabel(runtime: ToolRuntime, locale: string) {
  return isZhLocale(locale) ? zhRuntimeLabels[runtime] : enRuntimeLabels[runtime];
}

export function getPermissionLabel(permission: ToolPermission, locale: string) {
  return isZhLocale(locale) ? zhPermissionLabels[permission] : enPermissionLabels[permission];
}

export function getPermissionLabels(permissions: ToolPermission[] | undefined, locale: string) {
  return permissions?.map((permission) => getPermissionLabel(permission, locale)) ?? [];
}
