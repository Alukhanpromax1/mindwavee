// Sky dome, water, layered distant landscapes and ambient floating particles.
import * as THREE from 'three';
import { shared, COMMON_GLSL, createPointsMaterial } from './materials.js';
import { noiseB, noiseC } from './layout.js';

export const PALETTE = {
  skyTop: new THREE.Color('#9fcbd3'),
  horizon: new THREE.Color('#f3f1dc'),
  sunGlow: new THREE.Color('#fff1c0'),
  nightTop: new THREE.Color('#13324a'),
  nightHorizon: new THREE.Color('#3f6f7c'),
  fog: new THREE.Color('#eceed8'),
  fogNight: new THREE.Color('#47707a'),
};

// ------------------------------------------------------------------ Sky
export function createSky() {
  const geo = new THREE.SphereGeometry(4000, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    fog: false,
    uniforms: {
      ...shared,
      uTop: { value: PALETTE.skyTop.clone() },
      uHorizon: { value: PALETTE.fog.clone() },
      uSunGlow: { value: PALETTE.sunGlow.clone() },
      uNightTop: { value: PALETTE.nightTop.clone() },
      uNightHorizon: { value: PALETTE.fogNight.clone() },
      uLines: { value: 0.35 },
      uRestored: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDir = wp.xyz - cameraPosition;
        gl_Position = projectionMatrix * viewMatrix * wp;
        gl_Position.z = gl_Position.w; // keep at far plane
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_GLSL}
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uSunGlow;
      uniform vec3 uNightTop;
      uniform vec3 uNightHorizon;
      uniform float uLines;
      uniform float uRestored;
      varying vec3 vDir;
      float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float n3(vec3 p) {
        vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      void main() {
        vec3 dir = normalize(vDir);
        float y = dir.y;
        vec3 top = mix(uTop, uNightTop, uNight);
        vec3 hor = mix(uHorizon, uNightHorizon, uNight);
        vec3 col = mix(hor, top, pow(smoothstep(-0.02, 0.9, y), 0.55));
        float sd = max(dot(dir, uSunDir), 0.0);
        col += uSunGlow * (pow(sd, 5.0) * 0.32 + pow(sd, 48.0) * 0.45 + smoothstep(0.9985, 0.9995, sd) * 0.6) * (1.0 - uNight);
        // soft clouds
        vec2 cp = dir.xz / (y + 0.18) * 1.4 + vec2(uTime * 0.004, 0.0);
        float cl = n3(vec3(cp, 1.0)) * 0.6 + n3(vec3(cp * 2.3, 2.0)) * 0.3 + n3(vec3(cp * 5.0, 3.0)) * 0.1;
        cl = smoothstep(0.55, 0.85, cl) * smoothstep(0.02, 0.25, y) * (1.0 - uNight * 0.7);
        col = mix(col, vec3(1.0, 0.99, 0.95), cl * 0.45);
        // flowing luminous contour lines — the garden's "rhythm", brighter as it is restored
        vec3 q = dir * 2.2 + vec3(0.0, uTime * 0.006, uTime * 0.004);
        float field = n3(q) * 0.65 + n3(q * 2.1 + 5.0) * 0.35;
        float f = field * 7.0;
        float l = abs(fract(f) - 0.5);
        float w = fwidth(f) * 1.3;
        float line = 1.0 - smoothstep(0.0, w + 0.004, l);
        float band = smoothstep(0.02, 0.18, y) * (1.0 - smoothstep(0.55, 0.95, y));
        col += vec3(1.0, 0.99, 0.94) * line * band * uLines * (0.55 + 0.45 * uRestored);
        // stars at night
        vec3 sp = floor(dir * 220.0);
        float st = step(0.9965, h3(sp)) * smoothstep(0.05, 0.4, y);
        float tw = 0.65 + 0.35 * sin(uTime * 0.6 + h3(sp + 3.0) * 30.0);
        col += vec3(0.9, 0.97, 1.0) * st * tw * uNight * 0.9;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  mesh.name = 'sky';
  return mesh;
}

// ------------------------------------------------------------------ Water
export function createWater() {
  const geo = new THREE.PlaneGeometry(1600, 1600, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    fog: true,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
      ...shared,
      uShallow: { value: new THREE.Color('#7fd3c6') },
      uDeep: { value: new THREE.Color('#2b8a86') },
      uSkyRefl: { value: new THREE.Color('#e9f6ee') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      ${COMMON_GLSL}
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      uniform vec3 uSkyRefl;
      varying vec3 vWorld;
      #include <fog_pars_fragment>
      void main() {
        vec2 p = vWorld.xz;
        float t = uTime;
        float dx = sin(p.x * 0.35 + t * 0.9) * 0.5 + sin(p.x * 0.9 + p.y * 0.4 + t * 1.4) * 0.3 + (mwNoise(p * 0.6 + t * 0.25) - 0.5) * 0.6;
        float dz = cos(p.y * 0.3 + t * 0.7) * 0.5 + sin(p.y * 0.8 - p.x * 0.3 + t * 1.1) * 0.3 + (mwNoise(p * 0.6 - t * 0.2 + 7.0) - 0.5) * 0.6;
        vec3 n = normalize(vec3(dx * 0.09, 1.0, dz * 0.09));
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(V, n), 0.0), 3.0);
        float vit = (uVital[0] + uVital[1] + uVital[2] + uVital[3] + uVital[4]) / 5.0;
        vec3 base = mix(uDeep, uShallow, 0.45 + 0.25 * vit);
        vec3 col = mix(base, uSkyRefl, 0.2 + 0.65 * fres);
        vec3 R = reflect(-V, n);
        float spec = pow(max(dot(R, uSunDir), 0.0), 140.0);
        col += uSunColor * spec * 1.2;
        // slow drifting light motes on the surface (no flashing: gentle sine fade)
        vec2 cell = floor(p * 0.5);
        float h = mwHash(cell);
        vec2 fc = fract(p * 0.5) - 0.5 - (vec2(mwHash(cell + 1.7), mwHash(cell + 4.1)) - 0.5) * 0.6;
        float mote = smoothstep(0.08, 0.0, length(fc)) * step(0.82, h) * (0.5 + 0.5 * sin(t * 0.8 + h * 40.0));
        col += vec3(1.0, 0.97, 0.8) * mote * (0.25 + 0.75 * vit) * 0.8;
        col = mix(col, col * vec3(0.36, 0.47, 0.68), uNight * 0.75);
        gl_FragColor = vec4(col, 0.88);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0;
  mesh.renderOrder = 1;
  mesh.name = 'water';
  return mesh;
}

// ------------------------------------------------------------------ Distant layered landscapes
export function createBackdrop() {
  const group = new THREE.Group();
  group.name = 'backdrop';
  const layers = [
    { r: 1500, h: 110, base: -40, color: '#7fae8e', haze: 0.45, freq: 3 },
    { r: 2100, h: 210, base: -40, color: '#93b8a3', haze: 0.62, freq: 2.2 },
    { r: 2800, h: 330, base: -40, color: '#b7cbbb', haze: 0.78, freq: 1.5 },
  ];
  layers.forEach((L, li) => {
    const seg = 256;
    const pos = [];
    const t = [];
    const idx = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const nx = Math.cos(a) * L.freq;
      const nz = Math.sin(a) * L.freq;
      let h = (noiseB(nx + li * 10, nz) * 0.5 + 0.5) * 0.7 + (noiseC(nx * 3.1, nz * 3.1 + li) * 0.5 + 0.5) * 0.3;
      h = Math.pow(h, 1.4) * L.h + 20;
      const x = Math.cos(a) * L.r;
      const z = Math.sin(a) * L.r;
      pos.push(x, L.base, z, x, h, z);
      t.push(0, 1);
      if (i < seg) {
        const k = i * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
    g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      toneMapped: false,
      depthWrite: false,
      uniforms: {
        ...shared,
        uColor: { value: new THREE.Color(L.color) },
        uHaze: { value: L.haze },
        uHorizon: { value: PALETTE.fog.clone() },
        uNightHorizon: { value: PALETTE.fogNight.clone() },
      },
      vertexShader: /* glsl */ `
        attribute float aT;
        varying float vT;
        void main() {
          vT = aT;
          vec4 p = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * p;
          gl_Position.z = gl_Position.w * 0.99999;
        }
      `,
      fragmentShader: /* glsl */ `
        ${COMMON_GLSL}
        uniform vec3 uColor;
        uniform float uHaze;
        uniform vec3 uHorizon;
        uniform vec3 uNightHorizon;
        varying float vT;
        void main() {
          vec3 hor = mix(uHorizon, uNightHorizon, uNight);
          float vit = (uVital[0] + uVital[1] + uVital[2] + uVital[3] + uVital[4]) / 5.0;
          vec3 c = mix(uColor * (0.9 + 0.12 * vit), hor, uHaze + (1.0 - vT) * 0.35);
          c = mix(c, c * vec3(0.5, 0.6, 0.78), uNight * 0.6);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });
    const mesh = new THREE.Mesh(g, m);
    mesh.renderOrder = -9 + li * -0.1;
    mesh.frustumCulled = false;
    group.add(mesh);
  });
  return group;
}

// ------------------------------------------------------------------ Ambient floating light motes
export function createMotes(count = 500) {
  const size = 90;
  const pos = new Float32Array(count * 3);
  const sz = new Float32Array(count);
  const al = new Float32Array(count);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * size;
    pos[i * 3 + 1] = Math.random() * 28;
    pos[i * 3 + 2] = (Math.random() - 0.5) * size;
    sz[i] = 0.35 + Math.random() * 0.75;
    al[i] = 0.3 + Math.random() * 0.6;
    seed[i] = Math.random() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = createPointsMaterial({ color: '#fff3c9', size: 0.55 });
  mat.uniforms.uCenter = { value: new THREE.Vector3() };
  mat.uniforms.uBox = { value: size };
  mat.uniforms.uSpeed = { value: 1 };
  mat.vertexShader = /* glsl */ `
    attribute float aSize;
    attribute float aAlpha;
    attribute float aSeed;
    uniform float uSize;
    uniform float uPixelRatio;
    uniform float uTime;
    uniform vec3 uCenter;
    uniform float uBox;
    uniform float uSpeed;
    varying float vAlpha;
    void main() {
      vec3 p = position;
      float t = uTime * uSpeed;
      p.x += sin(t * 0.13 + aSeed) * 3.0 + t * 0.4;
      p.z += cos(t * 0.11 + aSeed * 1.3) * 3.0 + t * 0.15;
      p.y += sin(t * 0.21 + aSeed * 2.0) * 1.2;
      vec3 rel = mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5;
      vec3 wp = uCenter + rel;
      wp.y = position.y + uCenter.y - 6.0 + sin(t * 0.21 + aSeed * 2.0) * 1.2;
      vec4 mv = viewMatrix * vec4(wp, 1.0);
      gl_Position = projectionMatrix * mv;
      float d = -mv.z;
      gl_PointSize = uSize * aSize * uPixelRatio * (220.0 / max(d, 0.5));
      float edge = 1.0 - smoothstep(uBox * 0.3, uBox * 0.5, length(rel.xz));
      vAlpha = aAlpha * edge * (0.6 + 0.4 * sin(uTime * 0.7 + aSeed * 3.0));
    }
  `;
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.name = 'motes';
  return pts;
}
