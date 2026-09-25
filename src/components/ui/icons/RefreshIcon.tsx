import Svg, { Path } from 'react-native-svg';

export interface RefreshIconProps {
  color: string;
  size?: number;
}

// Handoff §4 footer "Retry" pill icon: a 16x16 refresh glyph
// (viewBox 20x20, 1.8px stroke round caps, matching the design system's
// inline-SVG icon convention — no icon font).
export default function RefreshIcon({ color, size = 16 }: RefreshIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M17 10a7 7 0 1 1-2-4.9M17 2v4h-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
