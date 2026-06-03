# Color Extractor

从图片中提取主色和配色方案。

## 功能

- 上传 PNG / JPEG / WebP / GIF 图片
- 自动提取最多 12 种主色
- 显示 HEX、RGB 值和颜色占比
- 点击色块复制 HEX 值

## 技术实现

使用 Canvas `getImageData` 读取像素数据，通过颜色量化算法将相近颜色归并为色桶，按出现频率排序输出主色。
所有处理均在浏览器本地完成，不上传图片。
