import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Small decorative SVG glyphs for the kit. All hidden from the
// accessibility tree: the control around them carries the label.

export function PlayGlyph({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <Path d="M4.5 2.6v10.8a.6.6 0 0 0 .92.5l8.4-5.4a.6.6 0 0 0 0-1L5.42 2.1a.6.6 0 0 0-.92.5z" fill={color} />
    </Svg>
  );
}

export function PauseGlyph({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <Rect x={3.5} y={2.5} width={3} height={11} rx={1} fill={color} />
      <Rect x={9.5} y={2.5} width={3} height={11} rx={1} fill={color} />
    </Svg>
  );
}

export function WarnGlyph({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <Path d="M12 3.5l9.5 16.5h-19L12 3.5z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M12 10v4.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={17.3} r={1.1} fill={color} />
    </Svg>
  );
}

/** Small ✕ used as the "take it back" cue on a placed chip. */
export function CrossGlyph({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <Path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** Three level bars beside the elapsed time while a question clip plays. */
export function LevelBars({ color, height = 14 }: { color: string; height?: number }) {
  return (
    <Svg width={13} height={height} viewBox="0 0 13 14" aria-hidden>
      <Rect x={0} y={5} width={3} height={9} rx={1.5} fill={color} />
      <Rect x={5} y={0} width={3} height={14} rx={1.5} fill={color} />
      <Rect x={10} y={3} width={3} height={11} rx={1.5} fill={color} />
    </Svg>
  );
}
