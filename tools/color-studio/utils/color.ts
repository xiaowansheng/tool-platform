export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface Hsv {
  h: number;
  s: number;
  v: number;
}

export function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function parseHex(input: string): Rgb {
  const normalized = input.trim().replace(/^#/, "");
  const value = normalized.length === 3
    ? normalized.split("").map((part) => part + part).join("")
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error("请输入 3 位或 6 位 HEX 颜色");
  }

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

export function toHex({ r, g, b }: Rgb) {
  return "#" + [r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, "0")).join("");
}

export function toHsl({ r, g, b }: Rgb): Hsl {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return {
      h: 0,
      s: 0,
      l: Math.round(lightness * 100)
    };
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;

  if (max === red) {
    hue = 60 * (((green - blue) / delta) % 6);
  } else if (max === green) {
    hue = 60 * ((blue - red) / delta + 2);
  } else {
    hue = 60 * ((red - green) / delta + 4);
  }

  return {
    h: Math.round((hue + 360) % 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100)
  };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const S = s / 100, L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = L - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  return "#" + [r1, g1, b1].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const S = s / 100, L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = L - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  return { r: Math.round((r1 + m) * 255), g: Math.round((g1 + m) * 255), b: Math.round((b1 + m) * 255) };
}

export function hexToHsl(hex: string): Hsl {
  const parsed = parseHex(hex);
  return toHsl(parsed);
}

export function hexToRgb(hex: string): Rgb {
  return parseHex(hex);
}

export function hslToHsv({ h, s, l }: Hsl): Hsv {
  const sDouble = s / 100;
  const lDouble = l / 100;
  const v = lDouble + sDouble * Math.min(lDouble, 1 - lDouble);
  const sv = v === 0 ? 0 : 2 * (1 - lDouble / v);
  return {
    h,
    s: Math.round(sv * 100),
    v: Math.round(v * 100)
  };
}

export function hsvToHsl({ h, s, v }: Hsv): Hsl {
  const sDouble = s / 100;
  const vDouble = v / 100;
  const l = vDouble * (1 - sDouble / 2);
  const sl = (l === 0 || l === 1) ? 0 : (vDouble - l) / Math.min(l, 1 - l);
  return {
    h,
    s: Math.round(sl * 100),
    l: Math.round(l * 100)
  };
}

export type ColorFormat = "hex" | "rgb" | "hsl" | "rgba" | "hsla";

export function formatColor(hex: string, format: ColorFormat, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  switch (format) {
    case "hex": return hex;
    case "rgb": return `rgb(${r}, ${g}, ${b})`;
    case "rgba": return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    case "hsl": {
      const { h, s, l } = hexToHsl(hex);
      return `hsl(${h}, ${s}%, ${l}%)`;
    }
    case "hsla": {
      const { h, s, l } = hexToHsl(hex);
      return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
    }
  }
}

export function relativeLuminance({ r, g, b }: Rgb) {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: Rgb, background: Rgb) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

export function getLuminance({ r, g, b }: Rgb) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function normalizeHexInput(value: string) {
  try {
    return toHex(parseHex(value));
  } catch {
    return "#000000";
  }
}
