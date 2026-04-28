/** 杭州西湖大致中心，初次打开地图时使用 */
export const DEFAULT_CENTER: [number, number] = [30.246, 120.143];
export const DEFAULT_ZOOM = 12;

/** 分组折线与标记配色（循环使用） */
export const GROUP_PALETTE = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#ca8a04',
  '#9333ea',
  '#0891b2',
  '#db2777',
  '#4f46e5',
] as const;

export function groupColor(index: number): string {
  return GROUP_PALETTE[index % GROUP_PALETTE.length]!;
}
