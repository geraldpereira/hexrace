import * as THREE from 'three';
import { SURFACES } from './surfaces';

export interface TerrainMaterialOptions {
    surfaceMap: THREE.DataTexture;
}

const SURFACE_COUNT = String(SURFACES.length);
const LAST_SURFACE = String(SURFACES.length - 1);

const GLSL_DECL = /* glsl */ `
  varying vec2 vSurfaceUv;
  uniform sampler2D uSurfaceMap;
  uniform vec3 uSurfaceColors[${SURFACE_COUNT}];
`;

/** Flat colour per surface id, read from the shared surface map texture. */
export function createTerrainMaterial(options: TerrainMaterialOptions): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.95,
        metalness: 0,
    });

    material.onBeforeCompile = (shader) => {
        shader.uniforms.uSurfaceMap = { value: options.surfaceMap };
        shader.uniforms.uSurfaceColors = {
            value: SURFACES.map((s) => new THREE.Color(s.color)),
        };

        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>\n${GLSL_DECL}`)
            .replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
         vSurfaceUv = uv;`,
            );

        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>\n${GLSL_DECL}`)
            .replace(
                '#include <map_fragment>',
                `#include <map_fragment>
         int surfaceId = int(texture2D(uSurfaceMap, vSurfaceUv).r * 255.0 + 0.5);
         diffuseColor.rgb = uSurfaceColors[clamp(surfaceId, 0, ${LAST_SURFACE})];`,
            );
    };

    return material;
}
