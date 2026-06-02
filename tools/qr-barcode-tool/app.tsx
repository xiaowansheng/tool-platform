"use client";

import { useMemo, useState } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

type CodeMode = "qr" | "code128";

interface QrVersion {
  version: number;
  size: number;
  dataCodewords: number;
  eccCodewords: number;
}

interface DetectedBarcode {
  rawValue: string;
  format: string;
}

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
};

type BarcodeWindow = Window & {
  BarcodeDetector?: BarcodeDetectorConstructor;
};

const qrVersions: QrVersion[] = [
  { version: 1, size: 21, dataCodewords: 19, eccCodewords: 7 },
  { version: 2, size: 25, dataCodewords: 34, eccCodewords: 10 },
  { version: 3, size: 29, dataCodewords: 55, eccCodewords: 15 },
  { version: 4, size: 33, dataCodewords: 80, eccCodewords: 20 }
];

const code128Patterns = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

const gfExp: number[] = [];
const gfLog: number[] = [];

for (let value = 1, exponent = 0; exponent < 255; exponent += 1) {
  gfExp[exponent] = value;
  gfLog[value] = exponent;
  value <<= 1;

  if (value & 0x100) {
    value ^= 0x11d;
  }
}

for (let exponent = 255; exponent < 512; exponent += 1) {
  gfExp[exponent] = gfExp[exponent - 255];
}

function gfMultiply(left: number, right: number) {
  if (left === 0 || right === 0) {
    return 0;
  }

  return gfExp[gfLog[left] + gfLog[right]];
}

function reedSolomonDivisor(degree: number) {
  const result = Array.from({ length: degree }, () => 0);
  result[degree - 1] = 1;
  let root = 1;

  for (let index = 0; index < degree; index += 1) {
    for (let inner = 0; inner < degree; inner += 1) {
      result[inner] = gfMultiply(result[inner], root);

      if (inner + 1 < degree) {
        result[inner] ^= result[inner + 1];
      }
    }

    root = gfMultiply(root, 0x02);
  }

  return result;
}

function reedSolomonRemainder(data: number[], degree: number) {
  const divisor = reedSolomonDivisor(degree);
  const result = Array.from({ length: degree }, () => 0);

  for (const byte of data) {
    const factor = byte ^ result.shift()!;
    result.push(0);

    for (let index = 0; index < degree; index += 1) {
      result[index] ^= gfMultiply(divisor[index], factor);
    }
  }

  return result;
}

function appendBits(bits: number[], value: number, length: number) {
  for (let index = length - 1; index >= 0; index -= 1) {
    bits.push((value >>> index) & 1);
  }
}

function chooseQrVersion(byteLength: number) {
  return qrVersions.find((item) => 4 + 8 + byteLength * 8 <= item.dataCodewords * 8);
}

function encodeQrCodewords(text: string, version: QrVersion) {
  const data = Array.from(new TextEncoder().encode(text));
  const bits: number[] = [];
  const capacity = version.dataCodewords * 8;

  appendBits(bits, 0x4, 4);
  appendBits(bits, data.length, 8);

  for (const byte of data) {
    appendBits(bits, byte, 8);
  }

  appendBits(bits, 0, Math.min(4, capacity - bits.length));

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = [];

  for (let index = 0; index < bits.length; index += 8) {
    codewords.push(Number.parseInt(bits.slice(index, index + 8).join(""), 2));
  }

  for (let padIndex = 0; codewords.length < version.dataCodewords; padIndex += 1) {
    codewords.push(padIndex % 2 === 0 ? 0xec : 0x11);
  }

  return [...codewords, ...reedSolomonRemainder(codewords, version.eccCodewords)];
}

function maskBit(mask: number, x: number, y: number) {
  if (mask === 0) return (x + y) % 2 === 0;
  if (mask === 1) return y % 2 === 0;
  if (mask === 2) return x % 3 === 0;
  if (mask === 3) return (x + y) % 3 === 0;
  if (mask === 4) return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
  if (mask === 5) return ((x * y) % 2) + ((x * y) % 3) === 0;
  if (mask === 6) return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
  return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
}

function createMatrix(size: number): Array<Array<boolean | null>> {
  return Array.from({ length: size }, () => Array.from({ length: size }, (): boolean | null => null));
}

function createReserve(size: number): boolean[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => false));
}

function setFunctionModule(matrix: Array<Array<boolean | null>>, reserved: boolean[][], x: number, y: number, dark: boolean) {
  if (x >= 0 && y >= 0 && y < matrix.length && x < matrix.length) {
    matrix[y][x] = dark;
    reserved[y][x] = true;
  }
}

