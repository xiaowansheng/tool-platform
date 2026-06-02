"use client";

import { useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface MetadataItem {
  group: string;
  tag: string;
  value: string;
}

interface ImageReport {
  name: string;
  type: string;
  size: number;
  metadata: MetadataItem[];
  cleaned?: Blob;
}

const tagNames: Record<number, string> = {
  0x010f: "Make",
  0x0110: "Model",
  0x0112: "Orientation",
  0x0131: "Software",
  0x0132: "DateTime",
  0x013b: "Artist",
  0x8298: "Copyright",
  0x8769: "ExifIFDPointer",
  0x8825: "GPSInfoIFDPointer",
  0x9003: "DateTimeOriginal",
  0x9004: "DateTimeDigitized",
  0xa002: "PixelXDimension",
  0xa003: "PixelYDimension",
  0xa434: "LensModel"
};

const typeSizes: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 4,
  5: 8,
  7: 1,
  9: 4,
  10: 8
};

const decoder = new TextDecoder();

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return Array.from(bytes.slice(start, start + length), (byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".").join("");
}

function readTiffValue(view: DataView, littleEndian: boolean, type: number, count: number, entryOffset: number, tiffLength: number) {
  const size = (typeSizes[type] ?? 1) * count;
  const valueOffset = size <= 4 ? entryOffset + 8 : view.getUint32(entryOffset + 8, littleEndian);

  if (valueOffset < 0 || valueOffset + size > tiffLength) {
    return "out-of-range";
  }

  if (type === 2) {
    const bytes = new Uint8Array(view.buffer, view.byteOffset + valueOffset, size);
    return decoder.decode(bytes).replace(/\0+$/g, "");
  }

  const values: string[] = [];

  for (let index = 0; index < Math.min(count, 8); index += 1) {
    const offset = valueOffset + index * (typeSizes[type] ?? 1);

    if (type === 3) values.push(String(view.getUint16(offset, littleEndian)));
    else if (type === 4) values.push(String(view.getUint32(offset, littleEndian)));
    else if (type === 5) values.push(`${view.getUint32(offset, littleEndian)}/${view.getUint32(offset + 4, littleEndian)}`);
    else if (type === 9) values.push(String(view.getInt32(offset, littleEndian)));
    else if (type === 10) values.push(`${view.getInt32(offset, littleEndian)}/${view.getInt32(offset + 4, littleEndian)}`);
    else values.push(String(view.getUint8(offset)));
  }

  return values.join(", ");
}

function parseTiff(tiff: Uint8Array) {
  const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
  const endian = ascii(tiff, 0, 2);
  const littleEndian = endian === "II";
  const items: MetadataItem[] = [];
  const seen = new Set<number>();

  if (endian !== "II" && endian !== "MM") {
    return items;
  }

  function parseIfd(offset: number, group: string) {
    if (seen.has(offset) || offset <= 0 || offset + 2 > tiff.byteLength) {
      return;
    }

    seen.add(offset);
    const count = view.getUint16(offset, littleEndian);

    for (let index = 0; index < count; index += 1) {
      const entryOffset = offset + 2 + index * 12;

      if (entryOffset + 12 > tiff.byteLength) {
        break;
      }

      const tag = view.getUint16(entryOffset, littleEndian);
      const type = view.getUint16(entryOffset + 2, littleEndian);
      const valueCount = view.getUint32(entryOffset + 4, littleEndian);
      const name = tagNames[tag] ?? `0x${tag.toString(16).padStart(4, "0")}`;
      const value = readTiffValue(view, littleEndian, type, valueCount, entryOffset, tiff.byteLength);

      items.push({ group, tag: name, value });

      if ((tag === 0x8769 || tag === 0x8825) && value !== "out-of-range") {
        const childOffset = view.getUint32(entryOffset + 8, littleEndian);
        parseIfd(childOffset, tag === 0x8825 ? "GPS" : "EXIF");
      }
    }
  }

  parseIfd(view.getUint32(4, littleEndian), "IFD0");
  return items;
}

function parseJpeg(bytes: Uint8Array) {
  const metadata: MetadataItem[] = [];

  for (let offset = 2; offset + 4 < bytes.length;) {
    if (bytes[offset] !== 0xff) break;

    const marker = bytes[offset + 1];

    if (marker === 0xda || marker === 0xd9) break;

    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    const segmentStart = offset + 4;
    const segmentEnd = offset + 2 + length;

    if (marker === 0xe1 && ascii(bytes, segmentStart, 6) === "Exif..") {
      metadata.push(...parseTiff(bytes.slice(segmentStart + 6, segmentEnd)));
    }

    offset = segmentEnd;
  }

  return metadata;
}

