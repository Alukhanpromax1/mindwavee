// Shared shader system. Every world surface uses the same lighting model, the same
// "dormant ↔ alive" colour response (driven by per-region vitality) and the same fog,
// so the whole world reacts coherently as the garden is restored.
import * as THREE from 'three';
import { REGION_COUNT } from './layout.js';

export const R_ALWAYS = REGION_COUNT;

export const shared = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.32, 0.62, -0.72).normalize() },
  uSunColor: { value: new THREE.Color('#fff0d2') },
  uSkyColor: { value: new THREE.Color('#d9f0e6') },
  uGroundColor: { value: new THREE.Color('#7f9a5a') },
  // slot REGION_COUNT (7) is an "always alive" slot used by the player and restored hero objects
  uVital: { value: [...new Array(REGION_COUNT).fill(0.15), 1] },
  uPulse: { value: new Array(REGION_COUNT + 1).fill(0) },
  uWind: { value: 1 },
  uNight: { value: 0 },
  uPlayerPos: { value: new THREE.Vector3() },
};

export const COMMON_GLSL = /* glsl */ `
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyColor;
uniform vec3 uGroundColor;
uniform float uVital[${REGION_COUNT + 1}];
uniform float uPulse[${REGION_COUNT + 1}];
uniform float uWind;
uniform float uNight;
uniform vec3 uPlayerPos;

vec3 mwLight(vec3 albedo, vec3 n, float wrap) {
  float ndl = max((dot(n, uSunDir) + wrap) / (1.0 + wrap), 0.0);
  float hemi = n.y * 0.5 + 0.5;
  vec3 amb = mix(uGroundColor, uSkyColor, hemi);
  vec3 lit = albedo * (amb * 0.66 + uSunColor * ndl * 0.8);
  return mix(lit, lit * vec3(0.36, 0.47, 0.68), uNight * 0.78);
}
vec3 mwDormant(vec3 c, float v) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 grey = vec3(l) * vec3(0.9, 0.93, 0.95) * 0.82 + vec3(0.025, 0.03, 0.028);
  return mix(grey, c, 0.16 + 0.84 * clamp(v, 0.0, 1.0));
}
float mwHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float mwNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mwHash(i), mwHash(i + vec2(1.0, 0.0)), u.x), mix(mwHash(i + vec2(0.0, 1.0)), mwHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
`;

const FOG_UNIFORMS = THREE.UniformsLib.fog;

function makeUniforms(extra) {
  return { ...THREE.UniformsUtils.clone(FOG_UNIFORMS), ...shared, ...extra };
}

