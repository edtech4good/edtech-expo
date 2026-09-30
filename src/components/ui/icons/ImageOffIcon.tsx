import Svg, { Circle, Path, Rect } from 'react-native-svg';

export interface ImageOffIconProps {
  color: string;
  size?: number;
}

// Quiet "picture" glyph for the image-missing tile: frame, sun, hill
// (viewBox 24x24, 1.8px stroke round caps — the inline-SVG icon convention).
export default function ImageOffIcon({ color, size = 24 }: ImageOffIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3.5}
        y={4.5}
        width={17}
        height={15}
        rx={2.5}
        stroke={color}
        strokeWidth={1.8}
      />
      <Circle cx={9} cy={10} r={1.6} stroke={color} strokeWidth={1.8} />
      <Path
        d="M4 17l5-4.5 3.5 3L16 12l4 4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
