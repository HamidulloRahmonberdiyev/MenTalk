import { memo, useId } from 'react';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import type { TutorTone } from '@/types';

const INK = '#2B2340';
const MOUTH = '#E8445E';

/** Face colour per tone: highlight, body, rim. */
const SKIN: Record<TutorTone, [string, string, string]> = {
  calm: ['#F1FAFF', '#BFE4FF', '#7CC3F5'],
  funny: ['#FFF6C9', '#FFD95A', '#F5B21B'],
  angry: ['#FFE1E1', '#FF9C9C', '#F05A5A'],
};

/** Eyes, brows and mouth of each mood, on a 40×40 canvas. */
function Features({ tone }: { tone: TutorTone }) {
  switch (tone) {
    case 'calm':
      return (
        <>
          <Path d="M11 18.5Q14 15.5 17 18.5M23 18.5Q26 15.5 29 18.5" stroke={INK} strokeWidth={2.2} strokeLinecap="round" fill="none" />
          <Path d="M14.5 24.5Q20 29.5 25.5 24.5" stroke={INK} strokeWidth={2.2} strokeLinecap="round" fill="none" />
          <Ellipse cx={10.5} cy={23.5} rx={2.6} ry={1.6} fill="#FF8FA3" opacity={0.45} />
          <Ellipse cx={29.5} cy={23.5} rx={2.6} ry={1.6} fill="#FF8FA3" opacity={0.45} />
        </>
      );
    case 'funny':
      return (
        <>
          <Path d="M10.5 18L14 15.5L17.5 18M22.5 18L26 15.5L29.5 18" stroke={INK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Path d="M12.5 22.5H27.5Q27 31 20 31Q13 31 12.5 22.5Z" fill={MOUTH} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
          <Path d="M16 28.6Q20 26.2 24 28.6Q22.4 30.4 20 30.4Q17.6 30.4 16 28.6Z" fill="#FFB3C0" />
        </>
      );
    case 'angry':
      return (
        <>
          <Path d="M10.5 14L17 16.8M29.5 14L23 16.8" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
          <Circle cx={14.5} cy={20} r={2} fill={INK} />
          <Circle cx={25.5} cy={20} r={2} fill={INK} />
          <Path d="M14.5 28.5Q20 24 25.5 28.5" stroke={INK} strokeWidth={2.2} strokeLinecap="round" fill="none" />
        </>
      );
  }
}

/** A small round face that says the tone at a glance, for the tone menu and the profile picker. */
export const ToneFace = memo(function ToneFace({ tone, size = 32 }: { tone: TutorTone; size?: number }) {
  // Gradient ids must be unique per drawing: on web every <svg> shares one document.
  const id = `tone${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [light, body, rim] = SKIN[tone];

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <RadialGradient id={id} cx="0.38" cy="0.3" rx="0.75" ry="0.75">
          <Stop offset="0" stopColor={light} />
          <Stop offset="0.6" stopColor={body} />
          <Stop offset="1" stopColor={rim} />
        </RadialGradient>
      </Defs>
      <Circle cx={20} cy={20} r={18.5} fill={`url(#${id})`} />
      <Ellipse cx={13.5} cy={9.5} rx={5} ry={2.6} fill="#FFFFFF" opacity={0.65} transform="rotate(-25 13.5 9.5)" />
      <Features tone={tone} />
    </Svg>
  );
});
