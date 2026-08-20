/**
 * Multi-kit paint on an existing MeshStandardMaterial.
 *
 * Keeps the glTF albedo / normal / ORM. Samples the kit pattern with the
 * M2 seed matrix, wear + grunge with the same-seed transforms, and
 * composites with a *per-kit* mask (not a global wood-vs-metal split).
 *
 * Style 8 Patina (Case Hardened): existing M3 mix, metal-only mask.
 * Style 3 Spray (Jungle / Safari Mesh): nested RGB, wear * pattern, spray mask.
 * Style 2 Hydrographic (Red / Blue Laminate): nested RGB + mask G/B,
 *   furniture mask + grainWindow.
 * Style 5 Anodized Multicolored (Hydroponic): nested RGB + mask G/B,
 *   metal mask (candy coat). Same mix as style 2 (pattern.wiki).
 * Style 7 Custom (Redline): UV-aligned albedo sample, metal mask.
 * Style 9 Gunsmith (Fuel Injector / Bloodsport): custom-like albedo,
 *   spray mask. Patina-on-metal split is not implemented.
 * Style 6 Anodized Airbrushed (Fade): 1D LUT along UV.x + seed, nested RGB
 *   of g_vColor0..3 (silver / gold / pink / purple). Metal mask.
 * Style 1 Solid Color (Candy Apple): Color1 on metal, no pattern.
 *
 * Style 3 officially uses triplanar; this viewer uses 2D UV with the
 * documented style-3 scale (weapon_length/36 * patternScale).
 *
 *   https://www.counter-strike.net/workshop/workshopfinishes/
 *   https://pattern.wiki/wiki/pattern_colors
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
import type { ViewerKit } from "./kits/catalog";
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
  setKit: (kit: ViewerKit, pattern: Texture) => void;
  setPaintEnabled: (enabled: boolean) => void;
};

function clampPattern(kit: ViewerKit): boolean {
  return kit.uvAligned || kit.grainWindow != null;
}

function prepColorMap(tex: Texture, kit: ViewerKit): Texture {
  const clamp = clampPattern(kit);
  const albedo = kit.patternAsAlbedo;
  tex.colorSpace = albedo || !clamp ? SRGBColorSpace : NoColorSpace;
  tex.wrapS = clamp ? ClampToEdgeWrapping : RepeatWrapping;
  tex.wrapT = clamp ? ClampToEdgeWrapping : RepeatWrapping;
  if (clamp) {
    // UV-authored film / wrap: same space as masks/cavity.
    // Hydrographic mix-weights stay linear (NoColorSpace); custom albedo is sRGB.
    tex.flipY = false;
    if (!albedo) tex.colorSpace = NoColorSpace;
  }
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
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

function maskModeId(mode: ViewerKit["maskMode"]): number {
  if (mode === "spray") return 1;
  if (mode === "furniture") return 2;
  return 0;
}

export function attachPatternMap(material: MeshStandardMaterial, maps: PatternMaps): PatternHook {
  // Start as a tiled color map; setKit overwrites wrap / color space per kit.
  prepColorMap(maps.pattern, {
    uvAligned: false,
    grainWindow: null,
    patternAsAlbedo: true,
  } as ViewerKit);
  prepDataRepeat(maps.wear);
  prepDataRepeat(maps.grunge);
  prepDataClamp(maps.masks);
  prepDataClamp(maps.cavity);

  material.needsUpdate = true;

  const patternMatrix = new Matrix3();
  const wearMatrix = new Matrix3();
  const grungeMatrix = new Matrix3();
  const floatUniform = { value: 0 };
  const styleUniform = { value: 8 };
  const maskModeUniform = { value: 0 };
  const patternGainUniform = { value: PATINA_PATTERN_GAIN };
  const paintRoughnessUniform = { value: PATINA_PAINT_ROUGHNESS };
  const paintMetalnessUniform = { value: PATINA_PAINT_METALNESS };
  const wearRemapMinUniform = { value: 0 };
  const wearRemapMaxUniform = { value: 1 };
  const color0 = { value: [...PATINA_COLOR0] };
  const color1 = { value: [...PATINA_COLOR1] };
  const color2 = { value: [...PATINA_COLOR2] };
  const color3 = { value: [...PATINA_COLOR3] };
  const patternMapUniform = { value: maps.pattern };
  const clampPatternUniform = { value: 0 };
  const grainOrigin = { value: [0, 0] };
  const grainSize = { value: [1, 1] };
  const grainTileUniform = { value: 1 };
  const paintEnabledUniform = { value: 1 };

  const hook: PatternHook = {
    setLayers(layers) {
      affineToMatrix3(layers.pattern, patternMatrix);
      affineToMatrix3(layers.wear, wearMatrix);
      affineToMatrix3(layers.grunge, grungeMatrix);
    },
    setFloat(floatAmt: number) {
      floatUniform.value = clampFloat(floatAmt);
    },
    setKit(kit, pattern) {
      prepColorMap(pattern, kit);
      patternMapUniform.value = pattern;
      clampPatternUniform.value = clampPattern(kit) ? 1 : 0;
      styleUniform.value = kit.style;
      maskModeUniform.value = maskModeId(kit.maskMode);
      patternGainUniform.value = kit.patternGain;
      paintRoughnessUniform.value = kit.paintRoughness;
      paintMetalnessUniform.value = kit.paintMetalness;
      wearRemapMinUniform.value = kit.wearRemapMin;
      wearRemapMaxUniform.value = kit.wearRemapMax;
      color0.value = [...kit.colors[0]];
      color1.value = [...kit.colors[1]];
      color2.value = [...kit.colors[2]];
      color3.value = [...kit.colors[3]];
      const win = kit.grainWindow;
      if (win) {
        grainOrigin.value = [...win.origin];
        grainSize.value = [...win.size];
        grainTileUniform.value = win.tile;
      } else {
        grainOrigin.value = [0, 0];
        grainSize.value = [1, 1];
        grainTileUniform.value = 1;
      }
    },
    setPaintEnabled(enabled: boolean) {
      paintEnabledUniform.value = enabled ? 1 : 0;
    },
  };

  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);
    shader.uniforms.uPatternMatrix = { value: patternMatrix };
    shader.uniforms.uWearMatrix = { value: wearMatrix };
    shader.uniforms.uGrungeMatrix = { value: grungeMatrix };
    shader.uniforms.uPatternMap = patternMapUniform;
    shader.uniforms.uWearMap = { value: maps.wear };
    shader.uniforms.uGrungeMap = { value: maps.grunge };
    shader.uniforms.uPaintMasks = { value: maps.masks };
    shader.uniforms.uCavityAo = { value: maps.cavity };
    shader.uniforms.uFloat = floatUniform;
    shader.uniforms.uStyle = styleUniform;
    shader.uniforms.uMaskMode = maskModeUniform;
    shader.uniforms.uPatinaC0 = color0;
    shader.uniforms.uPatinaC1 = color1;
    shader.uniforms.uPatinaC2 = color2;
    shader.uniforms.uPatinaC3 = color3;
    shader.uniforms.uPaintRoughness = paintRoughnessUniform;
    shader.uniforms.uPaintMetalness = paintMetalnessUniform;
    shader.uniforms.uPatternGain = patternGainUniform;
    shader.uniforms.uWearRemapMin = wearRemapMinUniform;
    shader.uniforms.uWearRemapMax = wearRemapMaxUniform;
    shader.uniforms.uClampPattern = clampPatternUniform;
    shader.uniforms.uGrainOrigin = grainOrigin;
    shader.uniforms.uGrainSize = grainSize;
    shader.uniforms.uGrainTile = grainTileUniform;
    shader.uniforms.uPaintEnabled = paintEnabledUniform;

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
uniform float uStyle;
uniform float uMaskMode;
uniform vec3 uPatinaC0;
uniform vec3 uPatinaC1;
uniform vec3 uPatinaC2;
uniform vec3 uPatinaC3;
uniform float uPaintRoughness;
uniform float uPaintMetalness;
uniform float uPatternGain;
uniform float uWearRemapMin;
uniform float uWearRemapMax;
uniform float uClampPattern;
uniform vec2 uGrainOrigin;
uniform vec2 uGrainSize;
uniform float uGrainTile;
uniform float uPaintEnabled;
float cs2PaintMask = 0.0;
`,
      )
      .replace(
        "#include <map_fragment>",
        `
#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	vec2 patternUv = ( uPatternMatrix * vec3( vMapUv, 1.0 ) ).xy;
	vec2 wearUv = fract( ( uWearMatrix * vec3( vMapUv, 1.0 ) ).xy );
	vec2 grungeUv = fract( ( uGrungeMatrix * vec3( vMapUv, 1.0 ) ).xy );
	vec2 patternSampleUv = ( uClampPattern > 0.5 ) ? clamp( patternUv, 0.0, 1.0 ) : fract( patternUv );
	vec3 pattern = texture2D( uPatternMap, patternSampleUv ).rgb * uPatternGain;
	float wearTex = texture2D( uWearMap, wearUv ).g;
	vec3 grungeRgb = texture2D( uGrungeMap, grungeUv ).rgb;
	vec4 masks = texture2D( uPaintMasks, vMapUv );
	vec4 cavityPack = texture2D( uCavityAo, vMapUv );
	float flCavity = cavityPack.r;
	float flAo = cavityPack.g;
	float flNoPaint = cavityPack.a;
	float metalMask = step( 0.4, masks.r ) * ( 1.0 - flNoPaint );
	float furnitureMask = ( 1.0 - step( 0.4, masks.r ) ) * ( 1.0 - flNoPaint );
	float sprayMask = ( 1.0 - flNoPaint );
	if ( uMaskMode < 0.5 ) cs2PaintMask = metalMask;
	else if ( uMaskMode < 1.5 ) cs2PaintMask = sprayMask;
	else cs2PaintMask = furnitureMask;
	cs2PaintMask *= uPaintEnabled;

	float flGrunge = grungeRgb.r * grungeRgb.g * grungeRgb.b;
	float gAmt = pow( 1.0 - flCavity, 4.0 ) * 0.25 + 0.75 * uFloat;
	vec3 cGrunge = mix( vec3( 1.0 ), grungeRgb, gAmt );
	vec3 painted;

	if ( abs( uStyle - 8.0 ) < 0.5 ) {
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
		painted = saturate( cPatina * cGrunge );
	} else if ( uStyle > 6.5 ) {
		// Style 7 Custom / 9 Gunsmith: UV-aligned albedo, wear to substrate.
		painted = saturate( pattern * cGrunge );
		float wearOff = smoothstep( 0.2, 0.9, wearTex * uFloat );
		cs2PaintMask *= ( 1.0 - wearOff );
	} else if ( abs( uStyle - 6.0 ) < 0.5 ) {
		// Style 6 Anodized Airbrushed / Fade: 1D lookup along the weapon.
		// Workshop: gradient along length. Seed translateX shifts fade %.
		// https://www.counter-strike.net/workshop/workshopfinishes/
		float fadeT = fract( vMapUv.x * 0.85 + 0.08 + uPatternMatrix[2].x * 0.45 );
		vec3 p = texture2D( uPatternMap, vec2( fadeT, 0.5 ) ).rgb * uPatternGain;
		vec3 color = mix( uPatinaC0, uPatinaC1, saturate( p.r ) );
		color = mix( color, uPatinaC2, saturate( p.g ) );
		color = mix( color, uPatinaC3, saturate( p.b ) );
		painted = saturate( color * cGrunge );
		float wearOff = smoothstep( 0.25, 0.95, wearTex * uFloat );
		cs2PaintMask *= ( 1.0 - wearOff );
	} else if ( abs( uStyle - 1.0 ) < 0.5 ) {
		// Style 1 Solid Color (Candy Apple): vmat Color1, no pattern.
		painted = saturate( uPatinaC1 * cGrunge );
		float wearOff = smoothstep( 0.2, 0.9, wearTex * uFloat );
		cs2PaintMask *= ( 1.0 - wearOff );
	} else {
		vec3 p = pattern;
		if ( abs( uStyle - 2.0 ) < 0.5 ) {
			// HD UVs miss the UV-atlas film. Tile the dense plywood window.
			// Wear-matrix translation is seed-stable (same seed → same grain).
			vec2 grainUv = uGrainOrigin + fract( vMapUv * uGrainTile + uWearMatrix[2].xy ) * uGrainSize;
			p = texture2D( uPatternMap, grainUv ).rgb * uPatternGain;
		}
		if ( abs( uStyle - 3.0 ) < 0.5 ) {
			float k = 1.0 - saturate( wearTex ) * uFloat;
			p *= k;
		}
		vec3 color = mix( uPatinaC0, uPatinaC1, saturate( p.r ) );
		color = mix( color, uPatinaC2, saturate( p.g ) );
		color = mix( color, uPatinaC3, saturate( p.b ) );
		if ( abs( uStyle - 2.0 ) < 0.5 || abs( uStyle - 5.0 ) < 0.5 ) {
			color = mix( color, uPatinaC2, saturate( masks.g ) );
			color = mix( color, uPatinaC3, saturate( masks.b ) );
			float wearOff = smoothstep( 0.2, 0.9, wearTex * uFloat );
			cs2PaintMask *= ( 1.0 - wearOff );
		}
		painted = saturate( color * cGrunge );
	}

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
  material.customProgramCacheKey = () => "m11-paint-styles";
  return hook;
}
