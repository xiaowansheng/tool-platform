"use client";

import { useMemo, useState } from "react";
import type { ToolAppProps } from "@tool-platform/tool-contracts";
import jsQR from "jsqr";

type CodeMode = "qr" | "code128" | "code39" | "ean13";

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

// Code 39 SVG Encoder
function renderCode39Svg(text: string) {
  const upperText = text.toUpperCase();
  if (!/^[A-Z0-9\-\.\ \*\+\/\%\$]+$/.test(upperText)) {
    throw new Error("Code 39 只支持大写字母 A-Z、数字 0-9、空格以及 - . $ / + % *。");
  }
  
  // Start/stop character is asterisks
  const fullText = upperText.startsWith("*") && upperText.endsWith("*") 
    ? upperText 
    : "*" + upperText + "*";

  // Code 39 patterns table (1 = narrow, 2 = wide)
  const charMap: Record<string, number[]> = {
    "1": [2, 1, 1, 2, 1, 1, 1, 1, 2],
    "2": [1, 1, 2, 2, 1, 1, 1, 1, 2],
    "3": [2, 1, 2, 2, 1, 1, 1, 1, 1],
    "4": [1, 1, 1, 2, 2, 1, 1, 1, 2],
    "5": [2, 1, 1, 2, 2, 1, 1, 1, 1],
    "6": [1, 1, 2, 2, 2, 1, 1, 1, 1],
    "7": [1, 1, 1, 2, 1, 1, 2, 1, 2],
    "8": [2, 1, 1, 2, 1, 1, 2, 1, 1],
    "9": [1, 1, 2, 2, 1, 1, 2, 1, 1],
    "0": [1, 1, 1, 2, 2, 1, 2, 1, 1],
    "A": [2, 1, 1, 1, 1, 2, 1, 1, 2],
    "B": [1, 1, 2, 1, 1, 2, 1, 1, 2],
    "C": [2, 1, 2, 1, 1, 2, 1, 1, 1],
    "D": [1, 1, 1, 1, 2, 2, 1, 1, 2],
    "E": [2, 1, 1, 1, 2, 2, 1, 1, 1],
    "F": [1, 1, 2, 1, 2, 2, 1, 1, 1],
    "G": [1, 1, 1, 1, 1, 2, 2, 1, 2],
    "H": [2, 1, 1, 1, 1, 2, 2, 1, 1],
    "I": [1, 1, 2, 1, 1, 2, 2, 1, 1],
    "J": [1, 1, 1, 1, 2, 2, 2, 1, 1],
    "K": [2, 1, 1, 1, 1, 1, 1, 2, 2],
    "L": [1, 1, 2, 1, 1, 1, 1, 2, 2],
    "M": [2, 1, 2, 1, 1, 1, 1, 2, 1],
    "N": [1, 1, 1, 1, 2, 1, 1, 2, 2],
    "O": [2, 1, 1, 1, 2, 1, 1, 2, 1],
    "P": [1, 1, 2, 1, 2, 1, 1, 2, 1],
    "Q": [1, 1, 1, 1, 1, 1, 2, 2, 2],
    "R": [2, 1, 1, 1, 1, 1, 2, 2, 1],
    "S": [1, 1, 2, 1, 1, 1, 2, 2, 1],
    "T": [1, 1, 1, 1, 2, 1, 2, 2, 1],
    "U": [2, 2, 1, 1, 1, 1, 1, 1, 2],
    "V": [1, 2, 2, 1, 1, 1, 1, 1, 2],
    "W": [2, 2, 2, 1, 1, 1, 1, 1, 1],
    "X": [1, 2, 1, 1, 2, 1, 1, 1, 2],
    "Y": [2, 2, 1, 1, 2, 1, 1, 1, 1],
    "Z": [1, 2, 2, 1, 2, 1, 1, 1, 1],
    "-": [1, 2, 1, 1, 1, 1, 2, 1, 2],
    ".": [2, 2, 1, 1, 1, 1, 2, 1, 1],
    " ": [1, 2, 2, 1, 1, 1, 2, 1, 1],
    "*": [1, 2, 1, 1, 2, 1, 2, 1, 1],
    "$": [1, 2, 1, 2, 1, 2, 1, 1, 1],
    "/": [1, 2, 1, 2, 1, 1, 1, 2, 1],
    "+": [1, 2, 1, 1, 1, 2, 1, 2, 1],
    "%": [1, 1, 1, 2, 1, 2, 1, 2, 1]
  };

  let x = 12;
  const bars: string[] = [];
  const narrowWidth = 1.6;
  const wideWidth = 3.8;

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];
    const pattern = charMap[char];
    if (!pattern) continue;

    for (let j = 0; j < pattern.length; j++) {
      const isBar = j % 2 === 0;
      const width = pattern[j] === 1 ? narrowWidth : wideWidth;

      if (isBar) {
        bars.push(`<rect x="${x}" y="10" width="${width}" height="72"/>`);
      }
      x += width;
    }
    // Add character gap (narrow space)
    x += narrowWidth;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + 12} 96" role="img"><rect width="${x + 12}" height="96" fill="#fff"/><g fill="#081018">${bars.join("")}</g></svg>`;
}

