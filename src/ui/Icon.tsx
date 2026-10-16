import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useColors } from './theme';

export type IconName =
  | 'dots' | 'play' | 'pause' | 'prev' | 'next' | 'shuf' | 'rep' | 'heart' | 'heartO' | 'queue' | 'down' | 'dl'
  | 'info' | 'srch' | 'gear' | 'back' | 'x' | 'grip' | 'check' | 'img' | 'plus' | 'pin' | 'chev';

/** Single-colour glyph set drawn on a 24px grid. */
export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const c = useColors();
  const col = color ?? c.fg;
  const fill = { fill: col };
  const stroke = { stroke: col, strokeWidth: 2, fill: 'none' as const };
  let g: React.ReactNode;
  switch (name) {
    case 'dots': g = <G {...fill}><Circle cx={5} cy={12} r={1.8} /><Circle cx={12} cy={12} r={1.8} /><Circle cx={19} cy={12} r={1.8} /></G>; break;
    case 'play': g = <Path {...fill} d="M8 5.5v13a1 1 0 0 0 1.5.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 8 5.5z" />; break;
    case 'pause': g = <G {...fill}><Rect x={6} y={5} width={4.5} height={14} rx={1} /><Rect x={13.5} y={5} width={4.5} height={14} rx={1} /></G>; break;
    case 'prev': g = <G {...fill}><Rect x={5} y={5} width={2.4} height={14} rx={1} /><Path d="M19 6.2v11.6a.9.9 0 0 1-1.4.75l-8.4-5.8a.9.9 0 0 1 0-1.5l8.4-5.8A.9.9 0 0 1 19 6.2z" /></G>; break;
    case 'next': g = <G {...fill}><Rect x={16.6} y={5} width={2.4} height={14} rx={1} /><Path d="M5 6.2v11.6a.9.9 0 0 0 1.4.75l8.4-5.8a.9.9 0 0 0 0-1.5L6.4 5.45A.9.9 0 0 0 5 6.2z" /></G>; break;
    case 'shuf': g = <Path {...fill} d="M16 4h4v4l-1.6-1.6-4.2 4.2-1.4-1.4 4.2-4.2zM4 6h3.5c1.2 0 2.3.5 3 1.4l7 8.6 1.5-1.5L20 16v4h-4l1.6-1.6-1.2-1.4-6.6-8.2C9.4 8.3 9 8 8 8H4zM4 16h4l2-2.5 1.3 1.7L9.2 18H4z" />; break;
    case 'rep': g = <Path {...fill} d="M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z" />; break;
    case 'heart': g = <Path {...fill} d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" />; break;
    case 'heartO': g = <Path {...stroke} d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.4-7 10-7 10z" />; break;
    case 'queue': g = <Path {...fill} d="M3 6h14v2H3zm0 5h14v2H3zm0 5h9v2H3zm14 0v-3h2v3h3v2h-3v3h-2v-3h-3v-2z" />; break;
    case 'down': g = <Path {...fill} d="M12 16 5 9l1.4-1.4L12 13.2l5.6-5.6L19 9z" />; break;
    case 'dl': g = <Path {...fill} d="M11 4h2v9l3.5-3.5L18 11l-6 6-6-6 1.5-1.5L11 13zM5 19h14v2H5z" />; break;
    case 'info': g = <Path {...fill} d="M11 10h2v7h-2zm0-3h2v2h-2zM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z" />; break;
    case 'srch': g = <Path {...fill} d="M10 3a7 7 0 0 1 5.6 11.2L21 19.6 19.6 21l-5.4-5.4A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />; break;
    case 'gear': g = <G fill="none" stroke={col}><Circle cx={12} cy={12} r={8.5} strokeWidth={3} strokeDasharray="3.34 3.34" /><Circle cx={12} cy={12} r={7} strokeWidth={2} /><Circle cx={12} cy={12} r={2.6} strokeWidth={2} /></G>; break;
    case 'back': g = <Path {...stroke} d="M15 5l-7 7 7 7" />; break;
    case 'chev': g = <Path {...stroke} d="M9 5l7 7-7 7" />; break;
    case 'x': g = <Path {...stroke} d="M6 6l12 12M18 6 6 18" />; break;
    case 'grip': g = <Path {...fill} d="M4 8h16v2H4zm0 6h16v2H4z" />; break;
    case 'check': g = <Path {...fill} d="M9.5 17.5 4 12l1.4-1.4 4.1 4.1 9.1-9.1L20 7z" />; break;
    case 'img': g = <Path {...fill} d="M4 5h16v14H4zm2 2v7l3-3 3 3 3-4 3 4V7z" />; break;
    case 'plus': g = <Path {...fill} d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />; break;
    case 'pin': g = <Path {...fill} d="M14 3l7 7-2 1-3-1-3.5 3.5.5 4-1.5 1.5L8 15l-5 6-1-1 6-5-3.5-3.5L6 10l4 .5L13.5 7l-1-3z" />; break;
  }
  return <Svg width={size} height={size} viewBox="0 0 24 24">{g}</Svg>;
}
