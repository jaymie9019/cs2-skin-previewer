/**
 * Seed-driven Case Hardened (Patina / style 8) on an existing
 * MeshStandardMaterial, without painting the wood.
 *
 * Keeps the glTF albedo / normal / ORM. Samples oiled.png with the M2
 * pattern matrix, paint_wear + gun_grunge with the same-seed wear/grunge
 * matrices, and composites only where the HD paint-by-number mask says
 * the surface is metal (masks.r) and not TextureNoPaint (cavity.a).
 *
 * Wear mix is PAINTSTYLE 8 from CS:GO customweapon_ps20b.fxc (Patina):
 *   scratch = smoothstep(0.1, 0.2, wear.g * ao * cavity^2 * float)
 *   grungeAmt = pow(1-cavity,4)*0.25 + 0.75*float
 *   tint = lerp(color1, color2, float)
 *   grime = lerp(color1, color3, sqrt(float))
 *   FN (float 0): painted = pattern (oiled.png already colour-ramped)
 *   age tint/grime scale with float; scratch = wear-map vs float threshold
 *   painted = lerp(pattern, pattern*ageTint, float) * grunge
 *   painted = lerp(painted, color0 * luma(pattern), scratch)
 *
 * Sources (do not copy third-party previewer code):
 *   https://www.counter-strike.net/workshop/workshopfinishes/
 *   https://www.counter-strike.net/workshop/wf_patina
 *   https://www.isitabluegem.com/insights
 *   https://pattern.wiki/wiki/pattern_colors
 *   local aq_oiled.vmat + weapon_rif_ak47_composite_inputs.vmat
 */

import {
  ClampToEdgeWrapping,
  Matrix3,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type MeshStandardMaterial,
  type Texture,
} from "three";
import type { Affine2D } from "./seed/seedToPatternUv";
import {
  PATINA_COLOR0,
  PATINA_COLOR1,
  PATINA_COLOR2,
  PATINA_COLOR3,
  PATINA_PAINT_METALNESS,
  PATINA_PAINT_ROUGHNESS,
  PATINA_PATTERN_GAIN,
  clampFloat,
} from "./patina/patinaWearMix";

export function affineToMatrix3(m: Affine2D, out = new Matrix3()): Matrix3 {
  return out.set(m.a, m.b, m.tx, m.c, m.d, m.ty, 0, 0, 1);
}

export type PatternMaps = {
  pattern: Texture;
  wear: Texture;
  grunge: Texture;
  masks: Texture;
  cavity: Texture;
};

export type PatternHook = {
  setLayers: (layers: { pattern: Affine2D; wear: Affine2D; grunge: Affine2D }) => void;
  setFloat: (floatAmt: number) => void;
};

