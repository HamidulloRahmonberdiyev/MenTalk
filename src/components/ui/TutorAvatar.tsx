import { memo, useEffect, useState } from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { useT } from '@/i18n';

const SKIN = '#F7CDB0';
const HAIR = '#6A3B24';
const SHIRT = '#8DBBF2';

interface TutorAvatarProps {
  size: number;
  /** Animates the mouth while the tutor is talking. */
  speaking?: boolean;
}

/** Friendly vector tutor "Anna". Self-contained so no image assets are required. */
export const TutorAvatar = memo(function TutorAvatar({ size, speaking = false }: TutorAvatarProps) {
  const t = useT();
  const [mouthOpen, setMouthOpen] = useState(false);

  useEffect(() => {
    if (!speaking) {
      setMouthOpen(false);
      return;
    }
    const interval = setInterval(() => setMouthOpen((open) => !open), 170);
    return () => clearInterval(interval);
  }, [speaking]);

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityLabel={t('tutor.label')}>
      {/* Shirt */}
      <Path d="M22 200 C24 158 66 148 100 148 C134 148 176 158 178 200 Z" fill={SHIRT} />
      <Path d="M84 148 L100 172 L116 148 Z" fill="#FFFFFF" opacity={0.9} />
      {/* Neck */}
      <Rect x={88} y={122} width={24} height={34} rx={10} fill="#EDB996" />
      {/* Hair back + bun */}
      <Circle cx={100} cy={30} r={19} fill={HAIR} />
      <Ellipse cx={100} cy={86} rx={54} ry={58} fill={HAIR} />
      {/* Face */}
      <Ellipse cx={100} cy={92} rx={40} ry={46} fill={SKIN} />
      {/* Fringe */}
      <Path d="M56 84 C54 40 146 40 144 84 C132 64 114 58 100 58 C86 58 68 64 56 84 Z" fill={HAIR} />
      {/* Brows */}
      <Path d="M70 80 Q80 75 90 79" stroke={HAIR} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M110 79 Q120 75 130 80" stroke={HAIR} strokeWidth={3} strokeLinecap="round" fill="none" />
      {/* Eyes */}
      <Ellipse cx={80} cy={94} rx={5.5} ry={7} fill="#2A1A12" />
      <Ellipse cx={120} cy={94} rx={5.5} ry={7} fill="#2A1A12" />
      <Circle cx={82} cy={91.5} r={2} fill="#FFFFFF" />
      <Circle cx={122} cy={91.5} r={2} fill="#FFFFFF" />
      {/* Blush */}
      <Circle cx={70} cy={110} r={8} fill="#F4A08A" opacity={0.45} />
      <Circle cx={130} cy={110} r={8} fill="#F4A08A" opacity={0.45} />
      {/* Nose */}
      <Path d="M98 100 Q100 106 103 105" stroke="#D99B7C" strokeWidth={2.5} strokeLinecap="round" fill="none" />
      {/* Mouth */}
      {mouthOpen ? (
        <Ellipse cx={100} cy={120} rx={8} ry={5.5} fill="#A63D34" />
      ) : (
        <Path d="M86 114 Q100 128 114 114" stroke="#B5473B" strokeWidth={3.5} strokeLinecap="round" fill="none" />
      )}
    </Svg>
  );
});
