import Svg, { Ellipse, Path, Rect } from 'react-native-svg';

interface CathedralSkylineProps {
  width: number;
  height: number;
  color?: string;
}

interface Tower {
  x: number;
  bodyWidth: number;
  bodyHeight: number;
  domeRadius: number;
}

const TOWERS: Tower[] = [
  { x: 30, bodyWidth: 22, bodyHeight: 34, domeRadius: 15 },
  { x: 78, bodyWidth: 18, bodyHeight: 52, domeRadius: 12 },
  { x: 128, bodyWidth: 30, bodyHeight: 78, domeRadius: 22 },
  { x: 190, bodyWidth: 20, bodyHeight: 60, domeRadius: 14 },
  { x: 238, bodyWidth: 26, bodyHeight: 70, domeRadius: 18 },
  { x: 292, bodyWidth: 18, bodyHeight: 48, domeRadius: 12 },
  { x: 336, bodyWidth: 22, bodyHeight: 36, domeRadius: 15 },
];

const VIEWBOX_WIDTH = 400;
const VIEWBOX_HEIGHT = 160;
const GROUND_Y = VIEWBOX_HEIGHT - 20;

/** Self-contained silhouette of onion-domed towers, evoking Red Square's skyline at dusk. */
export function CathedralSkyline({ width, height, color = '#0B0F2B' }: CathedralSkylineProps) {
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}>
      <Rect x={0} y={GROUND_Y} width={VIEWBOX_WIDTH} height={20} fill={color} />
      {TOWERS.map((tower, index) => {
        const bodyTop = GROUND_Y - tower.bodyHeight;
        const centerX = tower.x + tower.bodyWidth / 2;
        const domeCenterY = bodyTop - tower.domeRadius * 0.55;
        const spireTop = domeCenterY - tower.domeRadius * 1.6;

        return (
          <Path
            key={index}
            fill={color}
            d={`
              M ${tower.x} ${bodyTop}
              L ${tower.x} ${GROUND_Y}
              L ${tower.x + tower.bodyWidth} ${GROUND_Y}
              L ${tower.x + tower.bodyWidth} ${bodyTop}
              L ${centerX + tower.domeRadius} ${bodyTop + 2}
              C ${centerX + tower.domeRadius} ${domeCenterY - tower.domeRadius * 0.9},
                ${centerX + tower.domeRadius * 0.7} ${domeCenterY - tower.domeRadius * 1.5},
                ${centerX} ${spireTop}
              C ${centerX - tower.domeRadius * 0.7} ${domeCenterY - tower.domeRadius * 1.5},
                ${centerX - tower.domeRadius} ${domeCenterY - tower.domeRadius * 0.9},
                ${centerX - tower.domeRadius} ${bodyTop + 2}
              Z
            `}
          />
        );
      })}
      {TOWERS.map((tower, index) => {
        const bodyTop = GROUND_Y - tower.bodyHeight;
        const centerX = tower.x + tower.bodyWidth / 2;
        const domeCenterY = bodyTop - tower.domeRadius * 0.55;
        const spireTop = domeCenterY - tower.domeRadius * 1.6;
        return <Ellipse key={`tip-${index}`} cx={centerX} cy={spireTop - 3} rx={2.5} ry={4} fill={color} />;
      })}
    </Svg>
  );
}