function prepColorMap(tex: Texture): Texture {
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function prepDataRepeat(tex: Texture): Texture {
  tex.colorSpace = NoColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function prepDataClamp(tex: Texture): Texture {
  tex.colorSpace = NoColorSpace;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  // glTF albedo is flipY=false; these maps share that UV layout.
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

export function attachPatternMap(material: MeshStandardMaterial, maps: PatternMaps): PatternHook {
  prepColorMap(maps.pattern);
  prepDataRepeat(maps.wear);
  prepDataRepeat(maps.grunge);
  prepDataClamp(maps.masks);
  prepDataClamp(maps.cavity);

  // Do NOT replace material.map — wood/original albedo stays on `map`.
  material.needsUpdate = true;

  const patternMatrix = new Matrix3();
  const wearMatrix = new Matrix3();
  const grungeMatrix = new Matrix3();
  const floatUniform = { value: 0 };

  const hook: PatternHook = {
    setLayers(layers) {
      affineToMatrix3(layers.pattern, patternMatrix);
      affineToMatrix3(layers.wear, wearMatrix);
      affineToMatrix3(layers.grunge, grungeMatrix);
    },
    setFloat(floatAmt: number) {
      floatUniform.value = clampFloat(floatAmt);
    },
  };

  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.uniforms.uPatternMatrix = { value: patternMatrix };
    shader.uniforms.uWearMatrix = { value: wearMatrix };
    shader.uniforms.uGrungeMatrix = { value: grungeMatrix };
    shader.uniforms.uPatternMap = { value: maps.pattern };
    shader.uniforms.uWearMap = { value: maps.wear };
    shader.uniforms.uGrungeMap = { value: maps.grunge };
    shader.uniforms.uPaintMasks = { value: maps.masks };
    shader.uniforms.uCavityAo = { value: maps.cavity };
    shader.uniforms.uFloat = floatUniform;
    shader.uniforms.uPatinaC0 = { value: [...PATINA_COLOR0] };
    shader.uniforms.uPatinaC1 = { value: [...PATINA_COLOR1] };
    shader.uniforms.uPatinaC2 = { value: [...PATINA_COLOR2] };
    shader.uniforms.uPatinaC3 = { value: [...PATINA_COLOR3] };
    shader.uniforms.uPaintRoughness = { value: PATINA_PAINT_ROUGHNESS };
    shader.uniforms.uPaintMetalness = { value: PATINA_PAINT_METALNESS };
    shader.uniforms.uPatternGain = { value: PATINA_PATTERN_GAIN };

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <map_pars_fragment>",
        `#include <map_pars_fragment>
uniform mat3 uPatternMatrix;
uniform mat3 uWearMatrix;
uniform mat3 uGrungeMatrix;
uniform sampler2D uPatternMap;
uniform sampler2D uWearMap;
uniform sampler2D uGrungeMap;
uniform sampler2D uPaintMasks;
uniform sampler2D uCavityAo;
uniform float uFloat;
uniform vec3 uPatinaC0;
uniform vec3 uPatinaC1;
uniform vec3 uPatinaC2;
uniform vec3 uPatinaC3;
uniform float uPaintRoughness;
uniform float uPaintMetalness;
uniform float uPatternGain;
float cs2PaintMask = 0.0;
`,
      )
      .replace(
        "#include <map_fragment>",
        `
#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	vec2 patternUv = fract( ( uPatternMatrix * vec3( vMapUv, 1.0 ) ).xy );
	vec2 wearUv = fract( ( uWearMatrix * vec3( vMapUv, 1.0 ) ).xy );
	vec2 grungeUv = fract( ( uGrungeMatrix * vec3( vMapUv, 1.0 ) ).xy );
	vec3 pattern = texture2D( uPatternMap, patternUv ).rgb * uPatternGain;
	float wearTex = texture2D( uWearMap, wearUv ).g;
	vec3 grungeRgb = texture2D( uGrungeMap, grungeUv ).rgb;
	vec4 masks = texture2D( uPaintMasks, vMapUv );
	vec4 cavityPack = texture2D( uCavityAo, vMapUv );
	float flCavity = cavityPack.r;
	float flAo = cavityPack.g;
	float flNoPaint = cavityPack.a;
	// Engine paint-by-number (masks.r) after flipY=false. Do not gate on ORM
	// metalness or albedo chroma — both leaked factory gray into FN metal.
	cs2PaintMask = step( 0.4, masks.r ) * ( 1.0 - flNoPaint );

	float flGrunge = grungeRgb.r * grungeRgb.g * grungeRgb.b;
	float gAmt = pow( 1.0 - flCavity, 4.0 ) * 0.25 + 0.75 * uFloat;
	vec3 cGrunge = mix( vec3( 1.0 ), grungeRgb, gAmt );

	float flPatinaBlend = smoothstep( 0.1, 0.2, wearTex * flAo * flCavity * flCavity * uFloat );
	float flOilRub = saturate( flCavity * flAo - uFloat * 0.1 ) - flGrunge;
	flOilRub = smoothstep( 0.0, 0.15, flOilRub + 0.08 );

	vec3 agedTint = mix( uPatinaC1, uPatinaC2, uFloat );
	vec3 cPatina = mix( pattern, pattern * agedTint, uFloat );
	vec3 grimeTint = mix( uPatinaC1, uPatinaC3, sqrt( uFloat ) );
	cPatina = mix( cPatina, pattern * grimeTint, ( 1.0 - flOilRub ) * uFloat );
	float fPatternLum = dot( pattern, vec3( 0.3, 0.59, 0.11 ) );
	vec3 cScratches = uPatinaC0 * fPatternLum;
	cPatina = mix( cPatina, cScratches, flPatinaBlend );
	vec3 painted = saturate( cPatina * cGrunge );

	sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, painted, cs2PaintMask );
	diffuseColor *= sampledDiffuseColor;
#endif
`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
	roughnessFactor = mix( roughnessFactor, uPaintRoughness, cs2PaintMask );`,
      )
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
	metalnessFactor = mix( metalnessFactor, uPaintMetalness, cs2PaintMask );`,
      );
  };
  material.customProgramCacheKey = () => "m3-patina-wear-mask-fn3";
  return hook;
}