function drawFinder(matrix: Array<Array<boolean | null>>, reserved: boolean[][], x: number, y: number) {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      const dark = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      setFunctionModule(matrix, reserved, xx, yy, dark);
    }
  }
}

function reserveFormat(matrix: Array<Array<boolean | null>>, reserved: boolean[][]) {
  const size = matrix.length;

  for (let index = 0; index <= 8; index += 1) {
    if (index !== 6) {
      setFunctionModule(matrix, reserved, 8, index, false);
      setFunctionModule(matrix, reserved, index, 8, false);
    }
  }

  for (let index = 0; index < 8; index += 1) {
    setFunctionModule(matrix, reserved, size - 1 - index, 8, false);
    setFunctionModule(matrix, reserved, 8, size - 1 - index, false);
  }
}

function drawFunctionPatterns(matrix: Array<Array<boolean | null>>, reserved: boolean[][], version: QrVersion) {
  const size = version.size;

  drawFinder(matrix, reserved, 0, 0);
  drawFinder(matrix, reserved, size - 7, 0);
  drawFinder(matrix, reserved, 0, size - 7);

  for (let index = 8; index < size - 8; index += 1) {
    setFunctionModule(matrix, reserved, index, 6, index % 2 === 0);
    setFunctionModule(matrix, reserved, 6, index, index % 2 === 0);
  }

  setFunctionModule(matrix, reserved, 8, size - 8, true);
  reserveFormat(matrix, reserved);
}

function drawFormatBits(matrix: Array<Array<boolean | null>>, mask: number) {
  const size = matrix.length;
  const data = (1 << 3) | mask;
  let remainder = data;

  for (let index = 0; index < 10; index += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
  }

  const bits = ((data << 10) | remainder) ^ 0x5412;
  const bit = (index: number) => ((bits >>> index) & 1) === 1;

  for (let index = 0; index <= 5; index += 1) matrix[index][8] = bit(index);
  matrix[7][8] = bit(6);
  matrix[8][8] = bit(7);
  matrix[8][7] = bit(8);
  for (let index = 9; index < 15; index += 1) matrix[8][14 - index] = bit(index);
  for (let index = 0; index < 8; index += 1) matrix[8][size - 1 - index] = bit(index);
  for (let index = 8; index < 15; index += 1) matrix[size - 15 + index][8] = bit(index);
  matrix[size - 8][8] = true;
}

function placeData(version: QrVersion, codewords: number[], mask: number) {
  const matrix = createMatrix(version.size);
  const reserved = createReserve(version.size);
  const bits = codewords.flatMap((byte) => Array.from({ length: 8 }, (_, index) => (byte >>> (7 - index)) & 1));
  let bitIndex = 0;
  let upward = true;

  drawFunctionPatterns(matrix, reserved, version);

  for (let right = version.size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right = 5;
    }

    for (let vertical = 0; vertical < version.size; vertical += 1) {
      const y = upward ? version.size - 1 - vertical : vertical;

      for (let column = 0; column < 2; column += 1) {
        const x = right - column;

        if (!reserved[y][x]) {
          const dataBit = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
          matrix[y][x] = dataBit !== maskBit(mask, x, y);
          bitIndex += 1;
        }
      }
    }

    upward = !upward;
  }

  drawFormatBits(matrix, mask);
  return matrix.map((row) => row.map((cell) => cell === true));
}

function penalty(matrix: boolean[][]) {
  const size = matrix.length;
  let score = 0;

  for (let y = 0; y < size; y += 1) {
    let runColor = matrix[y][0];
    let runLength = 1;

    for (let x = 1; x < size; x += 1) {
      if (matrix[y][x] === runColor) {
        runLength += 1;
      } else {
        if (runLength >= 5) score += 3 + runLength - 5;
        runColor = matrix[y][x];
        runLength = 1;
      }
    }

    if (runLength >= 5) score += 3 + runLength - 5;
  }

  for (let x = 0; x < size; x += 1) {
    let runColor = matrix[0][x];
    let runLength = 1;

    for (let y = 1; y < size; y += 1) {
      if (matrix[y][x] === runColor) {
        runLength += 1;
      } else {
        if (runLength >= 5) score += 3 + runLength - 5;
        runColor = matrix[y][x];
        runLength = 1;
      }
    }

    if (runLength >= 5) score += 3 + runLength - 5;
  }

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const color = matrix[y][x];
      if (matrix[y][x + 1] === color && matrix[y + 1][x] === color && matrix[y + 1][x + 1] === color) {
        score += 3;
      }
    }
  }

  const dark = matrix.flat().filter(Boolean).length;
  score += Math.floor(Math.abs((dark * 20) / (size * size) - 10)) * 10;
  return score;
}

