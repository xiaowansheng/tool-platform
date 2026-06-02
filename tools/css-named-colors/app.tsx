"use client";

import { useState, useMemo } from "react";

import type { ToolAppProps } from "@tool-platform/tool-contracts";

interface NamedColor {
  name: string;
  hex: string;
}

const COLORS: NamedColor[] = [
  { name: "aliceblue", hex: "#f0f8ff" }, { name: "antiquewhite", hex: "#faebd7" },
  { name: "aqua", hex: "#00ffff" }, { name: "aquamarine", hex: "#7fffd4" },
  { name: "azure", hex: "#f0ffff" }, { name: "beige", hex: "#f5f5dc" },
  { name: "bisque", hex: "#ffe4c4" }, { name: "black", hex: "#000000" },
  { name: "blanchedalmond", hex: "#ffebcd" }, { name: "blue", hex: "#0000ff" },
  { name: "blueviolet", hex: "#8a2be2" }, { name: "brown", hex: "#a52a2a" },
  { name: "burlywood", hex: "#deb887" }, { name: "cadetblue", hex: "#5f9ea0" },
  { name: "chartreuse", hex: "#7fff00" }, { name: "chocolate", hex: "#d2691e" },
  { name: "coral", hex: "#ff7f50" }, { name: "cornflowerblue", hex: "#6495ed" },
  { name: "cornsilk", hex: "#fff8dc" }, { name: "crimson", hex: "#dc143c" },
  { name: "cyan", hex: "#00ffff" }, { name: "darkblue", hex: "#00008b" },
  { name: "darkcyan", hex: "#008b8b" }, { name: "darkgoldenrod", hex: "#b8860b" },
  { name: "darkgray", hex: "#a9a9a9" }, { name: "darkgrey", hex: "#a9a9a9" },
  { name: "darkgreen", hex: "#006400" }, { name: "darkkhaki", hex: "#bdb76b" },
  { name: "darkmagenta", hex: "#8b008b" }, { name: "darkolivegreen", hex: "#556b2f" },
  { name: "darkorange", hex: "#ff8c00" }, { name: "darkorchid", hex: "#9932cc" },
  { name: "darkred", hex: "#8b0000" }, { name: "darksalmon", hex: "#e9967a" },
  { name: "darkseagreen", hex: "#8fbc8f" }, { name: "darkslateblue", hex: "#483d8b" },
  { name: "darkslategray", hex: "#2f4f4f" }, { name: "darkslategrey", hex: "#2f4f4f" },
  { name: "darkturquoise", hex: "#00ced1" }, { name: "darkviolet", hex: "#9400d3" },
  { name: "deeppink", hex: "#ff1493" }, { name: "deepskyblue", hex: "#00bfff" },
  { name: "dimgray", hex: "#696969" }, { name: "dimgrey", hex: "#696969" },
  { name: "dodgerblue", hex: "#1e90ff" }, { name: "firebrick", hex: "#b22222" },
  { name: "floralwhite", hex: "#fffaf0" }, { name: "forestgreen", hex: "#228b22" },
  { name: "fuchsia", hex: "#ff00ff" }, { name: "gainsboro", hex: "#dcdcdc" },
  { name: "ghostwhite", hex: "#f8f8ff" }, { name: "gold", hex: "#ffd700" },
  { name: "goldenrod", hex: "#daa520" }, { name: "gray", hex: "#808080" },
  { name: "grey", hex: "#808080" }, { name: "green", hex: "#008000" },
  { name: "greenyellow", hex: "#adff2f" }, { name: "honeydew", hex: "#f0fff0" },
  { name: "hotpink", hex: "#ff69b4" }, { name: "indianred", hex: "#cd5c5c" },
  { name: "indigo", hex: "#4b0082" }, { name: "ivory", hex: "#fffff0" },
  { name: "khaki", hex: "#f0e68c" }, { name: "lavender", hex: "#e6e6fa" },
  { name: "lavenderblush", hex: "#fff0f5" }, { name: "lawngreen", hex: "#7cfc00" },
  { name: "lemonchiffon", hex: "#fffacd" }, { name: "lightblue", hex: "#add8e6" },
  { name: "lightcoral", hex: "#f08080" }, { name: "lightcyan", hex: "#e0ffff" },
  { name: "lightgoldenrodyellow", hex: "#fafad2" }, { name: "lightgray", hex: "#d3d3d3" },
  { name: "lightgrey", hex: "#d3d3d3" }, { name: "lightgreen", hex: "#90ee90" },
  { name: "lightpink", hex: "#ffb6c1" }, { name: "lightsalmon", hex: "#ffa07a" },
  { name: "lightseagreen", hex: "#20b2aa" }, { name: "lightskyblue", hex: "#87cefa" },
  { name: "lightslategray", hex: "#778899" }, { name: "lightslategrey", hex: "#778899" },
  { name: "lightsteelblue", hex: "#b0c4de" }, { name: "lightyellow", hex: "#ffffe0" },
  { name: "lime", hex: "#00ff00" }, { name: "limegreen", hex: "#32cd32" },
  { name: "linen", hex: "#faf0e6" }, { name: "magenta", hex: "#ff00ff" },
  { name: "maroon", hex: "#800000" }, { name: "mediumaquamarine", hex: "#66cdaa" },
  { name: "mediumblue", hex: "#0000cd" }, { name: "mediumorchid", hex: "#ba55d3" },
  { name: "mediumpurple", hex: "#9370db" }, { name: "mediumseagreen", hex: "#3cb371" },
  { name: "mediumslateblue", hex: "#7b68ee" }, { name: "mediumspringgreen", hex: "#00fa9a" },
  { name: "mediumturquoise", hex: "#48d1cc" }, { name: "mediumvioletred", hex: "#c71585" },
  { name: "midnightblue", hex: "#191970" }, { name: "mintcream", hex: "#f5fffa" },
  { name: "mistyrose", hex: "#ffe4e1" }, { name: "moccasin", hex: "#ffe4b5" },
  { name: "navajowhite", hex: "#ffdead" }, { name: "navy", hex: "#000080" },
  { name: "oldlace", hex: "#fdf5e6" }, { name: "olive", hex: "#808000" },
  { name: "olivedrab", hex: "#6b8e23" }, { name: "orange", hex: "#ffa500" },
  { name: "orangered", hex: "#ff4500" }, { name: "orchid", hex: "#da70d6" },
  { name: "palegoldenrod", hex: "#eee8aa" }, { name: "palegreen", hex: "#98fb98" },
  { name: "paleturquoise", hex: "#afeeee" }, { name: "palevioletred", hex: "#db7093" },
  { name: "papayawhip", hex: "#ffefd5" }, { name: "peachpuff", hex: "#ffdab9" },
  { name: "peru", hex: "#cd853f" }, { name: "pink", hex: "#ffc0cb" },
  { name: "plum", hex: "#dda0dd" }, { name: "powderblue", hex: "#b0e0e6" },
  { name: "purple", hex: "#800080" }, { name: "rebeccapurple", hex: "#663399" },
  { name: "red", hex: "#ff0000" }, { name: "rosybrown", hex: "#bc8f8f" },
  { name: "royalblue", hex: "#4169e1" }, { name: "saddlebrown", hex: "#8b4513" },
  { name: "salmon", hex: "#fa8072" }, { name: "sandybrown", hex: "#f4a460" },
  { name: "seagreen", hex: "#2e8b57" }, { name: "seashell", hex: "#fff5ee" },
  { name: "sienna", hex: "#a0522d" }, { name: "silver", hex: "#c0c0c0" },
  { name: "skyblue", hex: "#87ceeb" }, { name: "slateblue", hex: "#6a5acd" },
  { name: "slategray", hex: "#708090" }, { name: "slategrey", hex: "#708090" },
  { name: "snow", hex: "#fffafa" }, { name: "springgreen", hex: "#00ff7f" },
  { name: "steelblue", hex: "#4682b4" }, { name: "tan", hex: "#d2b48c" },
  { name: "teal", hex: "#008080" }, { name: "thistle", hex: "#d8bfd8" },
  { name: "tomato", hex: "#ff6347" }, { name: "turquoise", hex: "#40e0d0" },
  { name: "violet", hex: "#ee82ee" }, { name: "wheat", hex: "#f5deb3" },
  { name: "white", hex: "#ffffff" }, { name: "whitesmoke", hex: "#f5f5f5" },
  { name: "yellow", hex: "#ffff00" }, { name: "yellowgreen", hex: "#9acd32" }
];

