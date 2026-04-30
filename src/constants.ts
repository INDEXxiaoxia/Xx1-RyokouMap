/** 杭州西湖大致中心，初次打开地图时使用 */
export const DEFAULT_CENTER: [number, number] = [30.246, 120.143];
export const DEFAULT_ZOOM = 12;

/** 分组折线与标记配色（循环使用，与 UI 粉蓝淡色体系协调、地图上仍易区分） */
export const GROUP_PALETTE = [
  '#5c6fd8',
  '#e07a9a',
  '#4a9fd8',
  '#5ab89a',
  '#c9a44a',
  '#8b7fd4',
  '#52b8c8',
  '#d97b85',
] as const;

export function groupColor(index: number): string {
  return GROUP_PALETTE[index % GROUP_PALETTE.length]!;
}
