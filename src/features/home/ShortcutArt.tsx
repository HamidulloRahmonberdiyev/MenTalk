import { createContext, useContext, useId, type ReactNode } from 'react';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

/**
 * Hand-drawn "clay" illustrations for the home shortcuts, in the spirit of Englify's 3D icons:
 * every solid is a gradient face over a darker extruded side, with a gloss on top and a soft
 * shadow under it. All art is drawn on a 100×100 canvas.
 */
export type ShortcutArtName = 'topics' | 'chat' | 'book' | 'game' | 'translate' | 'play' | 'dice' | 'profile' | 'mic' | 'mistakes';

type Tone = 'blue' | 'paper' | 'pink';

const TONES: Record<Tone, { face: [string, string, string]; side: [string, string] }> = {
  blue: { face: ['#B9E0FF', '#62B0F8', '#2F77E1'], side: ['#2C66C8', '#153D8C'] },
  paper: { face: ['#FFFFFF', '#EEF6FF', '#C9DFF7'], side: ['#9DBFE6', '#6E94C6'] },
  pink: { face: ['#FFC2E1', '#FB86C0', '#E0559D'], side: ['#C23B82', '#8E2160'] },
};

// Gradient ids must be unique per drawing: on web every <svg> shares one document.
const IdContext = createContext('art');
const useFill = (name: string) => `url(#${useContext(IdContext)}-${name})`;

