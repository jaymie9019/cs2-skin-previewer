/**
 * Apply a seed-driven pattern sample to an existing MeshStandardMaterial.
 * Keeps the glTF PBR maps (normal / ORM) and replaces albedo UVs with A×uv.
 *
 * Matrix convention: GLSL `uPatternMatrix * vec3(uv, 1)` using Affine2D
 * from seedToPatternUv.ts (A = T₂ R S T₁).
 */

import { Matrix3, RepeatWrapping, SRGBColorSpace, type MeshStandardMaterial, type Texture } from "three";
import type { Affine2D } from "./seed/seedToPatternUv";

export function affineToMatrix3(m: Affine2D, out = new Matrix3()): Matrix3 {
  // Three.Matrix3.set(n11, n12, n13, n21, n22, n23, n31, n32, n33)
  // uploaded column-major, so this yields x' = a x + b y + tx.
  return out.set(m.a, m.b, m.tx, m.c, m.d, m.ty, 0, 0, 1);
}

export type PatternHook = {
  matrix: Matrix3;
  setAffine: (affine: Affine2D) => void;
};

export function attachPatternMap(material: MeshStandardMaterial, pattern: Texture): PatternHook {
  pattern.colorSpace = SRGBColorSpace;
  pattern.wrapS = RepeatWrapping;
  pattern.wrapT = RepeatWrapping;
  pattern.needsUpdate = true;

  material.map = pattern;
  material.metalness = 0.82;
  material.roughness = 0.38;
  material.needsUpdate = true;

  const matrix = new Matrix3();
  const hook: PatternHook = {
    matrix,
    setAffine(affine: Affine2D) {
      affineToMatrix3(affine, matrix);
    },
  };

  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.uniforms.uPatternMatrix = { value: matrix };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_pars_fragment>",
        `#include <map_pars_fragment>
uniform mat3 uPatternMatrix;`,
      )
      .replace(
        "#include <map_fragment>",
        `
#ifdef USE_MAP
	vec2 patternedUv = fract((uPatternMatrix * vec3(vMapUv, 1.0)).xy);
	vec4 sampledDiffuseColor = texture2D(map, patternedUv);
	diffuseColor *= sampledDiffuseColor;
#endif
`,
      );
  };
  // Force a recompile if the material was already compiled.
  material.customProgramCacheKey = () => "m2-pattern-uv";
  return hook;
}
