import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { usePalette } from '@/theme/appearance';

import { nodeX, nodeY, ROW } from './layout';
import type { PathStage } from './path';

interface PathRoadProps {
  stages: readonly PathStage[];
  width: number;
  height: number;
  /** Centre of the finish cup, where the road ends. */
  finish: { x: number; y: number };
}

/** S-curve between two points, leaving and arriving vertically so the road flows. */
function curve(x0: number, y0: number, x1: number, y1: number): string {
  const bend = (y1 - y0) / 2;
  return `M ${x0} ${y0} C ${x0} ${y0 + bend} ${x1} ${y1 - bend} ${x1} ${y1}`;
}

/**
 * The road between stages: a wide soft bed under every segment, and on top either a glowing
 * coloured lane (the learner has walked it) or a row of dots (still ahead).
 */
export const PathRoad = memo(function PathRoad({ stages, width, height, finish }: PathRoadProps) {
  const home = usePalette();
  const points = stages.map((_, index) => ({ x: nodeX(index, width), y: nodeY(index) }));
  points.push(finish);

  const segments = points.slice(0, -1).map((from, index) => {
    const to = points[index + 1];
    const walked = stages[index].status === 'passed';
    const fromTint = stages[index].scenario.tint;
    const toTint = stages[index + 1]?.scenario.tint ?? '#F5B524';
    return { d: curve(from.x, from.y, to.x, to.y), walked, fromTint, toTint, top: from.y, bottom: to.y };
  });

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {segments.map((segment, index) => (
          <LinearGradient key={index} id={`lane-${index}`} x1="0" y1={segment.top} x2="0" y2={segment.bottom} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={segment.fromTint} />
            <Stop offset="1" stopColor={segment.toTint} />
          </LinearGradient>
        ))}
      </Defs>

      {/* The road bed: one wide, calm stroke that ties the whole path together. */}
      {segments.map((segment, index) => (
        <Path key={`bed-${index}`} d={segment.d} stroke={home.rim} strokeOpacity={home.appearance === 'dark' ? 0.55 : 0.8} strokeWidth={26} strokeLinecap="round" fill="none" />
      ))}

      {segments.map((segment, index) =>
        segment.walked ? (
          [
            <Path key={`glow-${index}`} d={segment.d} stroke={`url(#lane-${index})`} strokeOpacity={0.22} strokeWidth={26} strokeLinecap="round" fill="none" />,
            <Path key={`lane-${index}`} d={segment.d} stroke={`url(#lane-${index})`} strokeWidth={10} strokeLinecap="round" fill="none" />,
          ]
        ) : (
          <Path
            key={`dots-${index}`}
            d={segment.d}
            stroke={home.appearance === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(16,24,40,0.16)'}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`0.1 ${ROW / 9}`}
            fill="none"
          />
        ),
      )}
    </Svg>
  );
});
