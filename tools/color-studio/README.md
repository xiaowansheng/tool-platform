# @tool-platform/color-studio

Color Studio 是一个一站式色彩工坊工具包。它整合了以下 9 个零散的色彩工具：

1. **取色与色板 (Color Picker & Preset Palettes)** (`css-color-picker`)
2. **格式转换 (Color Converter)** (`color-converter`)
3. **色阶生成 (Color Palette Generator)** (`color-palette-generator`)
4. **配色方案 (Color Harmonies)** (`color-harmonies-generator`)
5. **提取颜色 (Image Color Extractor)** (`color-extractor`)
6. **对比度无障碍校验 (WCAG Contrast Checker)** (`color-contrast-checker`)
7. **色盲模拟 (Color Blindness Simulator)** (`color-blindness-simulator`)
8. **渐变设计器与主题 Token 生成器 (CSS Gradient & Token Generator)** (`css-gradient-generator`, `gradient-generator`)

## 共享状态设计
所有选项卡（Tabs）都订阅并同步共享的 `activeColor` 状态。这意味着你在取色器里选中的任意颜色，切换到对比度、配色方案或色阶选项卡时，都会自动加载并处理，大大提升了工作流效率。
