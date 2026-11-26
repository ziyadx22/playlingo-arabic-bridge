export type Roi = { x: number; y: number; w: number; h: number };

export function changeRoi(start: Roi, mode: "move" | "resize", dx: number, dy: number): Roi {
  return mode === "move"
    ? {
        ...start,
        x: Math.min(100 - start.w, Math.max(0, start.x + dx)),
        y: Math.min(100 - start.h, Math.max(0, start.y + dy)),
      }
    : {
        ...start,
        w: Math.min(100 - start.x, Math.max(15, start.w + dx)),
        h: Math.min(100 - start.y, Math.max(8, start.h + dy)),
      };
}
