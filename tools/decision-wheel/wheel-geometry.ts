export interface WheelGeometry {
  cx: number;
  cy: number;
  radius: number;
}

const WHEEL_PADDING = 20;

export function getWheelGeometry(width: number, height: number): WheelGeometry {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 0;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 0;
  const cx = safeWidth / 2;
  const cy = safeHeight / 2;
  const radius = Math.max(Math.min(cx, cy) - WHEEL_PADDING, 0);

  return { cx, cy, radius };
}
