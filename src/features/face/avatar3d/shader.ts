/**
 * The tutor's head, rendered per pixel on the GPU.
 *
 * The head is a true ellipsoid: every pixel casts an orthographic ray, intersects it with the rotated
 * ellipsoid and shades the hit with a soft "pearl" material (wrapped diffuse with a cool subsurface tint,
 * sky ambient, a brand-blue rim and a clear-coat highlight). Eyes, brows, cheeks and mouth are painted in
 * the head's own surface coordinates, so they wrap around the curvature and foreshorten as the head turns.
 *
 * Uniform order matters for the headless preview script; keep it in sync with `AvatarUniforms`.
 */
export const AVATAR_SKSL = `
uniform float2 res;
uniform float2 center;
uniform float radius;
uniform float3 rot;
uniform float2 squash;
uniform float2 eyeL;
uniform float2 eyeR;
uniform float2 gaze;
uniform float4 brow;
uniform float4 mouthA;
uniform float4 mouthB;
uniform float4 mood;
uniform float hover;

const float3 BRAND = float3(0.165, 0.671, 0.933);
const float3 INK = float3(0.071, 0.129, 0.239);

float3x3 rotation(float3 r) {
  float cy = cos(r.x); float sy = sin(r.x);
  float cp = cos(r.y); float sp = sin(r.y);
  float cr = cos(r.z); float sr = sin(r.z);
  float3x3 ry = float3x3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
  float3x3 rx = float3x3(1.0, 0.0, 0.0, 0.0, cp, sp, 0.0, -sp, cp);
  float3x3 rz = float3x3(cr, sr, 0.0, -sr, cr, 0.0, 0.0, 0.0, 1.0);
  return rz * rx * ry;
}

float sdEllipse(float2 p, float2 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 0.0001);
}

float cover(float d, float aa) {
  return clamp(0.5 - d / aa, 0.0, 1.0);
}

// Eye: x = coverage, y = signed distance, zw = position inside the eye normalised to -1..1.
float4 eyeShape(float2 uv, float2 c, float open, float smile) {
  float w = 0.135;
  float h = 0.18;
  float hh = max(h * open, 0.014);
  float2 p = uv - c;
  float tx = clamp(p.x / w, -1.0, 1.0);
  // A closing lid bends into a relaxed downward curve instead of a flat line.
  p.y += (1.0 - clamp(open, 0.0, 1.0)) * 0.03 * (1.0 - tx * tx);
  p.y -= smile * 0.028;
  float d = sdEllipse(p, float2(w, hh));
  // Smiling eyes: a wider ellipse rises from below and carves the eye into a "^" crescent.
  float cut = sdEllipse(p - float2(0.0, -hh * (3.3 - 2.25 * smile)), float2(w * 1.6, hh * 1.5));
  d = max(d, -cut);
  // Nearly closed, the thin ellipse is replaced by a clean lid line with rounded ends.
  float lineD = length(float2(p.x - clamp(p.x, -w * 0.92, w * 0.92), p.y)) - 0.013;
  d = mix(lineD, d, smoothstep(0.1, 0.3, open));
  return float4(0.0, d, p.x / w, p.y / hh);
}

float browShape(float2 uv, float2 c, float side, float lift, float tilt, float arch) {
  float bw = 0.13;
  float2 p = uv - c - float2(0.0, lift);
  float x = clamp(p.x, -bw, bw);
  float t = x / bw;
  float inner = t * side;
  float y = arch * (1.0 - t * t) + tilt * inner * 0.055;
  float thick = 0.024 * (1.0 - 0.45 * t * t);
  return length(float2(p.x - x, p.y - y)) - thick;
}

half4 main(float2 fragCoord) {
  float px = 1.0 / radius;
  float2 q = (fragCoord - center) * px;
  q.y = -q.y;

  // ---- ray / ellipsoid ------------------------------------------------------------------------
  float3x3 m = rotation(rot);
  float3x3 mt = float3x3(m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]);
  float3 e = float3(1.0 * squash.x, 0.95 * squash.y, 0.9);
  float3 lro = mt * float3(q, 4.0);
  float3 lrd = mt * float3(0.0, 0.0, -1.0);
  float3 o = lro / e;
  float3 dv = lrd / e;
  float A = dot(dv, dv);
  float B = dot(o, dv);
  float rr = sqrt(max(dot(o, o) - B * B / A, 0.0));
  float hit = B * B - A * (dot(o, o) - 1.0);
  float t = (-B - sqrt(max(hit, 0.0))) / A;
  float3 P = lro + t * lrd;
  float3 Nl = normalize(P / (e * e));
  float3 N = m * Nl;
  float edgeAA = px / min(e.x, e.y) * 1.3;
  float headCov = clamp((1.0 - rr) / edgeAA + 0.5, 0.0, 1.0);

  // ---- background: brand glow and a contact shadow on the "floor" -----------------------------
  float glowFall = exp(-max(rr - 1.0, 0.0) * 5.0);
  float ga = glowFall * mood.y * 0.42 * (1.0 - headCov);
  float2 sp = (fragCoord - float2(center.x, res.y * 0.5 + radius * 1.22)) / (radius * float2(0.72 - hover * 0.12, 0.11));
  float sa = exp(-dot(sp, sp) * 1.4) * (0.26 - hover * 0.1);
  float3 bgCol = float3(0.43, 0.76, 0.96) * ga + float3(0.05, 0.2, 0.33) * sa * (1.0 - ga);
  float bgA = ga + sa * (1.0 - ga);
  if (headCov <= 0.0) {
    return half4(half3(bgCol), half(bgA));
  }

  // ---- surface features (in the head's own front-facing coordinates) ----------------------------
  float2 uv = P.xy;
  float front = smoothstep(0.05, 0.35, Nl.z);
  float aa = px * 1.6;
  float2 g = gaze * float2(0.045, 0.035);

  float3 base = float3(0.968, 0.98, 0.996);
  float3 skinTint = mix(float3(1.0), float3(0.86, 0.93, 1.0), smoothstep(0.2, -1.0, Nl.y));
  float3 alb = base * skinTint;

  // Cheeks.
  float blush = (exp(-dot((uv - float2(-0.52, -0.16)) / 0.16, (uv - float2(-0.52, -0.16)) / 0.16))
              + exp(-dot((uv - float2(0.52, -0.16)) / 0.16, (uv - float2(0.52, -0.16)) / 0.16))) * mood.x * front;
  alb = mix(alb, float3(1.0, 0.62, 0.7), clamp(blush * 0.5, 0.0, 0.6));

  // Brows: x = lift, y = tilt (inner ends up), z = extra lift on the right brow, w = arch.
  float bl = browShape(uv, float2(-0.36, 0.385) + g * 0.4, 1.0, brow.x * 0.055, brow.y, brow.w);
  float br = browShape(uv, float2(0.36, 0.385) + g * 0.4, -1.0, (brow.x + brow.z) * 0.055, brow.y, brow.w);
  float browCov = max(cover(bl, aa), cover(br, aa)) * front * 0.9;
  alb = mix(alb, INK * 1.4, browCov);

  // Eyes.
  float4 el = eyeShape(uv, float2(-0.36, 0.11) + g, eyeL.x, eyeL.y);
  float4 er = eyeShape(uv, float2(0.36, 0.11) + g, eyeR.x, eyeR.y);
  float4 ev = el.y < er.y ? el : er;
  float eyeOpenHere = el.y < er.y ? eyeL.x : eyeR.x;
  float eyeSmileHere = el.y < er.y ? eyeL.y : eyeR.y;
  float eyeCov = cover(ev.y, aa) * front;
  float eyeAO = smoothstep(0.035, 0.0, ev.y) * 0.07 * front;

  // Mouth: mouthA = jaw, spread, round, smile; mouthB = teeth, tongue, shift, grin.
  float jaw = mouthA.x;
  float spread = mouthA.y;
  float rnd = mouthA.z;
  float smile = mouthA.w;
  float W = 0.205 * (1.0 + 0.3 * spread - 0.45 * rnd) * (1.0 + 0.14 * max(smile, 0.0)) * (1.0 - 0.1 * jaw);
  float2 mc = float2(mouthB.z * 0.06, -0.36 - jaw * 0.03);
  float2 mp = uv - mc;
  float tx = clamp(mp.x / W, -1.0, 1.0);
  float bow = 1.0 - tx * tx;
  float ex = mix(0.72, 0.45, rnd);
  float shape = pow(max(bow, 0.0), ex);
  float corner = smile * 0.085;
  float open = jaw * 0.5 + mouthB.w * 0.14 + rnd * jaw * 0.05;
  float yu = corner * tx * tx + open * 0.16 * shape - smile * 0.012 * bow;
  float yl = corner * tx * tx - open * 0.84 * shape - smile * 0.012 * bow - mouthB.w * 0.02 * shape;
  float dIn = max(mp.y - yu, yl - mp.y);
  float dSide = abs(mp.x) - W;
  float cavity = max(dIn, dSide * 0.7);
  float2 onLine = float2(tx * W, corner * tx * tx - smile * 0.012 * bow);
  float lineD = length(mp - onLine) - 0.016 * (1.0 - 0.45 * tx * tx);
  float mouthD = min(cavity, lineD);
  float mouthCov = cover(mouthD, aa) * front;
  float cavCov = cover(cavity, aa) * front;
  float mouthAO = smoothstep(0.045, 0.0, mouthD) * 0.1 * front;

  // ---- lighting -------------------------------------------------------------------------------
  float3 L = normalize(float3(-0.48, 0.72, 0.62));
  float3 V = float3(0.0, 0.0, 1.0);
  float3 H = normalize(L + V);
  float ndl = dot(N, L);
  float wrap = clamp((ndl + 0.5) / 1.5, 0.0, 1.0);
  float3 sss = float3(0.6, 0.78, 0.97);
  float3 diffuse = mix(sss * 0.76, float3(1.05), smoothstep(0.0, 1.0, wrap));
  float sky = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
  float bounce = clamp(-N.y, 0.0, 1.0);
  float fres = pow(1.0 - clamp(N.z, 0.0, 1.0), 2.6);

  float3 col = alb * diffuse;
  col += float3(0.03, 0.045, 0.07) * sky;
  col = mix(col, float3(0.62, 0.84, 1.0), bounce * 0.2);
  col *= 1.0 - eyeAO - mouthAO;

  // Eye bead: a dark glossy dome with its own normal, a blue under-glow and two catchlights.
  float2 en = clamp(ev.zw, -1.0, 1.0);
  float ez = sqrt(max(1.0 - dot(en, en) * 0.85, 0.0));
  float3 eyeN = normalize(m * normalize(float3(en.x * 0.55, en.y * 0.5, ez) + Nl * 0.6));
  float3 eyeCol = mix(float3(0.05, 0.09, 0.17), float3(0.12, 0.36, 0.62), smoothstep(-0.2, -1.0, en.y) * 0.85);
  eyeCol *= 0.75 + 0.35 * clamp(dot(eyeN, L) * 0.5 + 0.5, 0.0, 1.0);
  float eyeSpec = pow(max(dot(eyeN, H), 0.0), 60.0) * 0.7;
  float catchVis = clamp(eyeOpenHere * 1.4 - 0.4, 0.0, 1.0) * (1.0 - eyeSmileHere);
  float2 cl = ev.zw - float2(0.3, 0.42) - gaze * float2(0.1, 0.06);
  float c1 = cover((length(cl * float2(1.0, 0.75)) - 0.27) * 0.12, aa);
  float2 cl2 = ev.zw - float2(-0.28, -0.42);
  float c2 = cover((length(cl2) - 0.12) * 0.12, aa);
  eyeCol += float3(eyeSpec);
  eyeCol = mix(eyeCol, float3(1.0), (c1 * 0.95 + c2 * 0.55) * catchVis);
  col = mix(col, eyeCol, eyeCov);

  // Mouth: lip seam / rim in ink, a dark warm cavity, upper teeth and a tongue.
  float depth = clamp((mp.y - yl) / max(yu - yl, 0.001), 0.0, 1.0);
  float3 cavCol = mix(float3(0.36, 0.08, 0.15), float3(0.16, 0.03, 0.08), depth);
  float teethH = (0.012 + 0.05 * mouthB.x) * clamp(open * 5.0, 0.0, 1.0);
  float teeth = cover(-(mp.y - (yu - teethH)), aa) * cover(abs(mp.x) - W * 0.82, aa);
  float3 teethCol = mix(float3(0.82, 0.86, 0.93), float3(1.0), smoothstep(yu - teethH, yu, mp.y));
  cavCol = mix(cavCol, teethCol, teeth);
  float2 tp = (mp - float2(0.0, yl + 0.035 + mouthB.y * open * 0.25)) / float2(W * 0.62, 0.075);
  float tongue = cover((length(tp) - 1.0) * 0.06, aa) * (1.0 - teeth);
  float3 tongueCol = mix(float3(0.98, 0.45, 0.55), float3(1.0, 0.62, 0.68), smoothstep(-1.0, 0.6, -tp.y));
  cavCol = mix(cavCol, tongueCol, tongue);
  float rim = cover(cavity + 0.014, aa);
  float3 mouthCol = mix(INK * 1.2, cavCol, rim * cavCov);
  col = mix(col, mouthCol, mouthCov);

  // Rim light, clear-coat and a broad sheen. Features stay matte except the eye beads.
  float skinOnly = 1.0 - max(max(eyeCov, mouthCov), browCov);
  col += BRAND * fres * (0.45 + mood.z) * 0.8;
  float spec = pow(max(dot(N, H), 0.0), 140.0) * 0.85 + pow(max(dot(N, H), 0.0), 14.0) * 0.08;
  col += float3(spec) * skinOnly;
  float softHi = exp(-dot((Nl.xy - float2(-0.42, 0.5)) / float2(0.32, 0.22), (Nl.xy - float2(-0.42, 0.5)) / float2(0.32, 0.22)));
  col += float3(0.08) * softHi * skinOnly;

  col = clamp(col, 0.0, 1.0);
  float3 outCol = col * headCov + bgCol * (1.0 - headCov);
  float outA = headCov + bgA * (1.0 - headCov);
  return half4(half3(outCol), half(outA));
}
`;

/** Values the shader reads each frame, in declaration order. */
export interface AvatarUniforms {
  res: readonly [number, number];
  center: readonly [number, number];
  radius: number;
  /** yaw (turn right), pitch (nod down), roll (tilt left), in radians. */
  rot: readonly [number, number, number];
  squash: readonly [number, number];
  /** open, smile-crescent for each eye. */
  eyeL: readonly [number, number];
  eyeR: readonly [number, number];
  gaze: readonly [number, number];
  /** lift, tilt, right-brow extra lift, arch. */
  brow: readonly [number, number, number, number];
  /** jaw, spread, round, smile. */
  mouthA: readonly [number, number, number, number];
  /** teeth, tongue, sideways shift, grin. */
  mouthB: readonly [number, number, number, number];
  /** blush, glow, rim boost, unused. */
  mood: readonly [number, number, number, number];
  hover: number;
}
