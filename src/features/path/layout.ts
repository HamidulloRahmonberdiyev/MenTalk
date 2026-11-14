/** Geometry of the winding path, shared by the road, the nodes and the auto-scroll. */
export const NODE = 88;
/** Vertical distance between two stage centres. */
export const ROW = 172;
/** Room above the first node for the "you are here" bubble. */
export const TOP_PAD = 72;
/** Space under the last stage for the finish cup. */
export const FINISH_ROW = 230;
export const GUTTER = 16;

/** Where each stage sits across the screen, as a share of the swing either side of the centre. */
const SWING = [-0.55, 0.55, 1, 0.45, -0.45, -1] as const;

export function nodeX(index: number, width: number): number {
  return width / 2 + SWING[index % SWING.length] * width * 0.2;
}

export function nodeY(index: number): number {
  return TOP_PAD + NODE / 2 + index * ROW;
}

/** The label card goes on the roomier side of its node. */
export function labelSide(index: number, width: number): 'left' | 'right' {
  return nodeX(index, width) >= width / 2 ? 'left' : 'right';
}
