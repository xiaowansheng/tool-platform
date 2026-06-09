"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface ExifEntry {
  tag: string;
  value: string;
}

const tagNames: Record<number, string> = {
  0x010f: "Make",
  0x0110: "Model",
  0x0112: "Orientation",
  0x0131: "Software",
  0x0132: "DateTime",
  0x829a: "ExposureTime",
  0x829d: "FNumber",
  0x8827: "ISO",
  0x9003: "DateTimeOriginal",
  0x9209: "Flash",
  0x920a: "FocalLength",
  0xa002: "PixelXDimension",
  0xa003: "PixelYDimension",
  0x0001: "GPSLatitudeRef",
  0x0002: "GPSLatitude",
  0x0003: "GPSLongitudeRef",
  0x0004: "GPSLongitude"
};

const typeSize: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

function readAscii(view: DataView, offset: number, length: number) {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    const code = view.getUint8(offset + index);
    if (code === 0) break;
    value += String.fromCharCode(code);
  }
  return value;
}

function readNumber(view: DataView, offset: number, type: number, little: boolean) {
  if (type === 3) return view.getUint16(offset, little);
  if (type === 4) return view.getUint32(offset, little);
  if (type === 9) return view.getInt32(offset, little);
  return view.getUint8(offset);
}

function readValue(view: DataView, tiffStart: number, entryOffset: number, little: boolean) {
  const type = view.getUint16(entryOffset + 2, little);
  const count = view.getUint32(entryOffset + 4, little);
  const bytes = (typeSize[type] ?? 1) * count;
  const valueOffset = bytes <= 4 ? entryOffset + 8 : tiffStart + view.getUint32(entryOffset + 8, little);
  if (valueOffset < 0 || valueOffset + bytes > view.byteLength) return "";
  if (type === 2) return readAscii(view, valueOffset, count);
  if (type === 5 || type === 10) {
    const values: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const numerator = type === 10 ? view.getInt32(valueOffset + index * 8, little) : view.getUint32(valueOffset + index * 8, little);
      const denominator = view.getUint32(valueOffset + index * 8 + 4, little);
      values.push(denominator ? (numerator / denominator).toFixed(4).replace(/\.?0+$/, "") : String(numerator));
    }
    return values.join(", ");
  }
  const values: string[] = [];
  for (let index = 0; index < Math.min(count, 8); index += 1) values.push(String(readNumber(view, valueOffset + index * (typeSize[type] ?? 1), type, little)));
  return values.join(", ");
}

function parseIfd(view: DataView, tiffStart: number, ifdOffset: number, little: boolean, entries: ExifEntry[], visited = new Set<number>()) {
  const absoluteOffset = tiffStart + ifdOffset;
  if (visited.has(absoluteOffset) || absoluteOffset + 2 > view.byteLength) return;
  visited.add(absoluteOffset);
  const count = view.getUint16(absoluteOffset, little);
  for (let index = 0; index < count; index += 1) {
    const entryOffset = absoluteOffset + 2 + index * 12;
    if (entryOffset + 12 > view.byteLength) break;
    const tag = view.getUint16(entryOffset, little);
    const value = readValue(view, tiffStart, entryOffset, little);
    const name = tagNames[tag] ?? "Tag 0x" + tag.toString(16).padStart(4, "0");
    if (tag === 0x8769 || tag === 0x8825) {
      const nestedOffset = Number(value.split(",")[0]);
      if (Number.isFinite(nestedOffset)) parseIfd(view, tiffStart, nestedOffset, little, entries, visited);
    } else if (value) entries.push({ tag: name, value });
  }
}

function parseExif(buffer: ArrayBuffer): ExifEntry[] {
  const view = new DataView(buffer);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return [];
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    const length = view.getUint16(offset + 2);
    if (marker === 0xe1 && readAscii(view, offset + 4, 6) === "Exif") {
      const tiffStart = offset + 10;
      const little = readAscii(view, tiffStart, 2) === "II";
      const firstIfd = view.getUint32(tiffStart + 4, little);
      const entries: ExifEntry[] = [];
      parseIfd(view, tiffStart, firstIfd, little, entries);
      return entries;
    }
    offset += 2 + length;
  }
  return [];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return String(bytes) + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

export default function ExifDataViewerTool({ manifest }: ToolAppProps) {
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [entries, setEntries] = useState<ExifEntry[]>([]);
  const [error, setError] = useState("");
  const uniqueEntries = useMemo(() => entries.filter((entry, index, all) => all.findIndex((item) => item.tag === entry.tag && item.value === entry.value) === index), [entries]);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    setError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const parsed = parseExif(await file.arrayBuffer());
      setEntries(parsed);
      if (!parsed.length) setError("No readable EXIF block found in this image.");
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Failed to parse EXIF data");
      setEntries([]);
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header"><div><p className="eyebrow">Image metadata</p><h2>{manifest.name}</h2></div><p>{manifest.description}</p></div>
      <div className="tool-toolbar"><label className="tool-field tool-field--compact"><span>Image file</span><input type="file" accept="image/jpeg,image/tiff,image/*" onChange={(event) => void handleFile(event)} /></label></div>
      <div className="workspace workspace--two-column"><div className="detail-card"><h3>{fileName || "Preview"}</h3>{previewUrl ? <img src={previewUrl} alt="" style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 8 }} /> : <p>No image selected</p>}</div><div className="detail-card"><h3>File summary</h3><p>{fileName || "No file"}</p><p>{fileSize ? formatBytes(fileSize) : "0 B"}</p><p>{uniqueEntries.length} EXIF fields</p></div></div>
      <div className="detail-grid">{uniqueEntries.map((entry) => <article className="detail-card" key={entry.tag + entry.value}><h3>{entry.tag}</h3><p style={{ wordBreak: "break-word" }}>{entry.value}</p></article>)}</div>
      {error ? <p className="tool-error">{error}</p> : null}
    </section>
  );
}