function qrMatrix(text: string) {
  const bytes = new TextEncoder().encode(text);
  const version = chooseQrVersion(bytes.length);

  if (!version) {
    throw new Error("QR 输入过长，请缩短到约 78 字节以内");
  }

  const codewords = encodeQrCodewords(text, version);
  const candidates = Array.from({ length: 8 }, (_, mask) => placeData(version, codewords, mask));

  return candidates.sort((left, right) => penalty(left) - penalty(right))[0];
}

function renderQrSvg(text: string) {
  const matrix = qrMatrix(text);
  const quiet = 4;
  const size = matrix.length + quiet * 2;
  const path = matrix.flatMap((row, y) => row.map((dark, x) => dark ? `M${x + quiet},${y + quiet}h1v1h-1z` : "")).filter(Boolean).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#081018"/></svg>`;
}

function renderCode128Svg(text: string) {
  const codes = [104];

  for (const character of text) {
    const code = character.charCodeAt(0);

    if (code < 32 || code > 126) {
      throw new Error("Code 128 B 仅支持 ASCII 32-126");
    }

    codes.push(code - 32);
  }

  const checksum = codes.reduce((sum, code, index) => sum + (index === 0 ? code : code * index), 0) % 103;
  codes.push(checksum, 106);

  let x = 10;
  const bars: string[] = [];

  for (const code of codes) {
    const pattern = code128Patterns[code];

    for (let index = 0; index < pattern.length; index += 1) {
      const width = Number(pattern[index]);

      if (index % 2 === 0) {
        bars.push(`<rect x="${x}" y="10" width="${width}" height="72"/>`);
      }

      x += width;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + 10} 96" role="img"><rect width="${x + 10}" height="96" fill="#fff"/><g fill="#081018">${bars.join("")}</g></svg>`;
}

export default function QrBarcodeTool({ manifest }: ToolAppProps) {
  const [mode, setMode] = useState<CodeMode>("qr");
  const [value, setValue] = useState("https://tool-platform.local/tools/qr-barcode-tool");
  const [detected, setDetected] = useState<DetectedBarcode[]>([]);
  const [scanError, setScanError] = useState("");
  const generated = useMemo(() => {
    try {
      return {
        svg: mode === "qr" ? renderQrSvg(value) : renderCode128Svg(value),
        error: ""
      };
    } catch (error) {
      return {
        svg: "",
        error: error instanceof Error ? error.message : "编码失败"
      };
    }
  }, [mode, value]);

  const [copiedSvg, setCopiedSvg] = useState(false);

  async function copySvg() {
    await navigator.clipboard.writeText(generated.svg);
    setCopiedSvg(true);
  }

  async function detectImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    const Detector = (window as BarcodeWindow).BarcodeDetector;

    if (!file) {
      return;
    }

    if (!Detector) {
      setScanError("当前浏览器不支持 BarcodeDetector");
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const detector = new Detector({ formats: ["qr_code", "code_128", "ean_13", "ean_8", "upc_a", "upc_e"] });
      const results = await detector.detect(bitmap);
      bitmap.close();
      setDetected(results);
      setScanError("");
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "图片解析失败");
    }
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">码制工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <div className="tool-toolbar">
        <label className="tool-field tool-field--compact">
          <span>类型</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as CodeMode)}>
            <option value="qr">QR Code</option>
            <option value="code128">Code 128</option>
          </select>
        </label>
        <button type="button" disabled={!generated.svg} onClick={() => void copySvg()}>
          {copiedSvg ? "已复制" : "复制 SVG"}
        </button>
        <label className="tool-field tool-field--compact">
          <span>解析图片</span>
          <input type="file" accept="image/*" onChange={(event) => void detectImage(event)} />
        </label>
      </div>
      <div className="workspace workspace--two-column">
        <label className="tool-field">
          <span>内容</span>
          <textarea value={value} onChange={(event) => setValue(event.target.value)} spellCheck={false} />
        </label>
        <div className="visual-preview code-preview" dangerouslySetInnerHTML={{ __html: generated.svg }} />
      </div>
      <div className="tool-table">
        <div className="tool-table__row tool-table__row--head">
          <span>格式</span>
          <span>值</span>
        </div>
        {detected.length > 0 ? detected.map((item, index) => (
          <div key={`${item.format}-${index}`} className="tool-table__row">
            <span>{item.format}</span>
            <span>{item.rawValue}</span>
          </div>
        )) : (
          <div className="tool-table__row">
            <span>等待解析</span>
            <span>无结果</span>
          </div>
        )}
      </div>
      {generated.error ? <p className="tool-error">{generated.error}</p> : null}
      {scanError ? <p className="tool-error">{scanError}</p> : null}
    </section>
  );
}