const roundRect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
  `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;

interface ClayProps {
  d: string;
  tone?: Tone;
  /** How thick the solid looks: its side shows this far down-right. */
  depth?: number;
}

/** One solid: extruded side, gradient face, and a gloss over the upper half. */
function Clay({ d, tone = 'blue', depth = 4 }: ClayProps) {
  const side = useFill(`${tone}-side`);
  const face = useFill(`${tone}-face`);
  const gloss = useFill('gloss');
  return (
    <G>
      <Path d={d} fill={side} transform={`translate(${depth * 0.75} ${depth})`} />
      <Path d={d} fill={side} transform={`translate(${depth * 0.38} ${depth * 0.5})`} />
      <Path d={d} fill={face} />
      <Path d={d} fill={gloss} />
    </G>
  );
}

function Shadow({ cx = 52, cy = 92, rx = 36 }: { cx?: number; cy?: number; rx?: number }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={6} fill={useFill('shadow')} />;
}

function Topics() {
  const paper = useFill('paper-face');
  return (
    <>
      <Shadow />
      <Clay d={roundRect(10, 12, 36, 36, 11)} />
      <Clay d={roundRect(52, 12, 36, 36, 11)} tone="pink" />
      <Clay d={roundRect(10, 52, 36, 36, 11)} tone="paper" />
      <Clay d={roundRect(52, 52, 36, 36, 11)} />
      <Path d={circle(70, 70, 7)} fill={paper} opacity={0.9} />
    </>
  );
}

function Chat() {
  const blue = '#3C86E6';
  return (
    <>
      <Shadow cx={46} />
      <Clay d={`${roundRect(34, 10, 58, 38, 15)}M74 46L86 58L66 47Z`} tone="paper" depth={3} />
      <Clay d={`${roundRect(8, 38, 62, 40, 17)}M22 76L14 90L36 77Z`} />
      <Path d={`${circle(26, 58, 4.5)}${circle(39, 58, 4.5)}${circle(52, 58, 4.5)}`} fill="#FFFFFF" />
      <Path d="M46 24H80M46 33H70" stroke={blue} strokeOpacity={0.35} strokeWidth={4} strokeLinecap="round" />
    </>
  );
}

function Book() {
  return (
    <>
      <Shadow cy={90} rx={42} />
      <Clay d="M50 38C38 31 20 31 6 36V84C20 79 38 79 50 86C62 79 80 79 94 84V36C80 31 62 31 50 38Z" depth={5} />
      <Clay d="M50 32C40 25 24 23 12 27V75C24 71 40 72 50 79Z" tone="paper" depth={2} />
      <Clay d="M50 32C60 25 76 23 88 27V75C76 71 60 72 50 79Z" tone="paper" depth={2} />
      <Path
        d="M20 38C28 36 36 37 42 40M20 48C28 46 36 47 42 50M20 58C28 56 36 57 42 60M58 40C64 37 72 36 80 38M58 50C64 47 72 46 80 48"
        stroke="#7FB2EA"
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      <Clay d="M66 25L76 24V50L71 45L66 50Z" tone="pink" depth={2} />
    </>
  );
}

function Game() {
  return (
    <>
      <Shadow cy={91} rx={40} />
      <Clay
        d="M30 32C18 32 11 43 8 58C5 74 11 84 21 84C29 84 33 76 39 71H61C67 76 71 84 79 84C89 84 95 74 92 58C89 43 82 32 70 32Z"
        depth={5}
      />
      <Path d="M27 46V64M18 55H36" stroke="#1E4FA8" strokeOpacity={0.55} strokeWidth={7} strokeLinecap="round" />
      <Path d="M27 45V63M18 54H36" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" />
      <Clay d={circle(72, 46, 5)} tone="pink" depth={2} />
      <Clay d={circle(82, 56, 5)} tone="paper" depth={2} />
      <Clay d={circle(62, 56, 5)} tone="paper" depth={2} />
      <Clay d={circle(72, 66, 5)} tone="pink" depth={2} />
    </>
  );
}

function Translate() {
  return (
    <>
      <Shadow cx={58} rx={38} />
      <G rotation={8} origin="68, 62">
        <Clay d={roundRect(44, 36, 48, 52, 12)} tone="paper" depth={4} />
        <SvgText x={74} y={78} fontSize={22} fontWeight="900" fill="#2F77E1" textAnchor="middle">
          En
        </SvgText>
      </G>
      <G rotation={-9} origin="30, 34">
        <Clay d={roundRect(6, 8, 46, 50, 12)} depth={5} />
        <SvgText x={29} y={42} fontSize={23} fontWeight="900" fill="#FFFFFF" textAnchor="middle">
          Uz
        </SvgText>
      </G>
    </>
  );
}

function Play() {
  return (
    <>
      <Shadow rx={34} />
      <Clay d={circle(48, 48, 38)} depth={6} />
      <Clay d={circle(48, 48, 26)} tone="paper" depth={3} />
      <Path d="M42 35L62 48L42 61Z" fill="#2F77E1" stroke="#2F77E1" strokeWidth={6} strokeLinejoin="round" />
    </>
  );
}

function Dice() {
  const top = useFill('dice-top');
  const left = useFill('dice-left');
  const right = useFill('dice-right');
  const join = { strokeWidth: 8, strokeLinejoin: 'round' as const };
  return (
    <>
      <Shadow cy={91} rx={34} />
      <Path d="M50 12L86 29L50 46L14 29Z" fill={top} stroke={top} {...join} />
      <Path d="M14 29L50 46V88L14 71Z" fill={left} stroke={left} {...join} />
      <Path d="M50 46L86 29V71L50 88Z" fill={right} stroke={right} {...join} />
      <Path d="M50 46L86 29M50 46L14 29M50 46V88" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.5} />
      <Ellipse cx={50} cy={29} rx={7} ry={3.8} fill="#FFFFFF" />
      <G fill="#FFFFFF">
        <Ellipse cx={24} cy={47} rx={3.6} ry={5} rotation={-20} origin="24, 47" />
        <Ellipse cx={40} cy={69} rx={3.6} ry={5} rotation={-20} origin="40, 69" />
      </G>
      <G fill="#DCEBFF">
        <Ellipse cx={60} cy={52} rx={3.4} ry={4.8} rotation={20} origin="60, 52" />
        <Ellipse cx={68} cy={58} rx={3.4} ry={4.8} rotation={20} origin="68, 58" />
        <Ellipse cx={76} cy={64} rx={3.4} ry={4.8} rotation={20} origin="76, 64" />
      </G>
    </>
  );
}

function Profile() {
  return (
    <>
      <Shadow cy={92} rx={36} />
      <Clay d="M16 88C16 66 31 55 50 55C69 55 84 66 84 88Z" depth={5} />
      <Clay d={circle(50, 32, 19)} tone="paper" depth={4} />
      <Path d="M38 66C44 70 56 70 62 66" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={4} strokeLinecap="round" fill="none" />
    </>
  );
}

/** The mistakes notebook: a ruled page with a pink "×" badge pinned to its corner. */
function Mistakes() {
  return (
    <>
      <Shadow cy={92} rx={34} />
      <Clay d={roundRect(14, 12, 58, 74, 12)} depth={5} />
      <Clay d={roundRect(22, 16, 46, 64, 9)} tone="paper" depth={2} />
      <Path d="M31 32H59M31 42H59M31 52H52M31 62H56" stroke="#7FB2EA" strokeWidth={3.5} strokeLinecap="round" />
      <Clay d={circle(72, 70, 16)} tone="pink" depth={4} />
      <Path d="M66 64L78 76M78 64L66 76" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" />
    </>
  );
}

function Mic() {
  return (
    <>
      <Shadow cy={93} rx={30} />
      <Clay d="M24 44C24 67 36 76 50 76C64 76 76 67 76 44H68C68 61 60 68 50 68C40 68 32 61 32 44Z" depth={4} />
      <Clay d={roundRect(46, 72, 8, 14, 3)} depth={3} />
      <Clay d={roundRect(32, 82, 36, 8, 4)} depth={4} />
      <Clay d={roundRect(35, 8, 30, 52, 15)} tone="pink" depth={5} />
      <Path d="M41 30H59M41 38H59M41 46H59" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" />
      <Ellipse cx={43} cy={18} rx={3.5} ry={5.5} fill="#FFFFFF" fillOpacity={0.8} />
    </>
  );
}

const ART: Record<ShortcutArtName, () => ReactNode> = {
  topics: Topics,
  chat: Chat,
  book: Book,
  game: Game,
  translate: Translate,
  play: Play,
  dice: Dice,
  profile: Profile,
  mic: Mic,
  mistakes: Mistakes,
};

export function ShortcutArt({ name, size }: { name: ShortcutArtName; size: number }) {
  const id = `art${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const Drawing = ART[name];

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        {(Object.keys(TONES) as Tone[]).map((tone) => [
          <LinearGradient key={`${tone}-face`} id={`${id}-${tone}-face`} x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor={TONES[tone].face[0]} />
            <Stop offset="0.45" stopColor={TONES[tone].face[1]} />
            <Stop offset="1" stopColor={TONES[tone].face[2]} />
          </LinearGradient>,
          <LinearGradient key={`${tone}-side`} id={`${id}-${tone}-side`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={TONES[tone].side[0]} />
            <Stop offset="1" stopColor={TONES[tone].side[1]} />
          </LinearGradient>,
        ])}
        <LinearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
          <Stop offset="0.42" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id={`${id}-shadow`} cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor="#000000" stopOpacity={0.4} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}-dice-top`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#CDE9FF" />
          <Stop offset="1" stopColor="#8CC6FF" />
        </LinearGradient>
        <LinearGradient id={`${id}-dice-left`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6BB4FA" />
          <Stop offset="1" stopColor="#3B87EA" />
        </LinearGradient>
        <LinearGradient id={`${id}-dice-right`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#3577DE" />
          <Stop offset="1" stopColor="#1C4FAA" />
        </LinearGradient>
      </Defs>
      <IdContext.Provider value={id}>
        <Drawing />
      </IdContext.Provider>
    </Svg>
  );
}
