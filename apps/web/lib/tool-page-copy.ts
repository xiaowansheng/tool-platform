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
    description: "为文本生成常用摘要或 SRI integrity，便于校验内容、脚本和配置变更。",
    intro: "输入任意文本后生成十六进制摘要或 SRI integrity，适合检查内容是否变更、为静态资源生成完整性校验值。",
    steps: [
      "粘贴需要摘要的文本内容。",
      "选择十六进制摘要或 SRI integrity 输出格式，并确认哈希算法。",
      "把摘要值用于比对或资源完整性校验，不要把普通哈希当作密码存储方案。"
    ],
    examples: ["对配置片段生成摘要，确认两份配置是否一致。", "为 CDN 脚本生成 integrity 属性。"]
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
  "csv-json-ndjson-converter": {
    name: "CSV / JSON / NDJSON 转换器",
    description: "在 CSV、JSON 数组和 NDJSON 流之间互转，保留列名和对象字段，支持统计数据实时预览。",
    intro: "支持 CSV、JSON 和 NDJSON 三种格式互转。CSV 解析支持引号和换行，JSON 支持对象数组和嵌套对象，NDJSON 支持逐行流式数据。",
    steps: [
      "在输入区域粘贴源数据，选择输入格式。",
      "选择目标格式。",
      "点击转换按钮，检查行数列数统计和转换结果，再复制输出。"
    ],
    examples: ["把产品清单 CSV 转成前端 mock JSON。", "把日志 NDJSON 流转成 CSV 便于分析。", "在 JSON 和 NDJSON 之间互转。"]
  },
  "csv-profile-worker": {
    name: "CSV 数据画像工具",
    description: "解析 CSV 文件并生成数据画像，包括列类型推断、空值统计、唯一值计数和分布概览。",
    intro: "上传或粘贴 CSV 数据，自动分析每列的类型、空值率、唯一值分布，生成数据质量报告。",
    steps: [
      "上传 CSV 文件或粘贴 CSV 文本。",
      "查看每列的数据类型推断和统计信息。",
      "检查空值、唯一值和分布概览。"
    ],
    examples: ["分析导入数据的质量，发现空值列。", "快速了解 CSV 的列结构和数据分布。"]
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
  "regex-batch-extractor": {
    name: "正则批量提取器",
    description: "使用正则表达式从批量文本中提取匹配项，支持捕获组、去重和多种输出格式。",
    intro: "输入多行文本和正则表达式，批量提取匹配内容，支持捕获组和输出格式选择。",
    steps: [
      "粘贴待提取的批量文本。",
      "输入正则表达式，可使用捕获组提取特定部分。",
      "查看提取结果，选择去重或更改输出格式。"
    ],
    examples: ["从日志中批量提取 IP 地址。", "从 HTML 中提取所有链接 URL。"]
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
  "minesweeper": {
    name: "经典扫雷",
    description: "经典扫雷游戏，支持初级、中级、高级与自定义参数，配备计时器、雷数指示、双击排雷与拟真爆炸音画效果。",
    intro: "点击翻开格子，插旗标记地雷，数字双击可智能拓展排开周围无雷区域，体验首雷保命与丝滑音效。",
    steps: [
      "选择初级、中级、高级或输入行列雷数自定义参数。",
      "左键点击翻开格子，右键点击插旗标记。",
      "若已翻开数字格周围插旗数足够，可双击数字自动排雷四周。",
      "清空所有安全格则胜利，踩到雷则引爆结束。"
    ],
    examples: ["在空闲时间开一局初级扫雷放松大脑。", "挑战 99 个雷的高级难度记录。"]
  },
  "cyber-flyer": {
    name: "太空飞梭",
    description: "赛博霓虹飞越太空游戏，配备炫目粒子引擎、防撞护盾/时空减速/超音速飞行道具、镜头震屏感官系统与 Web Audio 合成器音效，支持自定义外观与多种难度模式。",
    intro: "驾驶赛博穿梭机，在霓虹太空柱群中冲刺。避开障碍物并拾取强大的推进道具！",
    steps: [
      "设定流速难度，并选择飞梭的外观与涂装。",
      "使用空格键或点击画面控制飞梭向上飞行，释放自动下坠。",
      "在行进路线中注意拾取护盾、时空减速与超音速冲刺等强力模组。",
      "一旦飞梭撞击障碍物或上下边界，若无护盾则任务失败。"
    ],
    examples: ["在超载难度下冲击高分记录。", "拾取超音速冲刺模组，享受摧毁一切霓虹太空柱的解压快感。"]
  },
  "cyber-synth-matrix": {
    name: "赛博音序器",
    description: "赛博霓虹电子音乐步进器，具备 16 步进节奏矩阵、4 种合成器轨道（主音、低音、和弦、节奏敲击）、音色合成滤波器、动效波形可视化与预设电音模板，支持本地导出/分享音乐代码。",
    intro: "通过 16 步进与 8 轨道音调矩阵，自由编辑并播放个性化的霓虹电子音乐。调整截止频率与回声反馈，探索无限音乐可能。",
    steps: [
      "在 16 步进矩阵中点击格子激活音调或节奏（可直接选用预设电音模板）。",
      "点击「播放」按钮开始循环，通过右上角滑块调整 BPM 速度。",
      "拉动下方截止频率与太空回声滑块，为乐曲注入动态的电音滤波与混响效果。",
      "可以将自己创作的节奏复制为音乐代码分享给朋友，或者导入他人代码进行二次创作。"
    ],
    examples: ["使用「赛博电音」预设并调大回声反馈，体验经典的 Synthwave 律动。", "一键复制当前创作的音乐代码，分享到社交平台。"]
  },
  "neon-snake": {
    name: "霓虹贪吃蛇",
    description: "赛博霓虹贪吃蛇游戏，配备炫目粒子吃食特效、震屏反馈、速度难度调节及复古街机电子合成音效，支持自定义外观与障碍物模式。",
    intro: "控制发光的霓虹贪吃蛇在网格中移动，吃掉粉色能量核心增长积分，注意避开障碍物与自身身体。",
    steps: [
      "选择赛博霓虹、翡翠之光等酷炫主题皮肤。",
      "设定常速、慢速或极速，并可开启障碍物和穿墙模式。",
      "使用键盘方向键/WASD或手机虚拟摇杆控制贪吃蛇转向。",
      "吃掉能量果实增加得分，并欣赏炫目的粒子爆炸和电子音效。"
    ],
    examples: ["在极速 + 障碍物的高难度下挑战最高得分记录。", "开启穿墙模式，体验轻松休闲的合成蛇长龙。"]
  },
  "neon-tetris": {
    name: "霓虹方块",
    description: "赛博霓虹经典方块游戏，拥有炫酷的流光特效、满行消除爆破动画、行数与等级成长机制，配有合成器音乐般动作音效，支持按键暂存（Hold）与下坠预测。",
    intro: "经典俄罗斯方块玩法的霓虹街机升级版，拖拽或按键旋转方块填满整行消除，挑战自我极限得分。",
    steps: [
      "使用键盘方向键或触屏按钮左右移动方块，按上键旋转，空格键瞬落。",
      "按 Shift 键可以把当前方块暂存（Hold）到左侧，留到关键时刻使用。",
      "利用下方浅色虚线框预测影确定降落位置，避免误放产生空隙。",
      "每消除 10 行将提升等级并增加下滑速度，行数越多得分倍增越高。"
    ],
    examples: ["在高等级速度下依靠瞬落（Hard Drop）斩获极限分数。", "合理利用 Hold 暂存区，保留 I 型方块连续消去 4 行达成 Tetris。"]
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
  "log-file-analyzer": {
    name: "日志文件分析器",
    description: "分析日志级别、状态码、高频词和错误样本，适合快速定位异常。",
    intro: "粘贴或导入 .log/.txt 日志后，工具会按行统计 ERROR、WARN、INFO、DEBUG、状态码和高频词，并提取错误样本。",
    steps: [
      "粘贴日志内容，或导入本地日志文件。",
      "查看级别分布、状态码统计、高频词和错误样本。",
      "复制 JSON 报告，带到排障记录或工单中继续分析。"
    ],
    examples: ["从服务日志里提取 5xx 错误样本。", "比较部署前后 WARN/ERROR 数量变化。"]
  },
  "har-viewer": {
    name: "HAR 请求查看器",
    description: "解析 HAR 文件，汇总请求数、耗时、体积、域名和最慢请求。",
    intro: "把浏览器 DevTools 导出的 HAR JSON 粘贴或导入，快速查看网络请求概况和慢请求清单。",
    steps: [
      "导入 .har 文件或粘贴 HAR JSON。",
      "查看请求数、总耗时、传输体积和域名分布。",
      "重点检查最慢请求、异常状态码和大体积资源。"
    ],
    examples: ["排查页面首屏加载慢的关键请求。", "比较 API、CDN 和第三方域名的请求占比。"]
  },
  "access-log-parser": {
    name: "访问日志解析器",
    description: "解析 Nginx/Apache combined access log，统计状态码、方法、路径和传输量。",
    intro: "粘贴访问日志后，工具会结构化提取 IP、方法、路径、状态码、字节数和 User-Agent，适合快速检查流量异常。",
    steps: [
      "粘贴 combined access log，或导入 .log/.txt 文件。",
      "查看请求数、解析失败数、5xx 数量和传输量。",
      "按状态码、方法和热门路径定位异常流量。"
    ],
    examples: ["找出 5xx 请求对应的热门路径。", "检查静态资源 304 与接口 2xx 的比例。"]
  },
  "opentelemetry-trace-viewer": {
    name: "OpenTelemetry Trace 查看器",
    description: "解析 OTLP 或扁平 Span JSON，展示 Trace 时间线、服务耗时和最慢 Span。",
    intro: "粘贴 trace/span JSON 后，工具会按 parentSpanId 生成调用树，并汇总每个服务的耗时。",
    steps: [
      "粘贴 OTLP resourceSpans 或扁平 Span 数组。",
      "查看 Span 数、服务数、Trace 总耗时和最慢 Span。",
      "沿时间线定位慢服务、慢数据库调用或外部依赖。"
    ],
    examples: ["分析一次 checkout 请求中 payments 服务耗时。", "检查 trace 是否缺少 parentSpanId 或 service.name。"]
  },
  "game-2048": {
    name: "2048 游戏",
    description: "经典 2048 数字拼图游戏，支持 3x3、4x4、5x5 多种棋盘，具备丝滑的滑动合体动画、音效及键盘和触屏滑动操作。",
    intro: "通过合并相同数字滑出最大值，电脑端可使用方向键/WASD操作，移动端支持触屏滑动手势。",
    steps: [
      "选择极速 3x3、经典 4x4 或轻松 5x5 的棋盘规格。",
      "使用键盘方向键或触屏上下左右划动来移动所有方块。",
      "将相同数字相撞以翻倍合成，每次合体得分为相应分值。",
      "尽可能合成出 2048，当格子填满且无法移动时游戏结束。"
    ],
    examples: ["在经典 4x4 上尝试突破最高分记录。", "在较小的 3x3 棋盘上体验高难度超快节奏。"]
  },
  "gobang-game": {
    name: "五子棋大师",
    description: "经典五子棋对弈游戏，提供人机对战（智能启发式AI）与双人同屏对战模式，具备悔棋、落子声效、胜利连线高亮及逼真棋盘视觉效果。",
    intro: "两人在棋盘上轮流落子，先在横、竖、斜任意方向连成五子（或以上）者获胜，人机模式配备强力防守/进攻AI。",
    steps: [
      "选择人机对战（PvE）或者同屏双人对战（PvP）对局模式。",
      "黑子先行，点击棋盘上的任意网格线交叉点完成落子。",
      "如果不小心点错或者想重新谋划，可以点击「悔棋」撤销历史落子。",
      "当任意一方连成 5 子时，棋子将闪烁连线高亮表示获胜。"
    ],
    examples: ["在人机模式下与智能启发式 AI 展开策略攻防对决。", "在双人同屏模式下和身旁好友下一盘，进行逻辑博弈。"]
  },
  "prometheus-query-helper": {
    name: "Prometheus 查询助手",
    description: "按常见监控场景生成 PromQL，并提示高基数和低效查询风险。",
    intro: "选择速率、求和、平均、P95、错误率、K8s CPU 或内存场景，输入指标、窗口和标签后生成 PromQL。",
    steps: [
      "选择查询场景并填写指标名、时间窗口和标签过滤。",
      "按需设置分组标签，生成 PromQL 和告警规则。",
      "查看查询提示，避免高成本正则、过短 rate 窗口和过多 group by 标签。"
    ],
    examples: ["生成 HTTP 5xx 错误率 PromQL。", "为 Kubernetes Pod CPU 使用率生成按 namespace/pod 分组的查询。"]
  },
  "grafana-dashboard-formatter": {
    name: "Grafana 仪表盘格式化工具",
    description: "格式化、压缩 Grafana Dashboard JSON，并生成面板清单和导入检查。",
    intro: "粘贴 Grafana Dashboard JSON 后，可以美化、压缩或导出面板 inventory，并检查 uid、schemaVersion、datasource、targets 等常见导入问题。",
    steps: [
      "粘贴 Dashboard JSON。",
      "选择格式化、压缩或面板清单输出。",
      "查看标题、面板数、Schema 版本和导入检查结果。"
    ],
    examples: ["提交仪表盘前格式化 JSON。", "导出所有面板标题、类型和 PromQL targets。"]
  },
  "reverse-proxy-header-analyzer": {
    name: "反向代理 Header 分析器",
    description: "解析 X-Forwarded-For、Forwarded、Via 等头，推导客户端 IP 和代理链风险。",
    intro: "粘贴经过网关、负载均衡和反向代理后的请求头，按信任代理跳数推导客户端地址并提示常见信任边界问题。",
    steps: [
      "粘贴原始请求 Header。",
      "设置可信代理跳数，查看客户端 IP、协议、主机和 hop 链。",
      "根据风险提示修正代理清洗、TLS termination 和限流配置。"
    ],
    examples: ["排查 X-Forwarded-For 链路长度和可信代理配置。", "确认应用是否错误信任外部传入的转发头。"]
  },
  "tls-certificate-parser": {
    name: "TLS 证书解析器",
    description: "解析 PEM 证书的字节数、SHA-256 指纹和可读字段，适合本地快速检查。",
    intro: "粘贴 PEM 证书后，工具会在浏览器本地计算 SHA-256 指纹，并扫描证书中的可读字段。",
    steps: [
      "粘贴完整 PEM 证书。",
      "点击解析证书，查看字节数、指纹和可读字段。",
      "将指纹与服务器、监控或证书管理系统中的记录比对。"
    ],
    examples: ["确认线上证书 SHA-256 指纹是否符合预期。", "快速查看证书中出现的域名和组织字段。"]
  },
  "dns-inspector": {
    name: "DNS 记录检查器",
    description: "通过 DoH 查询 A、AAAA、CNAME、MX、TXT、NS、SOA、CAA 等 DNS 记录。",
    intro: "输入域名并选择记录类型后，工具会调用 Cloudflare 或 Google DoH 接口返回 DNS 状态、记录和响应 flags。",
    steps: [
      "输入域名，也可以粘贴完整 URL 自动提取 hostname。",
      "选择记录类型和 DoH 提供方。",
      "查看状态、记录、TTL、Authority 和响应 flags。"
    ],
    examples: ["检查域名 A/AAAA 是否解析到新地址。", "排查 TXT、MX 或 CAA 记录配置是否生效。"]
  },
  "port-reference": {
    name: "端口服务速查",
    description: "按端口号、服务名或协议快速查询常见网络端口用途。",
    intro: "输入端口号、协议或服务关键词，快速筛选常见 TCP/UDP 端口，适合排障、防火墙规则和文档编写。",
    steps: [
      "输入端口号、服务名或协议关键词。",
      "查看匹配端口的协议和常见服务用途。",
      "结合实际进程、云安全组或防火墙配置复核开放端口。"
    ],
    examples: ["确认 5432 通常用于 PostgreSQL。", "排查 8080 是否是备用 HTTP 或开发服务端口。"]
  },
  "adr-generator": {
    name: "ADR 生成器",
    description: "生成 Architecture Decision Record，覆盖背景、决策、备选方案和后果。",
    intro: "把架构决策的背景和理由记录下来，生成格式化的 ADR，适合团队做技术决策记录和知识沉淀。",
    steps: [
      "填写决策标题、背景、驱动因素和决策内容。",
      "补充备选方案、决策后果和合规性标记。",
      "复制生成的 ADR Markdown，提交到项目文档目录。"
    ],
    examples: ["记录微服务拆分决策的背景和备选方案。", "生成 API 网关选型 ADR，包含评估矩阵。"]
  },
  "ai-brief-synthesizer": {
    name: "AI 简报合成器",
    description: "将长文本提炼为结构化简报，支持摘要、要点提取和关键结论生成。",
    intro: "粘贴长文本或文章，自动生成结构化简报，包含摘要、关键要点和结论。",
    steps: [
      "粘贴需要提炼的长文本或文章内容。",
      "选择输出格式（摘要、要点列表或完整简报）。",
      "复制生成的简报内容用于分享或存档。"
    ],
    examples: ["把研究报告提炼为一页摘要。", "从会议记录中提取关键决策和行动项。"]
  },

  "ai-chat": {
    name: "AI 聊天工作台",
    description: "浏览器内 AI Chat 工作台，支持 system prompt、流式输出、会话记录和本地 token 估算。",
    intro: "在浏览器中与 AI 模型对话，可自定义系统提示词、查看流式输出并管理多轮会话。",
    steps: [
      "设置 system prompt 和对话参数。",
      "输入问题并查看流式生成的回复。",
      "回顾会话历史，复制对话记录或继续追问。"
    ],
    examples: ["调试复杂 prompt 的逐轮表现。", "对比不同 system prompt 下的回复风格。"]
  },


  "ai-sandbox-lab": {
    name: "AI 沙箱实验室",
    description: "流式生成 AI 响应，并在隔离 iframe 中预览结果。",
    intro: "在沙箱环境中测试 AI 响应，隔离预览生成的 HTML 内容，适合安全测试和内容审查。",
    steps: [
      "输入 AI 请求参数或 prompt。",
      "查看流式生成的响应内容。",
      "在隔离 iframe 中预览渲染效果。"
    ],
    examples: ["测试 HTML 内容是否安全渲染。", "验证 AI 回复在沙箱中的展示效果。"]
  },
  "ai-trust-analyzer": {
    name: "AI Trust Analyzer",
    description: "AI 代码风险扫描、Prompt 注入检测、事实核查、PR 风险分析、测试用例生成、Bug 复现、错误排查、Token 成本估算等 15 种分析工具。",
    intro: "集成了 15 种 AI 信任与安全分析工具：AI 代码风险扫描、Prompt Injection 检测、LLM 事实核查、PR 风险分析、测试用例生成、Bug 复现步骤、错误日志排查、堆栈解释、API SDK 示例生成、代码安全审查、Prompt 版本对比、Agent 日志审计、LLM 评测用例、RAG 分块估算和 Token 成本计算。",
    steps: [
      "从顶部的下拉菜单选择需要使用的分析工具。",
      "根据工具的输入要求粘贴相关内容。",
      "查看分析结果，包括风险信号、统计数据和建议措施。",
      "复制生成的结果用于报告或进一步处理。"
    ],
    examples: ["扫描 AI 生成代码中的硬编码密钥和注入风险。", "检测用户输入中的 Prompt Injection 攻击。", "估算 LLM 调用的 token 消耗和成本。"]
  },
  "animation-keyframes-generator": {
    name: "动画关键帧生成器",
    description: "可视化编辑 CSS @keyframes 动画，设置关键帧与动画属性，生成可复制代码。",
    intro: "通过可视化方式创建 CSS @keyframes 动画，添加关键帧并设置平移、旋转、缩放和透明度变化。",
    steps: [
      "添加或删除关键帧，设置每个帧的变换属性和位置百分比。",
      "调整动画名称、时长、缓动函数、延迟、次数和方向等全局参数。",
      "点击「预览动画」查看效果，确认后复制生成的 CSS 代码。"
    ],
    examples: ["创建一个带旋转和位移的淡入动画。", "制作一个无限循环的呼吸缩放效果。"]
  },

  "api-error-code-doc-generator": {
    name: "API 错误码文档生成器",
    description: "把错误码清单转换为 Markdown 文档、响应结构和排查建议表。",
    intro: "把 API 错误码表格粘贴进来，生成格式化的错误码文档和排查建议，适合 API 开发者文档。",
    steps: [
      "粘贴错误码清单（code、message、HTTP 状态）。",
      "补充排查建议和示例响应。",
      "复制生成的 Markdown 文档到 API 文档中。"
    ],
    examples: ["为 REST API 生成错误码参考文档。", "把错误码表格转成带排查建议的开发者指南。"]
  },
  "api-rate-limit-calculator": {
    name: "API 限流计算器",
    description: "按用户数、峰值倍数和时间窗口计算限流阈值、burst、Retry-After，并生成网关配置草稿。",
    intro: "输入用户量和请求模式，计算合理的限流阈值和突发窗口，适合 API 网关配置和容量规划。",
    steps: [
      "填写预估用户数和请求峰值倍数。",
      "设置时间窗口和基准请求量。",
      "查看计算出的限流阈值和 Retry-After 时间。"
    ],
    examples: ["为 10 万用户的 API 计算限流参数。", "规划 burst 窗口防止突发流量打崩服务。"]
  },
  "archive-structure-viewer": {
    name: "归档结构查看器",
    description: "读取 ZIP 与 TAR 的目录结构、文件大小、压缩方式和层级摘要。",
    intro: "上传或粘贴 ZIP/TAR 文件的 Base64，查看归档内的目录树、文件大小和压缩方式。",
    steps: [
      "上传 ZIP 或 TAR 文件，或粘贴 Base64。",
      "查看目录层级、文件大小和压缩方式。",
      "检查异常大文件或深层嵌套目录。"
    ],
    examples: ["查看第三方 ZIP 包内是否有可疑文件。", "分析归档文件的压缩效率和目录结构。"]
  },
  "physical-fitness-calculator": {
    name: "体测分数计算器",
    description: "根据《国家学生体质健康标准》计算各年级各项体测分数、BMI、等级与建议。",
    intro: "输入身高、体重及体测各项指标，系统会自动计算 BMI 分数、各单项及格等级并生成科学的运动建议。",
    steps: [
      "选择性别与学段年级标准。",
      "输入身高、体重、肺活量及各项体能测试成绩。",
      "在右侧查看体测总分、评定等级、单项明细与运动建议。"
    ],
    examples: ["计算大一男生的体测得分与加分情况。", "为核心力量偏弱的女大学生生成针对性运动建议。"]
  },
  "aspect-ratio-calculator": {
    name: "宽高比计算器",
    description: "根据宽高计算比例，并按目标宽度或高度等比缩放。",
    intro: "输入原始宽度和高度，计算宽高比，再按目标宽度或高度自动计算等比缩放后的尺寸。",
    steps: [
      "输入原始宽度和高度或宽高比。",
      "输入目标宽度或高度。",
      "查看等比缩放后的另一维度和缩放比例。"
    ],
    examples: ["将 1920x1080 的素材缩放到 800 宽度。", "计算视频在 16:9 比例下的标准尺寸。"]
  },
  "audio-tone-generator": {
    name: "音频测试音生成器",
    description: "用 Web Audio 生成测试音、扫频和节拍，支持频率、波形、音量、时长与 WAV 下载。",
    intro: "在浏览器中生成测试音频信号，适合音响调试、音频开发测试和听力测试。",
    steps: [
      "选择波形类型（正弦、方波、锯齿、三角）。",
      "设置频率、音量、持续时间和扫频范围。",
      "播放测试音或下载为 WAV 文件。"
    ],
    examples: ["生成 440Hz 基准音用于音响校准。", "生成 20Hz-20kHz 扫频测试扬声器频响。"]
  },
  "batch-file-hash-calculator": {
    name: "批量文件哈希计算器",
    description: "批量计算文件 SHA 摘要，生成校验清单并导出 CSV。",
    intro: "上传多个文件，批量计算 SHA-256 等哈希值，生成可导出的校验清单。",
    steps: [
      "上传一个或多个文件。",
      "选择摘要算法，查看每个文件的哈希值。",
      "复制摘要或导出 CSV 校验清单。"
    ],
    examples: ["校验下载的安装包完整性。", "为批量文件生成 SHA-256 校验清单。"]
  },
  "border-radius-generator": {
    name: "圆角生成器",
    description: "可视化编辑 border-radius，支持统一圆角与各角独立控制，生成 CSS。",
    intro: "通过滑块和输入框调整元素的圆角大小，支持统一设置和四个角独立控制两种模式。",
    steps: [
      "选择「统一圆角」或「各角独立」模式。",
      "拖动滑块或输入数值调整每个角的圆角半径。",
      "调整元素尺寸和背景颜色，确认后复制生成的 CSS 代码。"
    ],
    examples: ["为一个按钮卡片设置 12px 统一圆角。", "创建只有左上和右下圆角的不对称形状。"]
  },
  "box-shadow-generator": {
    name: "CSS 效果工作台",
    description: "组合 box-shadow、边框、圆角、backdrop-filter 和 text-shadow，生成可复制的 CSS 效果。",
    intro: "用可视化控件调整阴影、边框、圆角和模糊效果，实时预览并生成可直接使用的 CSS 代码。",
    steps: [
      "调整阴影偏移、模糊、扩散和颜色。",
      "设置边框、圆角和背景滤镜。",
      "复制生成的 CSS 代码到项目中。"
    ],
    examples: ["设计卡片悬浮阴影效果。", "生成毛玻璃背景的 backdrop-filter 代码。"]
  },
  "brick-breaker": {
    name: "霓虹打砖块",
    description: "炫彩霓虹打砖块游戏。拥有流畅的 Canvas 粒子动画、多种增益道具（多球分裂、挡板加长、磁力吸附、激光射击、保护盾）、多种关卡设计与物理碰撞音效合成器，支持键盘/鼠标/触屏控制与视觉特效配置。",
    intro: "控制挡板接住弹球，击碎所有彩色霓虹砖块。拾取掉落的道具获得多球分裂、激光武器等赛博加成，并在高连击中挑战更高得分记录。",
    steps: [
      "拖动鼠标、滑动手指或使用 A/D 键控制底部发光挡板左右移动。",
      "按空格键或点击屏幕将球向斜上方发射，球在碰撞砖块、墙壁和挡板时会自动弹起。",
      "当砖块被粉碎时，有几率掉落发光道具。用挡板接住道具即可激活如加长挡板、多球分裂或激光武器等强力增益。",
      "如果在激光道具生效期间，按空格键或点击屏幕可向正上方发射激光，直接摧毁路径上的砖块。"
    ],
    examples: ["在第三关“心动霓虹”中挑战高 Combo 得分倍增。", "利用多球分裂和激光枪迅速打破坚固的防守砖块。"]
  },
  "browser-sandbox-console": {
    name: "浏览器沙箱控制台",
    description: "在隔离 iframe 中运行 HTML/CSS/JS 片段，捕获 console 输出并生成可复制的 srcdoc。",
    intro: "在隔离沙箱中运行前端代码片段，捕获控制台输出，适合安全测试和小型原型验证。",
    steps: [
      "在编辑区输入 HTML、CSS 和 JavaScript 代码。",
      "点击运行，查看沙箱中的渲染结果和 console 输出。",
      "复制 srcdoc 或调整代码后重新运行。"
    ],
    examples: ["测试第三方组件在沙箱中的行为。", "调试 JavaScript 代码片段的 console 输出。"]
  },

  "changelog-generator": {
    name: "Changelog 生成器",
    description: "从 Conventional Commit 文本生成 Keep a Changelog 风格的版本记录。",
    intro: "把 Conventional Commit 消息粘贴进来，自动归类并生成规范的 Changelog。",
    steps: [
      "粘贴 Conventional Commit 消息列表。",
      "选择版本号和发布日期。",
      "复制生成的 Changelog Markdown。"
    ],
    examples: ["为发布版本生成 Features / Fixes 分类。", "把 Git log 整理成面向用户的变更日志。"]
  },

  "color-palette-generator": {
    name: "色阶生成器",
    description: "基于一个 HEX 颜色生成浅色、深色和强调色阶。",
    intro: "输入一个品牌主色，自动生成完整的浅色和深色色阶，适合设计系统和主题开发。",
    steps: [
      "输入主色的 HEX 值或使用颜色选择器。",
      "查看生成的浅色和深色色阶。",
      "复制目标色值到设计 Token 或 CSS 变量。"
    ],
    examples: ["从品牌蓝色生成完整的色阶系统。", "为暗色模式生成对应的深色变体。"]
  },
  "cron-helper": {
    name: "Cron 表达式助手",
    description: "解析 5 段 Cron 表达式，解释字段并预估后续运行时间。",
    intro: "输入 Cron 表达式，查看每个字段的解释和接下来 5 次执行时间，适合定时任务排障。",
    steps: [
      "输入标准的 5 段 Cron 表达式。",
      "查看各字段的详细解释。",
      "确认后续执行时间是否符合预期。"
    ],
    examples: ["检查每天凌晨 3 点备份任务的实际执行时间。", "验证 `0 9 * * 1-5` 是否在工作日 9 点执行。"]
  },
  "css-grid-generator": {
    name: "CSS Grid 生成器",
    description: "可视化调整列、行、间距和 auto-fit，生成可复制的 CSS Grid 布局代码。",
    intro: "用可视化面板调整 CSS Grid 参数，实时预览布局并生成可直接使用的 CSS 代码。",
    steps: [
      "设置列数、行数、间距和轨道尺寸。",
      "调整 auto-fit 或 auto-fill 行为。",
      "复制生成的 CSS Grid 布局代码。"
    ],
    examples: ["设计三列自适应响应式网格。", "生成固定侧边栏加弹性主区域的布局。"]
  },
  "css-specificity-calculator": {
    name: "CSS 权重计算器",
    description: "计算 CSS 选择器权重，拆分 ID、class/属性/伪类和元素/伪元素分数。",
    intro: "输入 CSS 选择器，立即计算权重分数和优先级比较，适合样式冲突排障。",
    steps: [
      "输入一个或多个 CSS 选择器。",
      "查看 ID、Class、Element 三部分权重。",
      "比较选择器优先级，定位样式覆盖问题。"
    ],
    examples: ["比较 `.nav .item` 和 `#header .item` 的优先级。", "检查复杂选择器的权重分布。"]
  },
  "csv-cleaner": {
    name: "CSV 清洗器",
    description: "清洗、去重、排序和筛选 CSV 表格，并输出可复制的标准 CSV。",
    intro: "把 CSV 数据粘贴进来，清洗空白、去重、排序和筛选列，生成干净的 CSV 输出。",
    steps: [
      "粘贴 CSV 数据，确认表头和分隔符。",
      "选择清洗操作：去重、排序、筛选和列裁剪。",
      "复制清洗后的 CSV 或导出为文件。"
    ],
    examples: ["清洗用户导入数据中的重复行。", "过滤 CSV 中的空值和异常数据。"]
  },
  "db-connection-string-workbench": {
    name: "数据库连接串工作台",
    description: "解析和重建 PostgreSQL、MySQL、Redis 连接串，输出脱敏摘要、环境变量和客户端命令。",
    intro: "粘贴数据库连接字符串，解析各组成部分，生成脱敏版本和环境变量配置。",
    steps: [
      "粘贴 PostgreSQL、MySQL 或 Redis 连接串。",
      "查看解析出的协议、主机、端口、数据库和用户。",
      "复制脱敏摘要、环境变量或客户端连接命令。"
    ],
    examples: ["分享连接串时生成脱敏版本。", "把连接串拆分为环境变量配置。"]
  },
  "decision-wheel": {
    name: "随机决策转盘",
    description: "输入候选项和可选权重，用可复现 seed 随机抽取结果并保留选择历史。",
    intro: "输入选项和权重，点击旋转随机抽取结果，适合团队决策、抽奖和活动互动。",
    steps: [
      "输入候选项，每行一个，可选设置权重。",
      "点击旋转按钮随机抽取。",
      "查看抽取结果和选择历史。"
    ],
    examples: ["聚餐投票在几个餐厅中随机决定。", "团队活动抽奖分配奖品。"]
  },
  "random-picker": {
    name: "随机抽取工具",
    description: "支持随机数区间提取及自定义列表项抽取，配有卡片翻转动画与声音反馈。",
    intro: "设定数字区间或导入列表，支持自定义抽取个数、排重与排序，快速摇出结果。",
    steps: [
      "选择‘随机抽取数字’或‘从列表抽取’页签。",
      "设定取数范围或编辑/导入自定义列表项。",
      "调整抽取个数、重复性、排序等设置，点击开始抽取。",
      "等待卡片滚动动画停稳，查看结果并可在历史中一键复制。"
    ],
    examples: ["从班级名单中随机挑选学生发言。", "生成 1 到 100 之间的 5 个不重复中奖号码。"]
  },
  "dice-roller": {
    name: "3D 摇色子与骰子游戏",
    description: "多面体掷骰工具，包含 3D 物理立方骰和骰宝、骰子大对决等多种趣味小游戏。",
    intro: "自由配置各种面数的骰子投掷，或者使用筹码畅玩猜大小（骰宝）和骰子点数比拼游戏。",
    steps: [
      "自由投掷模式下，点击增减 D4-D100 各类骰子个数，点击投掷查看 3D 旋转效果。",
      "趣味骰宝模式下，下注‘大/小/单/双/豹子’，点击摇骰晃动金杯结算筹码。",
      "骰子对决模式下，设置对战筹码后与 AI 各摇 5 颗骰子，根据扑克牌型比拼大小。"
    ],
    examples: ["桌游跑团掷 D20/D100 检定判定结果。", "休闲娱乐时和好友畅玩掷骰子猜点数比拼。"]
  },
  "dependency-risk-explainer": {
    name: "依赖风险解释器",
    description: "从依赖清单中提取维护、版本、安全和供应链风险信号。",
    intro: "粘贴项目依赖清单，自动分析维护状态、版本健康度和已知安全风险。",
    steps: [
      "粘贴 package.json、requirements.txt 或 Cargo.toml 等依赖文件。",
      "查看维护状态、版本滞后度和安全风险。",
      "根据建议升级有风险的依赖包。"
    ],
    examples: ["检查 npm 依赖是否包含已废弃的包。", "分析 Python 依赖的已知 CVE 风险。"]
  },
  "discount-stack-calculator": {
    name: "叠加优惠计算器",
    description: "模拟百分比、满减、优惠码、税费和物流叠加后的订单价格、折扣率与利润影响。",
    intro: "输入商品价格和多种优惠规则，模拟叠加计算后的最终价格和利润影响。",
    steps: [
      "输入商品原价和数量。",
      "添加百分比折扣、满减、优惠码、税率和运费。",
      "查看最终价格、折扣率和利润影响。"
    ],
    examples: ["模拟双十一满减叠加店铺优惠券。", "计算跨境订单含税含运费的最终价格。"]
  },
  "docker-compose-validator": {
    name: "Docker Compose 校验器",
    description: "快速检查 Compose services、镜像标签、端口、权限和健康检查。",
    intro: "粘贴 docker-compose.yml 内容，检查服务配置、镜像版本和常见错误。",
    steps: [
      "粘贴 Compose 文件 YAML。",
      "查看服务数量、镜像检查和配置问题。",
      "按提示修复镜像标签、端口映射或健康检查。"
    ],
    examples: ["上线前检查 Compose 文件配置完整性。", "检查镜像是否使用了 latest 标签。"]
  },
  "docker-run-to-compose": {
    name: "Docker Run 转 Compose",
    description: "把常见 docker run 命令转换为 compose.yaml 服务草稿，保留端口、环境变量、挂载和重启策略。",
    intro: "粘贴 docker run 命令，自动解析参数并生成对应的 docker-compose 服务配置。",
    steps: [
      "粘贴完整的 docker run 命令。",
      "查看解析出的端口、环境变量、挂载和重启策略。",
      "复制生成的 compose.yaml 服务定义。"
    ],
    examples: ["把开发用 docker run 命令转成 Compose 配置。", "从 docker run 参数生成可复用的服务编排。"]
  },
  "dockerfile-linter": {
    name: "Dockerfile 检查器",
    description: "检查 Dockerfile 的基础镜像、缓存、安全和运行时风险。",
    intro: "粘贴 Dockerfile 内容，检查镜像层级、缓存利用、安全最佳实践和运行时风险。",
    steps: [
      "粘贴 Dockerfile 内容。",
      "查看基础镜像、层级总数和缓存使用情况。",
      "按安全建议修复 root 运行或敏感信息泄露。"
    ],
    examples: ["审查 Dockerfile 是否使用了固定版本镜像。", "检查多阶段构建是否合理利用缓存。"]
  },
  "easing-cubic-bezier-debugger": {
    name: "Easing / Cubic Bezier 调试器",
    description: "调试 cubic-bezier 曲线、预览动画节奏，并复制 CSS easing token。",
    intro: "用可视化控件调整 cubic-bezier 曲线参数，预览动画效果并复制生成的 CSS。",
    steps: [
      "拖动控制点调整贝塞尔曲线。",
      "选择预设缓动函数或手动微调。",
      "复制 CSS cubic-bezier 值到动画代码中。"
    ],
    examples: ["设计弹性的入场动画缓动曲线。", "微调页面过渡动画的节奏感。"]
  },
  "ecommerce-margin-calculator": {
    name: "电商利润计算器",
    description: "按售价、成本、平台费、广告费、物流和退货率计算电商毛利、净利、保本 ROAS 和建议售价。",
    intro: "输入商品售价、成本和各项费用，一键计算利润、毛利率和保本 ROAS。",
    steps: [
      "填写售价、成本、平台佣金和广告费用。",
      "设置物流费用和预期退货率。",
      "查看毛利、净利、ROAS 和建议售价。"
    ],
    examples: ["计算单品在扣除广告费后的净利。", "根据目标利润率反推建议售价。"]
  },
  "email-template-sandbox-preview": {
    name: "邮件模板沙箱预览",
    description: "编辑 HTML 邮件模板并在沙盒 iframe 中实时预览渲染效果，支持变量替换和响应式预览。",
    intro: "在沙箱环境中编辑和预览 HTML 邮件模板，支持变量替换和移动端响应式效果。",
    steps: [
      "输入或粘贴 HTML 邮件模板代码。",
      "设置模板变量值查看替换效果。",
      "在桌面和移动端视图之间切换预览。"
    ],
    examples: ["调试邮件模板在不同客户端的渲染效果。", "预览变量替换后的个性化邮件内容。"]
  },
  "env-diff-merge-sanitizer": {
    name: ".env 对比合并脱敏工具",
    description: "对比、合并并脱敏 .env 文件，生成安全的示例配置。",
    intro: "对比两个 .env 文件差异，合并配置项，并自动脱敏敏感值生成 .env.example。",
    steps: [
      "粘贴旧版和新版 .env 文件。",
      "查看新增、删除和变更的配置项。",
      "导出合并后的内容或脱敏的 .env.example。"
    ],
    examples: ["部署前合并多个环境配置。", "从生产 .env 生成不含值的示例配置。"]
  },

  "exif-metadata-tool": {
    name: "EXIF 元数据工具",
    description: "查看 JPEG EXIF 和 PNG 文本元数据，并生成移除元数据后的图片文件。",
    intro: "上传图片查看 EXIF 元数据，包括相机、GPS、日期等信息，并生成清理后的版本。",
    steps: [
      "上传 JPEG 或 PNG 图片。",
      "查看 EXIF 和元数据信息。",
      "下载移除元数据后的图片文件。"
    ],
    examples: ["上传前检查图片是否包含 GPS 位置。", "批量清理图片中的拍摄信息。"]
  },
  "favicon-app-icon-generator": {
    name: "Favicon / App Icon 生成器",
    description: "用文字、颜色和形状生成 favicon、Apple Touch Icon 与 PWA 图标素材。",
    intro: "用文字和颜色快速生成 favicon、Apple Touch Icon 和 PWA 图标。",
    steps: [
      "输入图标文字和背景颜色。",
      "选择形状、字体大小和圆角。",
      "下载各平台的 favicon 和图标文件。"
    ],
    examples: ["为开发环境生成临时 favicon。", "快速生成 PWA 应用的各尺寸图标。"]
  },
  "ffmpeg-editor": {
    name: "FFmpeg 命令编辑器",
    description: "生成常见转码、裁剪、缩放和抽帧 FFmpeg 命令，并预览本地媒体文件信息。",
    intro: "用表单配置转码参数，生成可执行的 FFmpeg 命令，适合不熟悉命令行的用户。",
    steps: [
      "选择操作类型（转码、裁剪、缩放等）。",
      "填写输入文件、输出格式和参数。",
      "复制生成的 FFmpeg 命令到终端执行。"
    ],
    examples: ["生成视频转 GIF 的命令。", "生成批量缩放图片的 FFmpeg 命令。"]
  },
  "file-manifest-generator": {
    name: "文件清单生成器",
    description: "从目录结构文本生成文件清单（manifest），支持 JSON / YAML / Markdown 输出格式。",
    intro: "粘贴目录结构或文件列表，自动生成格式化的文件清单。",
    steps: [
      "输入目录结构文本或文件路径列表。",
      "选择输出格式（JSON、YAML 或 Markdown）。",
      "复制生成的文件清单用于文档或配置。"
    ],
    examples: ["为项目生成文件清单用于文档。", "把目录树转换为配置文件清单。"]
  },
  "flashcard-cloze-builder": {
    name: "闪卡填空题生成器",
    description: "从学习笔记生成问答卡、填空卡和 Anki TSV，支持关键词标记、难度和复习提示。",
    intro: "把学习笔记粘贴进来，标记关键词，自动生成问答卡和填空卡用于复习。",
    steps: [
      "粘贴学习笔记内容。",
      "标记需要考查的关键词或概念。",
      "导出 Anki TSV 或复制生成的闪卡。"
    ],
    examples: ["从课程笔记生成复习闪卡。", "为外语学习制作填空式单词卡。"]
  },
  "flexbox-generator": {
    name: "Flexbox 生成器",
    description: "可视化调试方向、换行、主轴和交叉轴对齐，生成 Flexbox CSS。",
    intro: "用可视化面板调整 Flexbox 属性，实时查看子元素排列效果并生成 CSS 代码。",
    steps: [
      "设置 flex-direction、flex-wrap 和 justify-content。",
      "调整 align-items 和 align-content。",
      "复制生成的 Flexbox CSS 代码。"
    ],
    examples: ["设计水平垂直居中的 Flexbox 布局。", "调试响应式导航栏的子元素排列。"]
  },
  "font-scale-generator": {
    name: "字号比例生成器",
    description: "生成静态字号比例或响应式 clamp() 排版 scale、CSS token 和预览样张。",
    intro: "可在静态字号梯级和 fluid clamp 两种模式间切换，统一生成设计系统常用的排版 token。",
    steps: [
      "选择静态 scale 或 fluid clamp 模式。",
      "根据模式设置基础字号、比例、视口范围和 token 前缀。",
      "查看排版预览后复制 CSS token 或 clamp() 代码。"
    ],
    examples: ["为设计系统生成 1.25 比例的 Major Third 字号系统。", "为标题生成从移动端到桌面端平滑缩放的 clamp() token。"]
  },
  "git-bisect-planner": {
    name: "Git Bisect 规划器",
    description: "根据 good/bad ref、测试命令和路径范围生成 git bisect 脚本、检查清单和复盘模板。",
    intro: "输入 good/bad 提交、测试命令和路径范围，生成完整的 git bisect 操作脚本。",
    steps: [
      "填写 good 和 bad 提交的 ref。",
      "输入测试命令和相关文件路径。",
      "复制生成的 git bisect 脚本到终端执行。"
    ],
    examples: ["用 git bisect 定位引入回归的提交。", "生成限定路径范围的二分查找脚本。"]
  },
  "git-patch-security-reviewer": {
    name: "Git Patch 安全审查器",
    description: "扫描 Git diff 中新增的密钥、危险 API、弱加密、认证绕过和注入风险。",
    intro: "粘贴 Git diff 或 patch 内容，自动扫描新增代码中的安全风险。",
    steps: [
      "粘贴 git diff 或 patch 内容。",
      "查看识别的安全风险类型和位置。",
      "按修复建议调整代码。"
    ],
    examples: ["Code Review 时自动扫描密钥泄露。", "检查 PR diff 中引入的新安全风险。"]
  },
  "gitignore-generator": {
    name: ".gitignore 生成器",
    description: "组合常见技术栈模板，快速生成 .gitignore。",
    intro: "选择项目使用的技术栈和工具，自动组合生成完整的 .gitignore 文件。",
    steps: [
      "从列表中选择项目使用的语言、框架和工具。",
      "按需添加自定义忽略规则。",
      "复制生成的 .gitignore 到项目根目录。"
    ],
    examples: ["为 Node.js + Python 混合项目生成 .gitignore。", "为 Vue + Rust 项目组合忽略规则。"]
  },
  "grade-weight-calculator": {
    name: "成绩权重计算器",
    description: "按作业、测验、期中和期末权重计算当前成绩，并估算达到目标分数所需的剩余成绩。",
    intro: "输入各考核项的得分和权重，计算当前总成绩，并估算期末需要考多少分才能达成目标。",
    steps: [
      "添加考核项（作业、测验、期中、期末），填写得分和权重。",
      "设置目标总成绩。",
      "查看当前成绩和达到目标所需的期末分数。"
    ],
    examples: ["计算学期中已考科目的加权平均分。", "估算期末考试需要考多少分才能及格。"]
  },
  "gradient-generator": {
    name: "渐变主题 Token 生成器",
    description: "从渐变和品牌色生成 palette、语义色与 CSS theme tokens。",
    intro: "输入渐变颜色和品牌色，自动生成完整的色彩方案和 CSS 变量。",
    steps: [
      "设置渐变起始色和结束色。",
      "选择渐变方向和类型。",
      "复制生成的 CSS theme tokens 到项目中。"
    ],
    examples: ["为品牌生成渐变主题色板。", "生成带深色模式变量的 CSS tokens。"]
  },
  "graphql-workbench": {
    name: "GraphQL 工作台",
    description: "查看 GraphQL SDL 类型，并根据字段快速构造查询草稿。",
    intro: "粘贴 GraphQL Schema，查看所有类型和字段，勾选需要的字段生成查询。",
    steps: [
      "粘贴 GraphQL SDL Schema。",
      "浏览类型定义和字段列表。",
      "选择字段生成 Query 或 Mutation 草稿。"
    ],
    examples: ["从 Schema 快速生成接口查询语句。", "查看 GraphQL 类型间的关联关系。"]
  },
  "helm-values-diff": {
    name: "Helm Values 差异对比",
    description: "对比 Helm values 文件，列出新增、删除、变更和高风险配置项。",
    intro: "粘贴两个版本的 Helm values.yaml，快速对比差异并标记高风险变更。",
    steps: [
      "粘贴旧版和新版 values.yaml。",
      "查看新增、删除和变更的配置项。",
      "关注标记为高风险的变更项。"
    ],
    examples: ["升级 Helm Chart 前检查 values 变更。", "对比不同环境的 values 配置差异。"]
  },
  "html-css-js-playground": {
    name: "HTML / CSS / JS Playground",
    description: "在 iframe sandbox 中预览 HTML、CSS 和 JavaScript 片段，并导出完整单文件示例。",
    intro: "编写 HTML/CSS/JS 代码，在隔离沙箱中实时预览效果，适合前端原型验证。",
    steps: [
      "在编辑区编写 HTML 结构和 CSS 样式。",
      "添加 JavaScript 交互逻辑。",
      "查看实时预览，导出完整 HTML 文件。"
    ],
    examples: ["快速验证组件布局和样式效果。", "测试 JavaScript 交互逻辑的运行时行为。"]
  },
  "image-compressor": {
    name: "图片压缩器",
    description: "在浏览器本地压缩图片，支持尺寸限制、JPEG/WebP/PNG 输出和压缩率预览。",
    intro: "上传图片，在浏览器中本地压缩，选择输出格式和质量，实时查看压缩效果。",
    steps: [
      "上传需要压缩的图片。",
      "调整质量参数和输出格式（JPEG/WebP/PNG）。",
      "对比压缩前后大小，下载压缩后的图片。"
    ],
    examples: ["为网页优化 JPEG 图片大小。", "将图片转为 WebP 格式提升加载速度。"]
  },
  "image-ocr-preprocessor": {
    name: "图片 OCR 预处理器",
    description: "在本地用 canvas 对图片做灰度、阈值、对比度、反色和缩放预处理，导出更适合 OCR 的 PNG。",
    intro: "对图片进行灰度化、二值化、对比度增强等预处理，生成更适合 OCR 识别的图像。",
    steps: [
      "上传需要处理的图片。",
      "调整灰度、阈值、对比度和反色参数。",
      "导出预处理后的 PNG，用于 OCR 识别。"
    ],
    examples: ["增强扫描文档的对比度提高 OCR 准确率。", "将彩色文档转为黑白二值图。"]
  },
  "ipv4-cidr-calculator": {
    name: "IPv4 CIDR 计算器",
    description: "计算 IPv4 CIDR 网段、掩码、广播地址和可用主机数。",
    intro: "输入 IP 和 CIDR 前缀，查看网络地址、广播地址、掩码和可用主机范围。",
    steps: [
      "输入 IP 地址和 CIDR 前缀。",
      "查看网络地址、广播地址和子网掩码。",
      "确认可用主机数量和地址范围。"
    ],
    examples: ["计算 /24 网段的可用主机数。", "规划子网划分时的地址范围。"]
  },
  "json-schema-studio": {
    name: "JSON Schema 工作台",
    description: "从 JSON 示例生成 Schema，并在本地校验 JSON 数据。",
    intro: "粘贴 JSON 示例，自动生成对应的 JSON Schema，再验证其他 JSON 是否符合该 Schema。",
    steps: [
      "粘贴 JSON 示例数据。",
      "查看自动生成的 JSON Schema。",
      "粘贴其他 JSON 数据验证是否符合 Schema。"
    ],
    examples: ["从 API 响应生成数据校验 Schema。", "验证配置文件是否符合预定义格式。"]
  },
  "kubernetes-probe-builder": {
    name: "Kubernetes Probe 生成器",
    description: "生成 liveness、readiness、startup probes，并计算失败窗口、启动预算和常见误配置风险。",
    intro: "用表单配置 Kubernetes 探针参数，生成 YAML 配置并检查失败窗口和启动风险。",
    steps: [
      "选择探针类型（liveness/readiness/startup）。",
      "填写探测路径、端口、延迟和超时参数。",
      "复制生成的 YAML 并检查失败窗口风险提示。"
    ],
    examples: ["为 Web 服务生成 readiness probe。", "为启动慢的应用配置 startup probe 参数。"]
  },
  "kubernetes-yaml-validator": {
    name: "Kubernetes YAML 校验器",
    description: "检查 Kubernetes manifest 的必填字段、镜像标签、资源限制和探针配置。",
    intro: "粘贴 Kubernetes YAML 配置，检查必填字段、镜像标签和资源限制等常见问题。",
    steps: [
      "粘贴 Kubernetes YAML manifest。",
      "查看必填字段缺失、镜像标签问题和资源限制检查。",
      "按建议修复配置问题后重新验证。"
    ],
    examples: ["上线前检查 Deployment YAML 的配置完整性。", "检查 Pod 是否缺少资源 requests 和 limits。"]
  },
  "large-text-tools": {
    name: "大文本处理工具",
    description: "对大文本执行分割、合并、按行去重和块级去重，适合日志与批量文本整理。",
    intro: "对大文本进行分割、合并、去重和行操作，适合处理日志文件和批量文本。",
    steps: [
      "粘贴大文本内容到输入区。",
      "选择分割、合并、去重等操作。",
      "复制处理后的结果或检查行数变化。"
    ],
    examples: ["按行数分割大型日志文件。", "去重合并多份配置文件的重复行。"]
  },
  "license-compatibility-checker": {
    name: "许可证兼容性检查器",
    description: "按项目分发方式检查常见开源许可证组合的兼容性风险。",
    intro: "选择项目许可证和依赖许可证，检查组合使用的兼容性风险。",
    steps: [
      "选择项目的许可证类型。",
      "添加项目使用的主要依赖许可证。",
      "查看兼容性结果和潜在法律风险。"
    ],
    examples: ["检查 MIT 项目能否使用 GPL 库。", "评估商业产品使用 Apache 2.0 依赖的影响。"]
  },
  "link-collection-curator": {
    name: "链接收藏整理器",
    description: "整理 URL 清单，自动校验链接、按标签分组，并导出 Markdown 或 JSON 资源目录。",
    intro: "粘贴 URL 清单，自动检测链接有效性，按标签分组整理并导出资源目录。",
    steps: [
      "粘贴 URL 列表，每行一个。",
      "规划链接分组标签。",
      "导出结构化的 Markdown 或 JSON 资源目录。"
    ],
    examples: ["整理研究资料链接收藏。", "为团队导出带分类的文档链接清单。"]
  },
  "live-event-countdown": {
    name: "活动倒计时器",
    description: "创建实时倒计时，支持多个事件、自定义标签和时间到期提醒。",
    intro: "添加多个事件时间点，实时查看倒计时，支持自定义标签和到期状态提醒。",
    steps: [
      "添加事件名称和目标日期时间。",
      "查看每个事件的实时倒计时。",
      "事件到期后自动标记为已过期。"
    ],
    examples: ["为产品发布设置倒计时。", "跟踪多个截止日期。"]
  },


  "lorem-ipsum-generator": {
    name: "占位文本生成器",
    description: "生成占位标题、句子和段落，用于原型和视觉稿。",
    intro: "按需生成 Lorem Ipsum 占位文本，支持单词、句子、段落和 HTML 格式输出。",
    steps: [
      "选择生成类型（单词、句子、段落）。",
      "设置生成数量和可选长度范围。",
      "复制生成的占位文本到原型或设计稿。"
    ],
    examples: ["为页面设计稿生成占位段落。", "生成列表测试数据。"]
  },
  "media-device-permission-lab": {
    name: "媒体设备权限实验室",
    description: "检测 camera/microphone 权限、枚举媒体设备、预览摄像头并显示麦克风实时音量。",
    intro: "检测浏览器媒体设备权限状态，预览摄像头画面和麦克风音量，适合设备调试。",
    steps: [
      "点击检测权限，查看摄像头和麦克风授权状态。",
      "查看已连接的媒体设备和详细信息。",
      "测试摄像头预览和麦克风音量。"
    ],
    examples: ["调试 WebRTC 应用前的设备检测。", "排查浏览器媒体权限配置问题。"]
  },
  "memory-match": {
    name: "记忆翻牌",
    description: "精美 3D 翻牌记忆力训练游戏，拥有丝滑的翻转动画、多种卡片主题（技术图标、趣味表情、赛博霓虹）、连消得分加成及合成器轻快音效，支持不同棋盘大小与最高分纪录保存。",
    intro: "翻开卡片寻找配对，在限定步骤和时间内匹配所有图案，并在连续配对中达成 Combo 获得和弦音效加成。",
    steps: [
      "选择卡片难度（简单 4x4、中等 6x6 或困难 6x8）与水果/动物/赛博主题。",
      "点击卡片，卡片会以 3D 效果翻转，展示背面的图案内容。",
      "依次翻开第二张卡片。若两张图案相同则完成配对消除，否则会重新翻转盖回。",
      "在 3.5 秒内连续配对可以激活 Combos 连消，发出上升的和弦声效。"
    ],
    examples: ["在困难 6x8 极速配对中挑战最少步数通关记录。", "通过和弦 Combo 连击音效体验记忆消除的解压快感。"]
  },
  "meta-tags-seo-preview": {
    name: "Meta Tags SEO 预览器",
    description: "检查 title、description、canonical、robots，并预览搜索结果、Open Graph 和 Twitter Card。",
    intro: "填写网页的 meta 标签，同时查看搜索结果、Facebook、LinkedIn 和 X 卡片预览。",
    steps: [
      "填写 title、description 和 canonical URL。",
      "设置 robots、图片、图片替代文本和社交分享标签。",
      "查看 Google 搜索结果片段以及不同平台的分享卡片预览。"
    ],
    examples: ["优化博客文章的搜索引擎展示标题。", "为活动页同时检查 OG 图和 Twitter Card。"]
  },
  "mock-data-generator": {
    name: "Mock 数据生成器",
    description: "按字段 schema 生成可复现的 mock 数据，并导出 JSON、NDJSON 或 CSV。",
    intro: "定义字段名和类型，一键生成可复现的模拟数据，适合前端开发和测试。",
    steps: [
      "添加字段定义（字段名、类型、格式）。",
      "设置生成条数和随机种子。",
      "导出 JSON、NDJSON 或 CSV 格式的 mock 数据。"
    ],
    examples: ["生成 100 条用户列表 mock 数据。", "为前端表格生成带各种字段类型的测试数据。"]
  },
  "notification-payload-tester": {
    name: "通知 Payload 测试器",
    description: "配置、预览和复制浏览器 Notification API payload，记录授权状态与发送历史。",
    intro: "配置浏览器通知的标题、正文和图标，测试通知展示效果。",
    steps: [
      "输入通知标题、正文和图标 URL。",
      "点击发送测试通知。",
      "查看通知历史和浏览器授权状态。"
    ],
    examples: ["测试 PWA 推送通知的展示效果。", "调试通知的图标和操作按钮。"]
  },
  "oauth-oidc-debugger": {
    name: "OAuth / OIDC 调试器",
    description: "解析授权 URL、OIDC ID Token，并生成 PKCE challenge。",
    intro: "解析 OAuth 授权 URL 和 OIDC ID Token，生成 PKCE code verifier 和 challenge，适合 SSO 调试。",
    steps: [
      "粘贴授权 URL 或 ID Token。",
      "查看解析出的参数、claims 和签名信息。",
      "按需生成 PKCE challenge。"
    ],
    examples: ["调试 OIDC 登录流程中的 ID Token 解析。", "生成 OAuth 授权码流程所需的 PKCE 参数。"]
  },
  "openapi-workbench": {
    name: "OpenAPI 工作台",
    description: "查看、格式化、Diff OpenAPI/Swagger JSON，并生成基础 Mock 响应。",
    intro: "粘贴 OpenAPI/Swagger JSON，格式化查看结构、对比差异并生成 Mock 响应。",
    steps: [
      "粘贴 OpenAPI JSON 或 YAML。",
      "查看路径、方法和 Schema 概览。",
      "格式化输出或生成 Mock 响应。"
    ],
    examples: ["格式化新的 OpenAPI 规范文件。", "对比两个版本 API 规范差异。"]
  },
  "parquet-arrow-preview": {
    name: "Parquet / Arrow 预览器",
    description: "预览 Parquet、Arrow IPC 与 Feather 文件的格式标记、页脚和字节结构。",
    intro: "上传或粘贴 Parquet/Arrow 文件的十六进制，查看格式标记和元数据结构。",
    steps: [
      "上传 Parquet 或 Arrow 文件。",
      "查看文件格式标记、 Schema 和页脚信息。",
      "分析列式存储的元数据。"
    ],
    examples: ["检查 Parquet 文件的 Schema 定义。", "查看 Arrow IPC 文件的格式标记。"]
  },
  "pdf-metadata-tool": {
    name: "PDF 元数据工具",
    description: "查看 PDF Info 字典和 XMP 元数据，并生成保留字节偏移的清理版本。",
    intro: "上传 PDF 文件，查看文档元数据包括标题、作者、创建工具和 XMP 信息。",
    steps: [
      "上传 PDF 文件。",
      "查看 Info 字典和 XMP 元数据。",
      "导出元数据报告或清理元数据后的版本。"
    ],
    examples: ["检查 PDF 文档的作者和创建工具信息。", "分享前清除 PDF 中的敏感元数据。"]
  },
  "pdf-tools": {
    name: "PDF 工具",
    description: "本地合并、拆分和无损整理压缩 PDF，适合快速处理常见未加密 PDF。",
    intro: "在浏览器本地合并、拆分和压缩 PDF 文件，所有操作在本地完成，不上传服务器。",
    steps: [
      "上传需要处理的 PDF 文件。",
      "选择操作类型（合并、拆分、压缩）。",
      "下载处理后的 PDF 文件。"
    ],
    examples: ["合并多个 PDF 章节为一个文档。", "拆分 PDF 中的指定页面范围。"]
  },
  "pem-jwk-toolkit": {
    name: "PEM / JWK / CSR 工具箱",
    description: "在 RSA 公钥 PEM 和 JWK 之间转换，并解析 CSR/PEM 基础信息。",
    intro: "在 PEM 和 JWK 格式之间转换 RSA 公钥，解析 CSR 证书签名请求。",
    steps: [
      "粘贴 PEM 公钥或 JWK 文本。",
      "选择转换方向查看结果。",
      "按需解析 CSR 获取证书基础信息。"
    ],
    examples: ["将 PEM 格式公钥转换为 JWK 用于验证 JWT。", "查看 CSR 中的 Subject 和 SAN 信息。"]
  },
  "percentage-calculator": {
    name: "百分比计算器",
    description: "计算百分比、增减幅和 A 相对 B 的占比。",
    intro: "快速计算百分比相关的各种场景：占比、增减比例和相对比例。",
    steps: [
      "输入 A 值和 B 值。",
      "选择计算类型（占比、增减幅）。",
      "查看百分比和计算结果。"
    ],
    examples: ["计算 A 占 B 的百分比。", "计算数值从 A 到 B 的增长幅度。"]
  },
  "pii-detector": {
    name: "PII 检测器",
    description: "本地检测文本中的邮箱、电话、身份证明、银行卡、地址和网络标识符。",
    intro: "粘贴文本，在浏览器本地检测电子邮件、电话号码、身份证号等个人敏感信息。",
    steps: [
      "粘贴待检测的文本。",
      "查看检测到的 PII 类型、位置和数量。",
      "根据检测结果脱敏或处理敏感信息。"
    ],
    examples: ["扫描日志中是否泄露用户邮箱。", "检查配置文件中是否包含内网 IP 地址。"]
  },
  "pomodoro-focus-timer": {
    name: "番茄专注计时器",
    description: "配置番茄钟、短休息和长休息节奏，记录完成轮次并生成可复制的专注计划。",
    intro: "使用番茄工作法管理时间，设置专注和休息时长，记录完成的轮次。",
    steps: [
      "设置番茄钟时长、短休息时长和长休息间隔。",
      "点击开始专注计时。",
      "完成轮次后查看统计和休息提醒。"
    ],
    examples: ["使用 25 分钟番茄钟进入深度工作。", "设置 4 轮番茄钟后的长休息节奏。"]
  },

  "privacy-cookie-copy-generator": {
    name: "隐私 / Cookie 文案生成器",
    description: "根据数据类型、用途和 Cookie 分类生成隐私政策与 Cookie 文案草稿。",
    intro: "填写网站收集的数据类型和用途，生成隐私政策和 Cookie 声明草稿。",
    steps: [
      "选择网站收集的数据类型（邮箱、位置、行为等）。",
      "填写 Cookie 用途和第三方服务。",
      "复制生成的隐私政策或 Cookie 文案。"
    ],
    examples: ["为 SaaS 产品生成隐私政策初稿。", "生成 Cookie 同意弹窗的文案内容。"]
  },
  "python-playground": {
    name: "Python Playground",
    description: "通过 Pyodide (WASM) 在浏览器中运行 Python 代码，支持 pip 包安装和实时输出。",
    intro: "在浏览器中直接运行 Python 代码，无需任何服务端。支持 pip 安装包、标准输出和错误提示。",
    steps: [
      "在代码编辑器中输入 Python 代码。",
      "需要时使用 %pip install 安装第三方包。",
      "点击运行查看 stdout 和 stderr 输出。"
    ],
    examples: ["运行数据处理脚本查看结果。", "测试 Python 代码片段是否正确。"]
  },

  "qr-barcode-tool": {
    name: "二维码 / 条形码工具",
    description: "生成本地 QR Code 与 Code 128 条形码，并通过浏览器 BarcodeDetector 解析图片。",
    intro: "生成二维码或条形码，或上传图片解析其中的条码内容。",
    steps: [
      "输入需要编码的文本内容。",
      "选择生成 QR Code 或 Code 128 条码。",
      "下载码图或上传图片进行解码。"
    ],
    examples: ["为 URL 生成二维码方便扫码访问。", "解析图片中的条形码内容。"]
  },

  "random-team-generator": {
    name: "随机分队生成器",
    description: "把名单随机分队，支持种子、队伍数量、每队人数和避开同组约束。",
    intro: "输入成员名单，按队伍数量或每队人数随机分队，支持约束条件。",
    steps: [
      "粘贴成员名单（每行一个）。",
      "设置队伍数量或每队人数。",
      "设置随机种子确保结果可复现。"
    ],
    examples: ["为团队建设活动随机分组。", "课堂活动把学生随机分配到小组。"]
  },
  "release-notes-builder": {
    name: "发布说明生成器",
    description: "把亮点、修复、破坏性变更和升级步骤整理成面向用户的发布说明。",
    intro: "输入发布亮点、修复的问题和升级步骤，生成结构化的发布说明。",
    steps: [
      "填写版本号和发布日期。",
      "添加亮点功能、Bug 修复和破坏性变更。",
      "补充升级指南和兼容性说明。"
    ],
    examples: ["为版本发布整理面向用户的 Release Notes。", "生成包含升级步骤的发布公告。"]
  },
  "resource-unit-converter": {
    name: "资源单位换算器",
    description: "换算 Kubernetes CPU、内存和存储单位，生成 requests/limits 参考值。",
    intro: "在 Kubernetes 资源单位之间换算，帮助设置正确的 requests 和 limits 值。",
    steps: [
      "输入资源值和当前单位。",
      "选择目标单位进行换算。",
      "复制换算结果用于 Pod 配置。"
    ],
    examples: ["为 Pod 配置合理的内存资源 Requests。", "计算 CPU 核心 millicores 映射。"]
  },
  "reversi": {
    name: "黑白棋",
    description: "精美 3D 翻转动效黑白棋（奥赛罗）。支持双人同屏对战与人机对战（极简/中级 AI），提供落子步数提示、棋盘实时数量占比分析与物理碰撞音效，支持自定义棋盘配色主题。",
    intro: "点击发光合法点落子夹住对手棋子并翻面。在动态预览翻子路径和实时比率条中体验人机智力较量。",
    steps: [
      "在顶部下拉菜单中选择「人机对战」或「双人同屏」，还可指定 AI 难度与执子顺序。",
      "轮到你落子时，棋盘上会浮现出绿色的合法落子提示点。",
      "鼠标悬停在提示点上可实时预览落子后即将被翻转的所有对手棋盘子路径。",
      "落子后，所有夹在中间的棋子都会以逼真的 3D 翻转动效切换为你的颜色，直到棋盘填满或者双方无处落子后以棋子多者获胜。"
    ],
    examples: ["与中级 AI 在“资深棋手”难度下一决高下。", "预览吃子路径，精密计算走位以夺取四个角落控制权。"]
  },
  "ruby-playground": {
    name: "Ruby Playground",
    description: "通过 ruby.wasm 在浏览器中运行 Ruby 代码，并查看标准输出结果。",
    intro: "在浏览器中直接运行 Ruby 代码，无需安装环境，实时查看执行结果。",
    steps: [
      "在编辑器中编写 Ruby 代码。",
      "点击运行按钮执行代码。",
      "查看标准输出和控制台结果。"
    ],
    examples: ["快速验证 Ruby 代码逻辑。", "测试 Ruby 内置方法的返回值。"]
  },
  "sbom-viewer": {
    name: "SBOM 查看器",
    description: "解析 CycloneDX / SPDX SBOM，查看组件、许可证、依赖和漏洞摘要。",
    intro: "上传或粘贴 SBOM JSON，查看组件清单、许可证分布和漏洞信息。",
    steps: [
      "上传或粘贴 CycloneDX/SPDX SBOM。",
      "查看组件列表、许可证和依赖关系。",
      "检查已知漏洞和风险项。"
    ],
    examples: ["分析项目的开源组件和许可证合规性。", "检查 SBOM 中的已知安全漏洞。"]
  },
  "scientific-calculator": {
    name: "科学计算器",
    description: "支持代数、三角函数、指数对数、内存寄存器及历史记录的科学计算器。",
    intro: "专业的科学计算器，支持算式实时求值、内存寄存和物理键盘映射。",
    steps: [
      "在键盘区或使用物理键盘输入算式。",
      "实时预览或按等号查看最终求值结果。",
      "使用 DEG/RAD 切换角度模式，或使用内存寄存器存取临时结果。"
    ],
    examples: ["计算三角函数如 sin(π / 6) 的值。", "利用历史记录和寄存器完成复杂的链式代数计算。"]
  },
  "secrets-scanner": {
    name: "密钥扫描器",
    description: "本地扫描文本、env 或 repo 片段中的常见密钥和高熵 Token。",
    intro: "粘贴配置文件、代码或环境变量，检测硬编码密钥和令牌。",
    steps: [
      "粘贴需要扫描的文本内容。",
      "查看检测到的高熵字符串和密钥模式。",
      "按位置和类型处理发现的密钥。"
    ],
    examples: ["扫描 .env 文件中是否包含 API 密钥。", "检查代码仓库片段中的密钥泄露。"]
  },
  "semgrep-rule-playground": {
    name: "Semgrep 规则 Playground",
    description: "用轻量本地匹配预览 Semgrep YAML 规则、样例代码命中和规则元数据。",
    intro: "编写 Semgrep 规则和测试代码，在浏览器中预览匹配结果。",
    steps: [
      "在左侧编辑 Semgrep YAML 规则。",
      "在右侧粘贴待匹配的代码。",
      "查看匹配结果和规则元数据。"
    ],
    examples: ["编写检测硬编码密钥的 Semgrep 规则。", "测试 SQL 注入检测规则的效果。"]
  },
  "sitemap-xml-generator": {
    name: "Sitemap XML 生成器",
    description: "根据 URL 列表生成标准 sitemap.xml 文件，支持设置优先级、更新频率和最后修改时间。",
    intro: "输入网站 URL 列表，自动生成标准格式的 sitemap.xml，可设置优先级和更新频率。",
    steps: [
      "输入网站 URL 列表（每行一个）。",
      "设置可选的优先级、更新频率和最后修改时间。",
      "复制生成的 sitemap.xml 内容。"
    ],
    examples: ["为新站点生成 sitemap。", "更新现有站点的 sitemap 配置。"]
  },
  "slo-error-budget-calculator": {
    name: "SLO 错误预算计算器",
    description: "按 SLO、周期、请求量和事故分钟数计算错误预算、消耗率、剩余预算和发布风险。",
    intro: "根据 SLO 目标和请求量计算错误预算，监控消耗速率和部署风险。",
    steps: [
      "设置 SLO 百分比（如 99.9%）。",
      "输入周期总请求量和事故时长。",
      "查看错误预算消耗、剩余和发布风险评估。"
    ],
    examples: ["计算 99.9% SLO 下的月度错误预算。", "评估当前事故消耗是否允许发布。"]
  },
  "social-caption-hashtag-formatter": {
    name: "社媒文案与话题标签格式化器",
    description: "为社媒文案整理平台长度、换行、CTA、话题标签和 UTM 链接，生成多平台发布版本。",
    intro: "输入文案内容，自动适配各平台的字符限制和格式要求。",
    steps: [
      "编写文案正文和 CTA。",
      "添加话题标签和 UTM 链接。",
      "查看各平台适配结果并复制发布。"
    ],
    examples: ["为 Twitter 生成 280 字符限制的文案。", "生成 LinkedIn 和 Instagram 适配版本。"]
  },
  "social-post-scheduler": {
    name: "社媒发布排期器",
    description: "为多平台社媒文案生成发布排期、字符数检查、标签建议和 CSV 日历草稿。",
    intro: "安排多平台社媒内容的发布时间，生成发布日历 CSV。",
    steps: [
      "填写文案内容和目标平台。",
      "设置发布日期和时间。",
      "导出 CSV 发布日历。"
    ],
    examples: ["规划一周的社媒内容排期。", "为多平台协调发布时间。"]
  },
  "source-map-explorer": {
    name: "Source Map 分析器",
    description: "解析 Source Map，按源码查看映射分布，并把生成代码位置反查到原始源码。",
    intro: "上传 Source Map 文件，查看源码映射关系，从压缩代码定位到原始源码。",
    steps: [
      "粘贴或上传 Source Map JSON。",
      "查看源码文件列表和映射分布。",
      "输入生成代码的行列号反查原始位置。"
    ],
    examples: ["从生产环境错误堆栈定位到源码。", "分析打包后的源码文件大小分布。"]
  },
  "sudoku-game": {
    name: "数独大师",
    description: "经典数独游戏，支持多种难度，具备草稿笔记、一键排查冲突、计时与游戏存档功能，配有清新的动画及拟真音效。",
    intro: "填充 9x9 网格，让每一行、每一列及 9 个 3x3 宫格内均包含 1 到 9 的数字且不重复。",
    steps: [
      "选择简单、中等或困难的挑战难度，自动生成全新数独题目。",
      "点击格子，使用下方数字键盘或电脑键盘输入 1-9 填数。",
      "开启「草稿笔记」在格子内记录可能的候选数字，再次输入则消除。",
      "随时开启「实时冲突排查」辅助纠错，清空所有未填格且无冲突即可通关。"
    ],
    examples: ["在空闲碎片时间开一局简单数独开动脑筋。", "关闭冲突排查，挑战高难度的无提示硬核通关。"]
  },
  "spaced-repetition-planner": {
    name: "间隔重复学习计划器",
    description: "基于间隔重复算法生成学习计划，支持 SM-2 算法和自定义复习间隔。",
    intro: "设置学习内容，使用间隔重复算法生成最佳复习计划，提高长期记忆效率。",
    steps: [
      "输入要学习的内容主题和数量。",
      "选择复习算法（SM-2 或自定义间隔）。",
      "查看生成的复习时间表和提醒。"
    ],
    examples: ["为考试科目制定复习计划。", "规划语言学习单词的复习节奏。"]
  },
  "sql-explain-visualizer": {
    name: "SQL 执行步骤可视化器",
    description: "把 SQL 查询拆成扫描、过滤、聚合、排序等执行步骤。",
    intro: "输入 SQL 查询语句，可视化展示其执行计划步骤和操作流程。",
    steps: [
      "输入 SQL 查询语句。",
      "查看拆解后的执行步骤序列。",
      "分析扫描、过滤和排序等操作顺序。"
    ],
    examples: ["分析复杂 JOIN 查询的执行流程。", "检查 SQL 是否使用了全表扫描。"]
  },
  "sql-index-advisor": {
    name: "SQL 索引顾问",
    description: "从 SQL 查询中提取 WHERE、JOIN、ORDER BY 字段，生成索引候选、风险提示和可复制 DDL。",
    intro: "输入 SQL 查询，自动分析 WHERE 和 JOIN 条件，生成索引建议和 DDL。",
    steps: [
      "粘贴 SQL 查询语句。",
      "查看提取的索引候选字段。",
      "复制生成的 CREATE INDEX DDL 语句。"
    ],
    examples: ["为慢查询分析推荐合适的索引。", "检查查询中缺少索引的 JOIN 字段。"]
  },
  "sql-playground": {
    name: "SQL Playground",
    description: "在浏览器 Worker 中运行真实 SQLite/WASM，支持分开初始化表结构、初始化数据、清除数据和执行查询。",
    intro: "最上方输入表结构脚本，中间输入初始化数据，最下方输入查询；结果区统一展示当前数据库的结果、Schema、样例数据和关系图。",
    steps: [
      "在最上方输入框中编写 CREATE TABLE / ALTER TABLE 脚本并初始化数据库表。",
      "在中间输入框中编写 INSERT INTO / UPDATE 初始化数据，并按需单独清除数据。",
      "在最下方输入框执行查询或变更语句，并在结果区查看当前数据库状态。"
    ],
    examples: ["先建表，再多次初始化和清除测试数据，最后连续执行查询。", "验证外键关系、样例数据和 UPDATE 后的数据库状态。"]
  },
  "study-plan-scheduler": {
    name: "学习计划排期器",
    description: "根据主题、预计时长、优先级和每日可用时间生成学习排期与复习清单。",
    intro: "输入学习主题和时间安排，自动生成合理的学习计划和复习周期。",
    steps: [
      "添加学习主题和预计时长。",
      "设置每日可用时间和优先级。",
      "查看生成的学习排期和复习计划。"
    ],
    examples: ["为考试制定 30 天冲刺学习计划。", "规划每周 10 小时的技能学习安排。"]
  },
  "svg-optimizer-viewbox-editor": {
    name: "SVG 优化与 ViewBox 编辑器",
    description: "清理 SVG 标记、重写 viewBox，并即时预览优化后的矢量资产。",
    intro: "粘贴 SVG 代码，清理冗余标记、调整 viewBox 并实时预览效果。",
    steps: [
      "粘贴 SVG 代码。",
      "查看优化建议和 viewBox 参数。",
      "应用优化并复制清理后的 SVG。"
    ],
    examples: ["压缩从设计工具导出的 SVG 文件。", "调整 SVG 的 viewBox 适配不同容器。"]
  },
  "systemd-unit-analyzer": {
    name: "systemd Unit 分析器",
    description: "解析 systemd service/unit 文件，检查重启策略、运行用户、依赖关系和常见安全加固项。",
    intro: "粘贴 systemd unit 文件，分析服务配置、重启策略和安全加固项。",
    steps: [
      "粘贴 systemd service 或 unit 文件。",
      "查看重启策略、运行用户和依赖关系。",
      "检查安全加固建议和风险项。"
    ],
    examples: ["检查服务是否以 root 用户运行。", "审计服务配置中的安全加固缺失。"]
  },
  "tailwind-class-lab": {
    name: "Tailwind Class 实验室",
    description: "整理 Tailwind class 顺序，预览常见 utility 的视觉结果并标记重复分组。",
    intro: "输入 Tailwind CSS 类名，查看排序后的结果和视觉效果预览。",
    steps: [
      "输入 Tailwind 类名字符串。",
      "查看按类别排序后的 class 列表。",
      "预览常见 utility 的视觉效果。"
    ],
    examples: ["整理杂乱的 Tailwind 类名顺序。", "检查是否存在冲突或重复的 utility 类。"]
  },
  "transform-generator": {
    name: "CSS Transform 生成器",
    description: "可视化编辑 translate、rotate、scale、skew 变换，生成 CSS transform 代码。",
    intro: "通过参数控件调整元素的平移、旋转、缩放和倾斜变换，实时预览变换效果。",
    steps: [
      "调整平移 X/Y、旋转角度、缩放比例和倾斜角度等参数。",
      "在预览区域实时查看变换后的效果。",
      "确认效果后复制生成的 CSS transform 代码。"
    ],
    examples: ["创建一个水平平移并旋转 45 度的效果。", "制作一个鼠标悬浮放大效果所需的 transform 代码。"]
  },
  "task-priority-matrix": {
    name: "任务优先级矩阵",
    description: "用影响、紧急度、信心和工作量给任务打分，生成排序、象限和可复制执行清单。",
    intro: "输入任务清单，从多个维度打分并生成优先级排序和执行清单。",
    steps: [
      "添加任务名称和描述。",
      "对每个任务评估影响、紧急度、信心和工作量。",
      "查看优先级排序和象限分布。"
    ],
    examples: ["为 Sprint 计划进行任务优先级排序。", "评估项目任务的影响 vs 紧急度四象限。"]
  },
  "terraform-plan-formatter": {
    name: "Terraform Plan 格式化器",
    description: "整理 Terraform plan 输出，汇总 create/update/delete/replace 操作。",
    intro: "粘贴 terraform plan 输出，格式化展示资源变更汇总和详情。",
    steps: [
      "粘贴 terraform plan 输出内容。",
      "查看 create/update/delete/replace 汇总。",
      "检查具体资源变更详情。"
    ],
    examples: ["Code Review 时格式化 Terraform plan 输出。", "统计基础设施变更的影响面。"]
  },

  "text-inspector": {
    name: "文本检查器",
    description: "在 Worker 中分析大文本，并把报告缓存到 OPFS。",
    intro: "粘贴文本内容，快速查看字符数、单词数、行数、段落数等统计信息。",
    steps: [
      "粘贴需要分析的文本。",
      "查看字数、行数、段落数和词频统计。",
      "分析文本的可读性指标。"
    ],
    examples: ["分析文章的字数和可读性。", "统计文本中的高频词汇。"]
  },
  "threat-model-canvas": {
    name: "威胁建模画布",
    description: "整理资产、入口、信任边界、STRIDE 威胁和缓解措施。",
    intro: "按 STRIDE 框架建模系统威胁，识别资产、入口点和缓解措施。",
    steps: [
      "填写系统资产和入口点。",
      "定义信任边界并分析 STRIDE 威胁。",
      "记录缓解措施和状态。"
    ],
    examples: ["为 Web 应用进行 STRIDE 威胁建模。", "评估微服务架构的信任边界风险。"]
  },
  "typescript-playground": {
    name: "TypeScript Playground",
    description: "在浏览器中编译并运行 TypeScript 代码，支持现代语法、async/await 和 console 输出。",
    intro: "在浏览器中直接编写和运行 TypeScript 代码，查看编译后的 JS 和执行结果。",
    steps: [
      "在编辑器中编写 TypeScript 代码。",
      "点击运行，自动编译为 JavaScript 并执行。",
      "查看编译输出和执行结果。"
    ],
    examples: ["验证 TypeScript 类型推断结果。", "测试最新的 TypeScript 语法特性。"]
  },

  "unit-converter": {
    name: "单位换算器",
    description: "换算长度、重量、数据大小和温度等常用单位。",
    intro: "在长度、重量、体积、温度和数据存储等常用单位之间快速换算。",
    steps: [
      "选择单位类别（长度、重量、温度等）。",
      "输入数值并选择源单位和目标单位。",
      "查看换算结果。"
    ],
    examples: ["把 5 英里换算为公里。", "将 32GB 换算为 MB。"]
  },
  "url-safety-checker": {
    name: "URL 安全检查器",
    description: "解析 URL 并标记不安全协议、混淆、凭据、私网地址和可疑结构。",
    intro: "输入 URL，自动分析安全风险，包括协议、主机、路径和凭据。",
    steps: [
      "粘贴需要检查的 URL。",
      "查看安全风险类型和等级。",
      "根据检查结果决定是否信任该链接。"
    ],
    examples: ["检查收到的链接是否包含可疑域名。", "分析 URL 中的混淆和重定向风险。"]
  },
  "wasm-binary-inspector": {
    name: "WASM 二进制检查器",
    description: "解析 WebAssembly 二进制模块的 section、import/export、大小结构，并用 WASM runtime 编译校验。",
    intro: "上传 .wasm 文件，解析模块结构，查看 section、导入导出和大小信息。",
    steps: [
      "上传 .wasm 文件或粘贴 hex 内容。",
      "查看模块的 section 列表和类型。",
      "分析导入导出函数和内存布局。"
    ],
    examples: ["检查 WASM 模块的导入函数和依赖。", "分析 WASM 文件的大小和各 section 占比。"]
  },
  "wasm-integer-math-lab": {
    name: "WASM 整数运算实验室",
    description: "实验整数运算的溢出、截断和位操作行为，可视化不同位宽下的计算结果。",
    intro: "选择不同位宽（u8/i32/i64 等）执行整数运算，观察溢出和截断效果。",
    steps: [
      "选择整型类型和位宽。",
      "输入运算表达式。",
      "查看实际计算结果和位表示。"
    ],
    examples: ["演示 u8 加法溢出如何回绕。", "对比 i32 和 u32 的右移行为差异。"]
  },
  "wav-audio-inspector": {
    name: "WAV 音频检测器",
    description: "解析 WAV 音频文件的头部信息，显示采样率、位深度、声道数、时长等元数据。",
    intro: "上传 WAV 文件，自动解析并显示音频文件的详细元数据信息。",
    steps: [
      "上传 WAV 音频文件。",
      "查看音频格式、采样率、位深度和声道数。",
      "检查文件大小和预估时长。"
    ],
    examples: ["检查 WAV 文件的采样率和位深度。", "验证音频文件格式是否满足要求。"]
  },
  "webgpu-capability-reporter": {
    name: "WebGPU 能力报告器",
    description: "查询浏览器 WebGPU adapter、features、limits 和 device 创建结果，便于定位图形/计算能力差异。",
    intro: "检测当前浏览器的 WebGPU 支持和硬件能力，查看 adapter 特性和限制。",
    steps: [
      "点击检测 WebGPU 支持。",
      "查看 Adapter 信息和功能支持列表。",
      "分析限制参数是否满足应用需求。"
    ],
    examples: ["诊断浏览器是否支持 WebGPU。", "对比不同设备的 WebGPU 能力差异。"]
  },
  "websocket-client": {
    name: "WebSocket 客户端",
    description: "连接 ws/wss 端点、发送消息并查看事件日志的 WebSocket 调试客户端。",
    intro: "连接 WebSocket 服务端，发送和接收消息，查看完整的通信日志。",
    steps: [
      "输入 WebSocket 服务端 URL。",
      "点击连接，发送测试消息。",
      "查看消息日志和连接状态变化。"
    ],
    examples: ["调试 WebSocket 实时通信服务。", "测试 WebSocket 重连和心跳机制。"]
  },
  "yaml-json-toml-converter": {
    name: "YAML / JSON / TOML / Properties 转换器",
    description: "在 JSON、轻量 YAML、轻量 TOML 和 Properties 配置片段之间互转。",
    intro: "在 JSON、YAML、TOML 和 Properties 配置格式之间相互转换，适合配置迁移和格式适配。",
    steps: [
      "粘贴源格式的配置内容。",
      "选择源格式和目标格式。",
      "复制转换后的配置内容。"
    ],
    examples: [
      "把 YAML 配置转换为 Properties 格式（支持树状到 dot 路径转换）。",
      "将 Java Properties 格式转换为 YAML 配置（支持 dot 路径展开）。"
    ]
  },
  "color-extractor": {
    name: "颜色提取器",
    description: "从图片中提取主色和配色方案，支持识别颜色占比和色值复制。",
    intro: "上传图片，自动提取其中的主色和配色方案，查看颜色占比并复制色值。",
    steps: [
      "上传或拖入包含颜色的图片。",
      "查看提取出的主色和配色方案及占比。",
      "点击色块复制 HEX 或 RGB 色值。"
    ],
    examples: ["从品牌 Logo 中提取主色与辅助色。", "从设计稿截图中提取配色方案。"]
  },
  "color-harmonies-generator": {
    name: "配色方案生成器",
    description: "基于一种颜色自动生成互补、邻近、三角、四方等配色方案。",
    intro: "输入一个主色调，自动计算并展示多种经典的配色方案，帮助设计师快速建立色彩体系。",
    steps: [
      "输入或选择主色调的 HEX 颜色值。",
      "浏览下方生成的多种配色方案。",
      "点击任意色块即可复制对应的 HEX 值。"
    ],
    examples: ["为品牌色 #6366f1 生成整套配色方案。", "从主色 #0ea5e9 提取邻近色和三角配色。"]
  },
  "css-color-picker": {
    name: "CSS 颜色拾取器",
    description: "从色板中取色或浏览 CSS 命名色、Flat UI、语义色、Tailwind 等常用色板；支持 HEX/RGB/HSL/RGBA/HSLA 多格式复制与搜索过滤。",
    intro: "可视化颜色选取工具，支持饱和度/明度面板、色相滑块和 HSL 精确微调；同时内置 4 套色板库（CSS 命名色、Flat UI、语义色、Tailwind），支持搜索过滤和一键复制。",
    steps: [
      "在「取色器」选项卡中，从色板拖拽选择颜色，或直接输入 HEX 值。",
      "使用 HSL 滑块微调，选择 RGBA/HSLA 格式时调节 Alpha 透明度。",
      "切换到「色板库」选项卡浏览 CSS 命名色、Flat UI、语义色或 Tailwind 色板。",
      "在 CSS 命名色标签页中可搜索过滤颜色名称或 HEX 值。",
      "点击颜色块按所选格式一键复制。"
    ],
    examples: ["从色板中选取品牌主色。", "在 CSS 命名色中搜索 'blue' 找到所有蓝色。", "从 Tailwind 色板中选取 Slate 系列中性色。"]
  },
  "color-blindness-simulator": {
    name: "色盲模拟器",
    description: "模拟不同色盲类型下的颜色显示效果，确保色彩无障碍设计。",
    intro: "输入一种颜色，查看它在红色盲、绿色盲、蓝色盲和全色盲下的视觉效果，检测色彩无障碍性。",
    steps: [
      "输入或选择要测试的 HEX 颜色值。",
      "查看各色盲类型下的模拟效果颜色。",
      "点击模拟结果右侧的「复制」按钮获取模拟后的 HEX 值。"
    ],
    examples: ["测试品牌色 #6366f1 在红色盲下的表现。", "检查 #22c55e 是否在各类色盲下都能辨识。"]
  },

};

const zhToolNameOverrides: Record<string, string> = {
  "access-log-parser": "访问日志解析器",
  "adr-generator": "ADR 生成器",
  "ai-brief-synthesizer": "AI 简报合成器",
  "ai-chat": "AI 聊天工作台",
  "ai-sandbox-lab": "AI 沙箱实验室",
  "ai-trust-analyzer": "AI Trust Analyzer",
  "animation-keyframes-generator": "动画关键帧生成器",
  "api-error-code-doc-generator": "API 错误码文档生成器",
  "api-rate-limit-calculator": "API 限流计算器",
  "archive-structure-viewer": "归档结构查看器",
  "physical-fitness-calculator": "体测分数计算器",
  "aspect-ratio-calculator": "宽高比计算器",
  "audio-tone-generator": "音频测试音生成器",
  "base64-studio": "Base64 工具",
  "basic-auth-generator": "Basic Auth 生成器",
  "batch-file-hash-calculator": "批量文件哈希计算器",
  "border-radius-generator": "圆角生成器",
  "box-shadow-generator": "CSS 效果工作台",
  "brick-breaker": "霓虹打砖块",
  "browser-sandbox-console": "浏览器沙箱控制台",
  "case-converter": "命名风格转换器",
  "changelog-generator": "Changelog 生成器",
  "chmod-calculator": "Chmod 计算器",
  "color-blindness-simulator": "色盲模拟器",
  "color-contrast-checker": "色彩对比度检查器",
  "color-converter": "颜色格式转换器",
  "color-extractor": "颜色提取器",
  "color-harmonies-generator": "配色方案生成器",
  "color-palette-generator": "色阶生成器",
  "conventional-commit-helper": "Conventional Commit 助手",
  "cookie-parser": "Cookie 解析器",
  "cors-diagnostics": "CORS 诊断工具",
  "cron-helper": "Cron 表达式助手",
  "csp-generator": "CSP 生成器",
  "css-color-picker": "CSS 颜色拾取器",
  "css-grid-generator": "CSS Grid 生成器",
  "css-specificity-calculator": "CSS 权重计算器",
  "csv-cleaner": "CSV 清洗器",
  "csv-json-ndjson-converter": "CSV / JSON / NDJSON 转换器",
  "csv-profile-worker": "CSV 数据画像工具",
  "curl-builder": "cURL 生成器",
  "cvss-calculator": "CVSS 计算器",
  "data-url-generator": "Data URL 生成器",
  "db-connection-string-workbench": "数据库连接串工作台",
  "decision-wheel": "随机决策转盘",
  "random-picker": "随机抽取工具",
  "dice-roller": "3D 摇色子与骰子游戏",
  "dependency-risk-explainer": "依赖风险解释器",
  "discount-stack-calculator": "叠加优惠计算器",
  "dns-inspector": "DNS 检查器",
  "docker-compose-validator": "Docker Compose 校验器",
  "docker-run-to-compose": "Docker Run 转 Compose",
  "dockerfile-linter": "Dockerfile 检查器",
  "documentation-toc-anchor-generator": "文档目录锚点生成器",
  "easing-cubic-bezier-debugger": "Easing / Cubic Bezier 调试器",
  "ecommerce-margin-calculator": "电商利润计算器",
  "email-template-sandbox-preview": "邮件模板沙箱预览",
  "env-diff-merge-sanitizer": ".env 对比合并脱敏工具",
  "env-parser": "环境变量解析器",
  "exif-metadata-tool": "EXIF 元数据工具",
  "favicon-app-icon-generator": "Favicon / App Icon 生成器",
  "ffmpeg-editor": "FFmpeg 命令编辑器",
  "file-manifest-generator": "文件清单生成器",
  "file-name-batch-renamer": "批量文件名重命名器",
  "flashcard-cloze-builder": "闪卡填空题生成器",
  "flexbox-generator": "Flexbox 生成器",
  "font-scale-generator": "字号比例生成器",
  "game-2048": "2048 游戏",
  "gobang-game": "五子棋大师",
  "git-bisect-planner": "Git Bisect 规划器",
  "git-patch-security-reviewer": "Git Patch 安全审查器",
  "gitignore-generator": ".gitignore 生成器",
  "grade-weight-calculator": "成绩权重计算器",
  "gradient-generator": "渐变主题 Token 生成器",
  "grafana-dashboard-formatter": "Grafana Dashboard 格式化器",
  "graphql-workbench": "GraphQL 工作台",
  "har-viewer": "HAR 查看器",
  "hash-generator": "哈希生成器",
  "helm-values-diff": "Helm Values 差异对比",
  "html-css-js-playground": "HTML / CSS / JS Playground",
  "html-entity-codec": "HTML 实体编解码",
  "http-header-parser": "HTTP 头解析器",
  "http-security-headers-checker": "HTTP 安全头检查器",
  "http-status-reference": "HTTP 状态码参考",
  "image-compressor": "图片压缩器",
  "image-ocr-preprocessor": "图片 OCR 预处理器",
  "incident-timeline-generator": "事件时间线生成器",
  "ipv4-cidr-calculator": "IPv4 CIDR 计算器",
  "json-formatter": "JSON 格式化器",
  "json-schema-studio": "JSON Schema 工作台",
  "json-to-ts": "JSON 转 TypeScript",
  "jwt-decoder": "JWT 解码器",
  "jwt-jwk-verifier": "JWT / JWK 验证器",
  "kubernetes-probe-builder": "Kubernetes Probe 生成器",
  "kubernetes-yaml-validator": "Kubernetes YAML 校验器",
  "large-text-tools": "大文本处理工具",
  "license-compatibility-checker": "许可证兼容性检查器",
  "line-tools": "行处理工具",
  "link-collection-curator": "链接收藏整理器",
  "live-event-countdown": "活动倒计时器",
  "log-file-analyzer": "日志文件分析器",
  "lorem-ipsum-generator": "占位文本生成器",
  "markdown-linter": "Markdown 检查器",
  "markdown-preview": "Markdown 预览器",
  "markdown-table-generator": "Markdown 表格生成器",
  "media-device-permission-lab": "媒体设备权限实验室",
  "memory-match": "记忆翻牌",
  "mermaid-preview-formatter": "Mermaid 预览格式化器",
  "meta-tags-seo-preview": "Meta Tags SEO 预览器",
  "mime-type-lookup": "MIME 类型查询",
  "minesweeper": "经典扫雷",
  "cyber-flyer": "太空飞梭",
  "cyber-synth-matrix": "赛博音序器",
  "neon-snake": "霓虹贪吃蛇",
  "neon-tetris": "霓虹方块",
  "mock-data-generator": "Mock 数据生成器",
  "notification-payload-tester": "通知 Payload 测试器",
  "number-base-converter": "进制转换器",
  "oauth-oidc-debugger": "OAuth / OIDC 调试器",
  "openapi-workbench": "OpenAPI 工作台",
  "opentelemetry-trace-viewer": "OpenTelemetry Trace 查看器",
  "parquet-arrow-preview": "Parquet / Arrow 预览器",
  "password-generator": "密码生成器",
  "pdf-metadata-tool": "PDF 元数据工具",
  "pdf-tools": "PDF 工具",
  "pem-jwk-toolkit": "PEM / JWK / CSR 工具箱",
  "percentage-calculator": "百分比计算器",
  "pii-detector": "PII 检测器",
  "pomodoro-focus-timer": "番茄专注计时器",
  "port-reference": "端口服务速查",
  "privacy-cookie-copy-generator": "隐私 / Cookie 文案生成器",
  "prometheus-query-helper": "Prometheus 查询助手",
  "python-playground": "Python Playground",
  "qr-barcode-tool": "二维码 / 条形码工具",
  "query-param-builder": "查询参数构建器",
  "random-team-generator": "随机分队生成器",
  "readme-badge-generator": "README Badge 生成器",
  "readme-quality-checker": "README 质量检查器",
  "regex-batch-extractor": "正则批量提取器",
  "regex-tester": "正则表达式测试器",
  "release-notes-builder": "发布说明生成器",
  "resource-unit-converter": "资源单位换算器",
  "reverse-proxy-header-analyzer": "反向代理头分析器",
  "reversi": "黑白棋",
  "robots-txt-generator": "robots.txt 生成器",
  "ruby-playground": "Ruby Playground",
  "sbom-viewer": "SBOM 查看器",
  "scientific-calculator": "科学计算器",
  "secrets-scanner": "密钥扫描器",
  "semgrep-rule-playground": "Semgrep 规则 Playground",
  "sitemap-xml-generator": "Sitemap XML 生成器",
  "sku-generator": "SKU 生成器",
  "slo-error-budget-calculator": "SLO 错误预算计算器",
  "slug-generator": "Slug 生成器",
  "social-caption-hashtag-formatter": "社媒文案与话题标签格式化器",
  "social-post-scheduler": "社媒发布排期器",
  "source-map-explorer": "Source Map 分析器",
  "spaced-repetition-planner": "间隔重复学习计划器",
  "sql-explain-visualizer": "SQL 执行步骤可视化器",
  "sql-formatter": "SQL 格式化器",
  "sql-index-advisor": "SQL 索引顾问",
  "sql-playground": "SQL Playground",
  "study-plan-scheduler": "学习计划排期器",
  "sudoku-game": "数独大师",
  "svg-optimizer-viewbox-editor": "SVG 优化与 ViewBox 编辑器",
  "systemd-unit-analyzer": "systemd Unit 分析器",
  "tailwind-class-lab": "Tailwind Class 实验室",
  "task-priority-matrix": "任务优先级矩阵",
  "terraform-plan-formatter": "Terraform Plan 格式化器",
  "text-diff": "文本差异对比",
  "text-inspector": "文本检查器",
  "threat-model-canvas": "威胁建模画布",
  "timestamp-converter": "时间戳转换器",
  "tls-certificate-parser": "TLS 证书解析器",
  "transform-generator": "CSS Transform 生成器",
  "typescript-playground": "TypeScript Playground",
  "unicode-inspector": "Unicode 检查器",
  "unit-converter": "单位换算器",
  "url-codec": "URL 编解码",
  "url-safety-checker": "URL 安全检查器",
  "user-agent-parser": "User-Agent 解析器",
  "utm-builder": "UTM 构建器",
  "uuid-generator": "UUID 生成器",
  "wasm-binary-inspector": "WASM 二进制检查器",
  "wasm-integer-math-lab": "WASM 整数运算实验室",
  "wav-audio-inspector": "WAV 音频检测器",
  "webgpu-capability-reporter": "WebGPU 能力报告器",
  "webhook-signature-verifier": "Webhook 签名验证器",
  "websocket-client": "WebSocket 客户端",
  "yaml-json-toml-converter": "YAML / JSON / TOML / Properties 转换器",
  "morse-code": "摩尔斯电码转换器",
  "ascii-art": "ASCII 艺术字生成器",
  "code-to-image": "代码美化图片生成器",
  "markdown-html-converter": "Markdown HTML 互转工具",
  "image-watermark": "图片防盗水印生成器",
  "code-beautifier": "代码美化与压缩工具",
  "json-to-go": "JSON 转 Go Struct 工具",
  "htaccess-to-nginx": "htaccess 转 Nginx 规则工具",
  "unicode-converter": "Unicode 编码转换器",
  "sql-to-go": "SQL 转 Go Struct 工具",
  "chinese-converter": "中文简繁体转换",
  "loan-calculator": "房贷与贷款计算器",
  "text-encoding-converter": "文字编码转换与乱码修复",
  "placeholder-generator": "占位图片生成器",
  "image-splitter": "图片九宫格切图工具"
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

function buildZhFallbackGuide(manifest: ToolManifest): ToolPageGuide {
  const name = zhToolNameOverrides[manifest.id] ?? manifest.name;
  const description = manifest.description;

  return {
    name,
    description,
    intro: `${description.replace(/。$/, "")}。适合在浏览器里快速完成输入、预览、检查和复制结果。`,
    steps: [
      "按页面字段输入、粘贴或导入需要处理的内容。",
      "根据场景调整参数，查看实时预览、统计、提示或生成结果。",
      "复制、导出或记录结果，并在真实环境中复核关键配置。"
    ],
    examples: [`使用${name}处理一次日常工作流。`, "把生成结果复制到文档、工单、配置或测试数据中继续使用。"]
  };
}

export function getToolPageGuide(manifest: ToolManifest, locale: string) {
  if (!isZhLocale(locale)) {
    return null;
  }

  return zhToolPageGuides[manifest.id] ?? buildZhFallbackGuide(manifest);
}

export function getToolPageManifest(manifest: ToolManifest, locale: string): ToolManifest {
  const guide = getToolPageGuide(manifest, locale);

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