// EAN-13 SVG Encoder with parity layout and text label rendering
function renderEan13Svg(text: string) {
  const digits = text.replace(/\D/g, "");
  if (digits.length !== 12 && digits.length !== 13) {
    throw new Error("EAN-13 必须是 12 位或 13 位数字。");
  }

  let fullDigits = digits;
  if (digits.length === 12) {
    // Calculate checksum digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const val = parseInt(digits[i]);
      sum += (i % 2 === 0) ? val : val * 3;
    }
    const checksum = (10 - (sum % 10)) % 10;
    fullDigits = digits + checksum;
  } else {
    // Validate checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const val = parseInt(digits[i]);
      sum += (i % 2 === 0) ? val : val * 3;
    }
    const expectedCheck = (10 - (sum % 10)) % 10;
    if (parseInt(digits[12]) !== expectedCheck) {
      throw new Error(`校验位不匹配！输入的第 13 位校验码为 ${digits[12]}，但计算出的期望校验码为 ${expectedCheck}。`);
    }
  }

  const structure = [
    "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"
  ];

  const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
  const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
  const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];

  const first = parseInt(fullDigits[0]);
  const layout = structure[first];

  let binary = "101"; // Start guard

  // Left 6 digits
  for (let i = 1; i <= 6; i++) {
    const digit = parseInt(fullDigits[i]);
    const codeType = layout[i - 1];
    binary += codeType === "L" ? L[digit] : G[digit];
  }

  binary += "01010"; // Center guard

  // Right 6 digits
  for (let i = 7; i <= 12; i++) {
    const digit = parseInt(fullDigits[i]);
    binary += R[digit];
  }

  binary += "101"; // End guard

  let x = 15;
  const bars: string[] = [];
  const modWidth = 2.5;

  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === "1") {
      const isGuard = i < 3 || (i >= 45 && i < 50) || i >= 92;
      const height = isGuard ? 84 : 72;
      bars.push(`<rect x="${x}" y="8" width="${modWidth}" height="${height}"/>`);
    }
    x += modWidth;
  }

  // Text labels layout
  const textSpans = [];
  textSpans.push(`<text x="5" y="94" font-family="monospace" font-size="14" font-weight="bold">${fullDigits[0]}</text>`);
  
  let labelX = 26;
  for (let i = 1; i <= 6; i++) {
    textSpans.push(`<text x="${labelX}" y="94" font-family="monospace" font-size="14">${fullDigits[i]}</text>`);
    labelX += modWidth * 7;
  }
  
  labelX += modWidth * 4.5;
  for (let i = 7; i <= 12; i++) {
    textSpans.push(`<text x="${labelX}" y="94" font-family="monospace" font-size="14">${fullDigits[i]}</text>`);
    labelX += modWidth * 7;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + 15} 105" role="img"><rect width="${x + 15}" height="105" fill="#fff"/><g fill="#081018">${bars.join("")}</g><g fill="#081018">${textSpans.join("")}</g></svg>`;
}

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function QrBarcodeTool({ manifest }: ToolAppProps) {
  const [mode, setMode] = useState<CodeMode>("qr");
  
  // Set default sample values based on chosen mode
  const [value, setValue] = useState("https://tool-platform.local/tools/qr-barcode-tool");
  const [detected, setDetected] = useState<DetectedBarcode[]>([]);
  const [scanError, setScanError] = useState("");
  const [copiedSvg, setCopiedSvg] = useState(false);

  const generated = useMemo(() => {
    try {
      let svg = "";
      if (mode === "qr") {
        svg = renderQrSvg(value);
      } else if (mode === "code128") {
        svg = renderCode128Svg(value);
      } else if (mode === "code39") {
        svg = renderCode39Svg(value);
      } else if (mode === "ean13") {
        svg = renderEan13Svg(value);
      }
      
      return {
        svg,
        previewUrl: svgToDataUrl(svg),
        error: ""
      };
    } catch (error) {
      return {
        svg: "",
        previewUrl: "",
        error: error instanceof Error ? error.message : "编码失败"
      };
    }
  }, [mode, value]);

  async function copySvg() {
    if (!generated.svg) return;
    await navigator.clipboard.writeText(generated.svg);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  }

  // Scan detection logic with browser native BarcodeDetector & local jsQR Fallback
  async function detectImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    setScanError("");
    setDetected([]);

    // Check if browser native BarcodeDetector exists
    const Detector = (window as BarcodeWindow).BarcodeDetector;
    let nativeSuccess = false;

    if (Detector) {
      let bitmap: ImageBitmap | null = null;
      try {
        bitmap = await createImageBitmap(file);
        const detector = new Detector({ formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a"] });
        const results = await detector.detect(bitmap);
        if (results.length > 0) {
          setDetected(results);
          nativeSuccess = true;
        }
      } catch (err) {
        console.warn("浏览器 native BarcodeDetector 解析失败，启用 jsQR 备用方案", err);
      } finally {
        bitmap?.close();
      }
    }

    // Fallback: If native detector failed, not supported, or returned no results, try client-side jsQR (for QR codes)
    if (!nativeSuccess) {
      try {
        const image = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
          if (!e.target?.result) return;
          image.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              setScanError("系统渲染画布出错，无法执行二维码识别");
              return;
            }

            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);

            const imageData = ctx.getImageData(0, 0, image.width, image.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height);

            if (qrCode) {
              setDetected([{
                rawValue: qrCode.data,
                format: "qr_code"
              }]);
            } else {
              setScanError("未在图片中检测到有效的 QR 二维码或条形码 (不支持当前格式，或图像模糊)。");
            }
          };
          image.src = e.target.result as string;
        };
        reader.readAsDataURL(file);
      } catch (fallbackErr) {
        setScanError(fallbackErr instanceof Error ? fallbackErr.message : "图片解析失败");
      }
    }
  }

  // Pre-fill valid values when modes change
  const handleModeChange = (newMode: CodeMode) => {
    setMode(newMode);
    if (newMode === "qr") {
      setValue("https://tool-platform.local/tools/qr-barcode-tool");
    } else if (newMode === "code128") {
      setValue("Platform128");
    } else if (newMode === "code39") {
      setValue("CODE39-TEST");
    } else if (newMode === "ean13") {
      setValue("690123456789");
    }
  };

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">图形与识别工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description || "生成本地 QR 二维码及各种行业条形码（Code 128 / Code 39 / EAN-13），并提供多兼容性的图像扫码识别。"}</p>
      </div>

      <div className="tool-toolbar" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <label className="tool-field tool-field--compact">
          <span>编码格式</span>
          <select value={mode} onChange={(event) => handleModeChange(event.target.value as CodeMode)}>
            <option value="qr">QR Code (二维码)</option>
            <option value="code128">Code 128 (标准一维码)</option>
            <option value="code39">Code 39 (物流/工业条码)</option>
            <option value="ean13">EAN-13 (商品零售条码)</option>
          </select>
        </label>
        <button type="button" className="button--primary" disabled={!generated.svg} onClick={() => void copySvg()}>
          {copiedSvg ? "已复制" : "复制 SVG"}
        </button>
        <label className="tool-field tool-field--compact" style={{ flex: 1, minWidth: "200px" }}>
          <span>上传图片识别二维码/条码</span>
          <input type="file" accept="image/*" onChange={(event) => void detectImage(event)} style={{ height: "30px", padding: "0.2rem" }} />
        </label>
      </div>

      <div className="workspace workspace--two-column">
        {/* Input content */}
        <label className="tool-field" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <span>输入要编码的内容 (Content)</span>
          <textarea 
            value={value} 
            onChange={(event) => setValue(event.target.value)} 
            spellCheck={false} 
            placeholder={
              mode === "qr" ? "输入任意文本或网址" :
              mode === "code128" ? "输入常用 ASCII 字符" :
              mode === "code39" ? "支持大写字母、数字和 - . $ / + % *" :
              "输入 12 位或 13 位商品数字代码"
            }
            style={{ flex: 1, minHeight: "150px", fontFamily: "var(--font-mono), monospace" }}
          />
        </label>

        {/* Preview SVG */}
        <div className="visual-preview code-preview" style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          border: "1px solid var(--border-default)", 
          borderRadius: "var(--radius-lg)",
          background: "#ffffff", 
          padding: "2rem",
          minHeight: "180px"
        }}>
          {generated.previewUrl ? (
            <img
              alt={`${mode} 预览`}
              src={generated.previewUrl}
              style={{ display: "block", maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
            />
          ) : (
            <span style={{ color: "var(--text-secondary)" }}>预览生成区域</span>
          )}
        </div>
      </div>

      {/* Detected Scan Results table */}
      <div className="tool-table" style={{ marginTop: "1rem" }}>
        <div className="tool-table__row tool-table__row--head" style={{ gridTemplateColumns: "150px 1fr" }}>
          <span>检测格式 (Format)</span>
          <span>解析值 (Value)</span>
        </div>
        {detected.length > 0 ? (
          detected.map((item, index) => (
            <div key={`${item.format}-${index}`} className="tool-table__row" style={{ gridTemplateColumns: "150px 1fr" }}>
              <span className="pill" style={{ 
                fontSize: "0.72rem", 
                backgroundColor: "rgba(34, 197, 94, 0.12)", 
                color: "#22c55e",
                textAlign: "center"
              }}>
                {item.format.toUpperCase().replace("_", " ")}
              </span>
              <span className="mono-output" style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>{item.rawValue}</span>
            </div>
          ))
        ) : (
          <div className="tool-table__row" style={{ gridTemplateColumns: "1fr", textAlign: "center", padding: "1.5rem" }}>
            <span style={{ color: "var(--text-secondary)" }}>等待上传条形码或二维码图片进行分析诊断。</span>
          </div>
        )}
      </div>

      {generated.error ? <p className="tool-error" style={{ marginTop: "1rem" }}>⚠️ 编码出错: {generated.error}</p> : null}
      {scanError ? <p className="tool-error" style={{ marginTop: "1rem" }}>⚠️ 扫码出错: {scanError}</p> : null}
      
      <p className="tool-note" style={{ marginTop: "1rem" }}>
        提示：生成面板采用标准矢量 SVG 渲染；识别面板整合了 Chrome/Safari 的原生 BarcodeDetector 硬件解析与 client-side jsQR 解码库双重引擎，完美解决 Firefox 浏览器的跨平台兼容障碍。
      </p>
    </section>
  );
}
