import * as THREE from 'three';

const VARYINGS_GLSL = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
`;

// Simplex 2D noise — Ian McEwan, Ashima Arts (MIT). Inlined to avoid a GPU
// noise asset and to stay in lockstep with the CPU heightmap's seedability.
const NOISE_GLSL = /* glsl */ `
  vec3 _permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v   - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = _permute(_permute(i.y + vec3(0.0, i1.y, 1.0))
                              + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x  = 2.0 * fract(p * C.www) - 1.0;
    vec3 h  = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x   + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * snoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
`;

const TRACK_COLOR_GLSL = /* glsl */ `
  vec3 trackColor(vec3 wp) {
    vec3 a = vec3(0.72, 0.62, 0.40);
    vec3 b = vec3(0.88, 0.80, 0.58);
    vec3 base = mix(a, b, 0.5 + 0.5 * fbm(wp.xz * 0.10 + 99.7));
    return base * (0.92 + 0.08 * snoise(wp.xz * 1.1 + 22.3));
  }
`;

const TERRAIN_COLOR_GLSL = /* glsl */ `
  vec3 terrainColor(vec3 wp, vec3 wn) {
    float slope = 1.0 - clamp(dot(normalize(wn), vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
    float h = wp.y;

    float toDirt = smoothstep(-3.0, 1.0, h);
    float toRock = smoothstep(3.0, 6.0, h);
    float slopeRock = smoothstep(0.40, 0.70, slope);

    float wGrass = (1.0 - toDirt) * (1.0 - slopeRock);
    float wDirt  = toDirt * (1.0 - toRock) * (1.0 - slopeRock);
    float wRock  = toRock * (1.0 - slopeRock) + slopeRock;

    vec3 grassA = vec3(0.22, 0.38, 0.14);
    vec3 grassB = vec3(0.38, 0.56, 0.22);
    vec3 grass  = mix(grassA, grassB, 0.5 + 0.5 * fbm(wp.xz * 0.05));
    grass *= 0.88 + 0.12 * snoise(wp.xz * 0.7);

    vec3 dirtA = vec3(0.30, 0.20, 0.11);
    vec3 dirtB = vec3(0.48, 0.34, 0.19);
    vec3 dirt  = mix(dirtA, dirtB, 0.5 + 0.5 * fbm(wp.xz * 0.08 + 12.3));
    dirt *= 0.92 + 0.08 * snoise(wp.xz * 0.9 + 4.7);

    vec3 rockA = vec3(0.34, 0.32, 0.30);
    vec3 rockB = vec3(0.58, 0.55, 0.51);
    vec3 rock  = mix(rockA, rockB, 0.5 + 0.5 * fbm(wp.xz * 0.12 + 31.7));
    rock *= 0.86 + 0.14 * snoise(wp.xz * 1.2 + 9.1);

    return grass * wGrass + dirt * wDirt + rock * wRock;
  }
`;

export interface TerrainMaterialOptions {
    trackMask: THREE.DataTexture;
    terrainSize: number;
    trackWidth: number;
    trackFeather: number;
}

const TRACK_UNIFORMS_GLSL = /* glsl */ `
  uniform sampler2D uTrackMask;
  uniform float uTerrainSize;
  uniform float uTrackWidth;
  uniform float uTrackFeather;
`;

export function createTerrainMaterial(options: TerrainMaterialOptions): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.95,
        metalness: 0,
    });

    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTrackMask = { value: options.trackMask };
        shader.uniforms.uTerrainSize = { value: options.terrainSize };
        shader.uniforms.uTrackWidth = { value: options.trackWidth };
        shader.uniforms.uTrackFeather = { value: options.trackFeather };

        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>\n${VARYINGS_GLSL}`)
            .replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
         vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
         vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`,
            );

        shader.fragmentShader = shader.fragmentShader
            .replace(
                '#include <common>',
                `#include <common>\n${VARYINGS_GLSL}\n${TRACK_UNIFORMS_GLSL}\n${NOISE_GLSL}\n${TERRAIN_COLOR_GLSL}\n${TRACK_COLOR_GLSL}`,
            )
            .replace(
                '#include <map_fragment>',
                `#include <map_fragment>
         vec3 baseColor = terrainColor(vWorldPos, vWorldNormal);
         vec2 trackUV = vWorldPos.xz / uTerrainSize + 0.5;
         float trackDist = texture2D(uTrackMask, trackUV).r;
         float trackW = 1.0 - smoothstep(uTrackWidth * 0.5, uTrackWidth * 0.5 + uTrackFeather, trackDist);
         diffuseColor.rgb = mix(baseColor, trackColor(vWorldPos), trackW);`,
            );
    };

    return material;
}