// ------------------------------------------------------------------ Terrain
export function createTerrainMaterial() {
  return new THREE.ShaderMaterial({
    fog: true,
    side: THREE.DoubleSide,
    uniforms: makeUniforms({
      uSand: { value: new THREE.Color('#eadfb4') },
      uDeep: { value: new THREE.Color('#2f7f78') },
      uPathColor: { value: new THREE.Color('#f7efd6') },
    }),
    vertexShader: /* glsl */ `
      ${COMMON_GLSL}
      attribute vec3 aColor;
      attribute vec4 aW0;
      attribute vec3 aW1;
      attribute float aPath;
      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vWorld;
      varying float vVital;
      varying float vPulse;
      varying float vPath;
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vNormal = normal;
        vColor = aColor;
        vPath = aPath;
        vVital = aW0.x * uVital[0] + aW0.y * uVital[1] + aW0.z * uVital[2] + aW0.w * uVital[3]
               + aW1.x * uVital[4] + aW1.y * uVital[5] + aW1.z * uVital[6];
        vPulse = aW0.x * uPulse[0] + aW0.y * uPulse[1] + aW0.z * uPulse[2] + aW0.w * uPulse[3]
               + aW1.x * uPulse[4] + aW1.y * uPulse[5] + aW1.z * uPulse[6];
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_GLSL}
      uniform vec3 uSand;
      uniform vec3 uDeep;
      uniform vec3 uPathColor;
      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vWorld;
      varying float vVital;
      varying float vPulse;
      varying float vPath;
      #include <fog_pars_fragment>
      void main() {
        vec3 n = normalize(vNormal);
        vec2 p = vWorld.xz;
        float dn = mwNoise(p * 0.21) * 0.55 + mwNoise(p * 1.3) * 0.3 + mwNoise(p * 5.0) * 0.15;
        vec3 col = vColor * (0.86 + dn * 0.26);
        col = mwDormant(col, vVital);
        float y = vWorld.y;
        float shore = smoothstep(0.85, 0.12, y + (dn - 0.5) * 0.35);
        col = mix(col, uSand, shore * 0.75);
        col = mix(col, uDeep, smoothstep(-0.1, -1.7, y) * 0.85);
        // luminous cream paths, brighter as the garden comes alive
        float pth = vPath * (0.75 + 0.25 * mwNoise(p * 0.8));
        col = mix(col, uPathColor, pth * 0.82);
        vec3 lit = mwLight(col, n, 0.2);
        lit += uPathColor * pth * (0.06 + 0.22 * vVital);
        lit += vec3(0.95, 0.88, 0.55) * vPulse * 0.09;
        gl_FragColor = vec4(lit, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

// ------------------------------------------------------------------ Organic (vegetation, landmarks)
/**
 * opts.instanced  — uses per-instance attributes aInst (region, phase, glowBoost, -) & aTint
 * opts.grass      — distance fade + player push
 * opts.pulse      — light pulses travelling along aDist (neural pathways)
 * opts.region     — region index for non-instanced meshes
 */
export function createOrganicMaterial(opts = {}) {
  const defines = {};
  if (opts.instanced) defines.INSTANCED_VEG = '';
  if (opts.grass) defines.GRASS = '';
  if (opts.pulse) defines.PULSE = '';
  const mat = new THREE.ShaderMaterial({
    fog: true,
    side: opts.side ?? THREE.DoubleSide,
    defines,
    transparent: !!opts.transparent,
    uniforms: makeUniforms({
      uRegion: { value: opts.region ?? 6 },
      uTint: { value: new THREE.Color(opts.tint ?? '#ffffff') },
      uPhase: { value: opts.phase ?? 0 },
      uSwayAmp: { value: opts.sway ?? 1 },
      uFadeFar: { value: opts.fadeFar ?? 60 },
      uGlowAmt: { value: opts.glow ?? 1 },
      uGlowColor: { value: new THREE.Color(opts.glowColor ?? '#fff3d0') },
      uPulseAmt: { value: opts.pulseAmt ?? 1 },
      uOpacity: { value: opts.opacity ?? 1 },
    }),
    vertexShader: /* glsl */ `
      ${COMMON_GLSL}
      attribute vec3 aColor;
      attribute float aGlow;
      attribute float aSway;
      attribute float aTintMask;
      attribute float aDist;
      #ifdef INSTANCED_VEG
        attribute vec4 aInst;
        attribute vec3 aTint;
      #endif
      uniform float uRegion;
      uniform vec3 uTint;
      uniform float uPhase;
      uniform float uSwayAmp;
      uniform float uFadeFar;
      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vWorld;
      varying float vGlow;
      varying float vVital;
      varying float vPulse;
      varying float vDist;
      varying float vBoost;
      #include <fog_pars_vertex>
      void main() {
        #ifdef INSTANCED_VEG
          mat4 im = instanceMatrix;
          float region = aInst.x;
          float phase = aInst.y;
          vBoost = aInst.z;
          vec3 tint = aTint;
        #else
          mat4 im = mat4(1.0);
          float region = uRegion;
          float phase = uPhase;
          vBoost = 0.0;
          vec3 tint = uTint;
        #endif
        int ri = int(region + 0.5);
        vVital = uVital[ri];
        vPulse = uPulse[ri];
        vec4 wp = modelMatrix * im * vec4(position, 1.0);
        vec3 origin = (modelMatrix * im * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float scl = length((modelMatrix * im)[1].xyz);
        float sw = aSway * aSway;
        float t = uTime * 1.05 + phase;
        vec2 wind = vec2(sin(t + wp.x * 0.05 + wp.z * 0.03) + 0.35 * sin(t * 2.3 + wp.z * 0.2),
                         0.55 * cos(t * 0.8 + wp.z * 0.05 + wp.x * 0.02));
        wp.xz += wind * sw * uSwayAmp * uWind * (0.12 + 0.05 * scl);
        #ifdef GRASS
          vec2 toP = wp.xz - uPlayerPos.xz;
          float dP = length(toP);
          wp.xz += (toP / max(dP, 0.001)) * sw * smoothstep(1.8, 0.0, dP) * 0.55;
          float dc = distance(origin.xz, cameraPosition.xz);
          float fade = smoothstep(uFadeFar, uFadeFar * 0.62, dc);
          wp.xyz = origin + (wp.xyz - origin) * fade;
        #endif
        vWorld = wp.xyz;
        vNormal = normalize(mat3(modelMatrix) * mat3(im) * normal);
        vColor = mix(aColor, aColor * tint, aTintMask);
        vGlow = aGlow;
        vDist = aDist;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_GLSL}
      uniform float uGlowAmt;
      uniform vec3 uGlowColor;
      uniform float uPulseAmt;
      uniform float uOpacity;
      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vWorld;
      varying float vGlow;
      varying float vVital;
      varying float vPulse;
      varying float vDist;
      varying float vBoost;
      #include <fog_pars_fragment>
      void main() {
        vec3 n = normalize(vNormal);
        if (!gl_FrontFacing) n = -n;
        vec3 col = mwDormant(vColor, vVital);
        vec3 lit = mwLight(col, n, 0.45);
        vec3 V = normalize(cameraPosition - vWorld);
        float back = pow(max(dot(V, -uSunDir), 0.0), 3.0);
        lit += col * uSunColor * back * 0.28 * (1.0 - vGlow);
        float g = vGlow * (0.12 + 0.88 * vVital) * uGlowAmt * (1.0 + vBoost);
        g += vGlow * vPulse * 1.4;
        #ifdef PULSE
          float band = smoothstep(0.82, 1.0, sin(vDist * 0.22 - uTime * 2.0) * 0.5 + 0.5);
          g += band * uPulseAmt * (0.25 + 0.75 * vVital) * 0.9;
        #endif
        lit += mix(uGlowColor, col + 0.4, 0.3) * g;
        gl_FragColor = vec4(lit, uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
  return mat;
}

// ------------------------------------------------------------------ Glow sprites
let glowTexture = null;
export function getGlowTexture() {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,252,235,0.85)');
  grd.addColorStop(0.45, 'rgba(255,245,210,0.28)');
  grd.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(c);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

export function createGlowSprite(color = '#fff3c8', scale = 4, opacity = 0.9) {
  const mat = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(scale);
  return s;
}

/** Soft additive points material (for particles). Uses per-point size/alpha attributes. */
export function createPointsMaterial({ color = '#fff4cf', size = 1, fogFade = true } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uSize: { value: size },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uTime: shared.uTime,
      uFogFade: { value: fogFade ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aAlpha;
      uniform float uSize;
      uniform float uPixelRatio;
      varying float vAlpha;
      uniform float uFogFade;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        gl_PointSize = uSize * aSize * uPixelRatio * (220.0 / max(d, 0.5));
        vAlpha = aAlpha * mix(1.0, smoothstep(260.0, 80.0, d), uFogFade);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = length(c) * 2.0;
        float a = smoothstep(1.0, 0.0, r);
        a = a * a;
        gl_FragColor = vec4(uColor * (0.6 + 0.4 * a), a * vAlpha);
        #include <colorspace_fragment>
      }
    `,
  });
}