function getLuminance(hex: string) {
  const v = hex.replace("#", "");
  const r = Number.parseInt(v.slice(0, 2), 16);
  const g = Number.parseInt(v.slice(2, 4), 16);
  const b = Number.parseInt(v.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export default function CssNamedColorsTool({ manifest }: ToolAppProps) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return COLORS;
    const q = query.toLowerCase().trim();
    return COLORS.filter((c) => c.name.includes(q) || c.hex.includes(q));
  }, [query]);

  async function handleCopy(val: string, label: string) {
    await navigator.clipboard.writeText(val);
    setCopied(label);
  }

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <p className="eyebrow">设计工具</p>
          <h2>{manifest.name}</h2>
        </div>
        <p>{manifest.description}</p>
      </div>
      <label className="tool-field">
        <span>搜索颜色</span>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setCopied(""); }}
          placeholder="输入颜色名称或 HEX 值…"
          spellCheck={false}
        />
      </label>
      <p className="tool-note">共 {filtered.length} / {COLORS.length} 个颜色</p>
      <div className="named-colors-grid">
        {filtered.map((color) => {
          const lum = getLuminance(color.hex);
          const textClr = lum > 0.55 ? "#081018" : "#f8fafc";
          return (
            <button
              key={color.name}
              type="button"
              className="named-color-swatch"
              style={{ background: color.hex, color: textClr }}
              onClick={() => void handleCopy(color.hex, color.name)}
            >
              <span className="named-color-swatch__name">{color.name}</span>
              <span className="named-color-swatch__hex">{copied === color.name ? "已复制" : color.hex}</span>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? <p className="tool-error">未找到匹配的颜色</p> : null}
    </section>
  );
}
