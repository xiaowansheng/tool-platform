# @tool-platform/image-studio

Image Studio 是一个一站式图片处理工坊。它整合了以下 9 个零散的图片工具：

1. **信息与参数 (Image Specifications Viewer)** (`image-spec-viewer`)
2. **裁剪旋转 (Image Cropper)** (`image-cropper`)
3. **添加水印 (Image Watermark)** (`image-watermark`)
4. **大小压缩 (Image Compressor)** (`image-compressor`)
5. **格式转换 (Image Format Converter)** (`image-format-converter`)
6. **清除元数据 (EXIF Metadata Cleaner)** (`exif-metadata-tool`)
7. **网格切图 (Image Splitter)** (`image-splitter`)
8. **长图拼接 (Image Stitcher)** (`image-stitcher`)
9. **GIF 拆帧 (GIF Frame Splitter)** (`gif-splitter`)

## 共享状态设计
所有选项卡（Tabs）都订阅并同步共享的 `activeFile` 状态。这意味着你在任何选项卡中上传的图片，在切换到裁剪、水印、压缩、格式转换或网格切图等选项卡时，都会自动加载并处理，无需反复上传与下载，极大优化了图片编辑处理的连贯性。