function parsePng(bytes: Uint8Array) {
  const metadata: MetadataItem[] = [];

  for (let offset = 8; offset + 12 <= bytes.length;) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    const length = view.getUint32(0, false);
    const type = ascii(bytes, offset + 4, 4);
    const dataStart = offset + 8;

    if (["tEXt", "iTXt", "zTXt", "tIME", "eXIf"].includes(type)) {
      metadata.push({
        group: "PNG",
        tag: type,
        value: type === "eXIf" ? `${length} bytes` : decoder.decode(bytes.slice(dataStart, dataStart + Math.min(length, 160))).replace(/\0/g, " ")
      });
    }

    offset += 12 + length;
  }

  return metadata;
}

function blobPartsFromChunks(chunks: Uint8Array[]): BlobPart[] {
  return chunks.map((chunk) => {
    const copy = new Uint8Array(chunk.byteLength);
    copy.set(chunk);

    return copy.buffer;
  });
}

function removeJpegExif(bytes: Uint8Array) {
  const chunks: Uint8Array[] = [bytes.slice(0, 2)];
  let offset = 2;

  for (; offset + 4 < bytes.length;) {
    if (bytes[offset] !== 0xff) break;

    const marker = bytes[offset + 1];

    if (marker === 0xda || marker === 0xd9) {
      break;
    }

    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    const end = offset + 2 + length;
    const isExif = marker === 0xe1 && ascii(bytes, offset + 4, 6) === "Exif..";

    if (!isExif) {
      chunks.push(bytes.slice(offset, end));
    }

    offset = end;
  }

  chunks.push(bytes.slice(offset));
  return new Blob(blobPartsFromChunks(chunks), { type: "image/jpeg" });
}

function removePngMetadata(bytes: Uint8Array) {
  const chunks: Uint8Array[] = [bytes.slice(0, 8)];

  for (let offset = 8; offset + 12 <= bytes.length;) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    const length = view.getUint32(0, false);
    const type = ascii(bytes, offset + 4, 4);
    const end = offset + 12 + length;

    if (!["tEXt", "iTXt", "zTXt", "tIME", "eXIf"].includes(type)) {
      chunks.push(bytes.slice(offset, end));
    }

    offset = end;
  }

  return new Blob(blobPartsFromChunks(chunks), { type: "image/png" });
}

function inspectImage(file: File, buffer: ArrayBuffer): ImageReport {
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return {
      name: file.name,
      type: "JPEG",
      size: file.size,
      metadata: parseJpeg(bytes),
      cleaned: removeJpegExif(bytes)
    };
  }

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return {
      name: file.name,
      type: "PNG",
      size: file.size,
      metadata: parsePng(bytes),
      cleaned: removePngMetadata(bytes)
    };
  }

  throw new Error("仅支持 JPEG 和 PNG 元数据解析");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ExifMetadataTool({ manifest }: ToolAppProps) {
  const [report, setReport] = useState<ImageReport | null>(null);
  const [error, setError] = useState("");

  async function loadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    try {
      setReport(inspectImage(file, await file.arrayBuffer()));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "图片读取失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">图像隐私</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>图片文件</span>
          <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(event) => void loadFile(event)} />
        </label>
        <button type="button" disabled={!report?.cleaned} onClick={() => report?.cleaned ? downloadBlob(report.cleaned, `clean-${report.name}`) : undefined}>
          下载清理版本
        </button>
      </div>
      {report ? (
        <>
          <div className="detail-grid">
            <article className="detail-card">
              <h3>格式</h3>
              <p>{report.type}</p>
            </article>
            <article className="detail-card">
              <h3>大小</h3>
              <p>{formatBytes(report.size)}</p>
            </article>
            <article className="detail-card">
              <h3>元数据项</h3>
              <p>{report.metadata.length}</p>
            </article>
          </div>
          <div className="tool-table">
            <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "7rem 12rem minmax(12rem, 1fr)" }}>
              <span>分组</span>
              <span>标签</span>
              <span>值</span>
            </div>
            {report.metadata.length > 0 ? report.metadata.map((item, index) => (
              <div key={`${item.group}-${item.tag}-${index}`} className="tool-table__row" style={{ gridTemplateColumns: "7rem 12rem minmax(12rem, 1fr)" }}>
                <span>{item.group}</span>
                <span>{item.tag}</span>
                <span>{item.value || "空"}</span>
              </div>
            )) : (
              <div className="tool-table__row" style={{ gridTemplateColumns: "1fr" }}>
                <span>未发现可展示元数据</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <strong>等待图片</strong>
          <p>选择 JPEG 或 PNG 后显示可识别的元数据项。</p>
        </div>
      )}
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
