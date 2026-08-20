/**
 * Composite up to 4 sticker layers on a MeshStandardMaterial using mesh
 * TEXCOORD_1 (glTF uv1) and AK StickerMarkup offsets/scales.
 *
 * Stickers sit on the painted body (weapon_rif_ak47) and on the translucent
 * sticker_gaps overlay — both materials have F_STICKERS in the vmat extras.
 * Do not spawn world-space quads. Paint kits (including style 2) stay on
 * the existing attachPatternMap path; this only mixes on top.
 *
 * Wear / UnWear / paper / holo are approximations of
 * https://www.counter-strike.net/workshop/workshopstickers/
 */
import {
  ClampToEdgeWrapping,
  DataTexture,
  LinearFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  Vector2,
  type MeshStandardMaterial,
  type Texture,
} from "three";
import type { ExtractedSticker } from "./catalog";
import { extractedSticker } from "./catalog";
import { AK47_STICKER_MARKUP } from "./uv";
import { MAX_STICKER_LAYERS, isEmptySlot, type StickerSlot } from "./slots";
import { UNWEAR_STRENGTH } from "./wearMix";

export type StickerHook = {
  setSlots: (slots: readonly StickerSlot[]) => void;
};

export type BoundSticker = {
  color: Texture;
  wear: Texture;
  holo?: Texture;
  spectrum?: Texture;
  extracted: ExtractedSticker;
};

export type StickerSharedMaps = {
  scratches: Texture;
  backing: Texture;
  dummyColor: Texture;
  dummyData: Texture;
  byId: Map<number, BoundSticker>;
};

function prepColor(tex: Texture): Texture {
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.flipY = false;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function prepData(tex: Texture, repeat = false): Texture {
  tex.colorSpace = NoColorSpace;
  tex.wrapS = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  tex.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  tex.flipY = false;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export function makeDummyTextures(): { color: Texture; data: Texture } {
  const color = new DataTexture(new Uint8Array([255, 255, 255, 0]), 1, 1, RGBAFormat, UnsignedByteType);
  color.colorSpace = SRGBColorSpace;
  color.needsUpdate = true;
  const data = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, RGBAFormat, UnsignedByteType);
  data.colorSpace = NoColorSpace;
  data.needsUpdate = true;
  return { color, data };
}

export function prepSharedMaps(maps: StickerSharedMaps): void {
  prepData(maps.scratches, true);
  prepColor(maps.backing);
  for (const rec of maps.byId.values()) {
    prepColor(rec.color);
    prepData(rec.wear);
    if (rec.holo) prepData(rec.holo);
    if (rec.spectrum) prepColor(rec.spectrum);
  }
}

export function bindExtracted(
  id: number,
  textures: { color: Texture; wear: Texture; holo?: Texture; spectrum?: Texture },
): BoundSticker {
  const extracted = extractedSticker(id);
  if (!extracted) throw new Error(`sticker ${id} is not in the extracted subset`);
  return { ...textures, extracted };
}

function slotSampleGlsl(i: number): string {
  const unwear = UNWEAR_STRENGTH.toFixed(3);
  return `
	if ( uStickerEnable${i} > 0.5 ) {
		vec2 suv = ( vStickerUv1 - vec2( 0.5 ) - uStickerOffset${i} ) * uStickerScale${i};
		float cs = cos( uStickerRotation${i} );
		float sn = sin( uStickerRotation${i} );
		suv = vec2( cs * suv.x - sn * suv.y, sn * suv.x + cs * suv.y ) + vec2( 0.5 );
		if ( suv.x >= 0.0 && suv.x <= 1.0 && suv.y >= 0.0 && suv.y <= 1.0 ) {
			vec4 print = texture2D( uStickerColor${i}, suv );
			float wearMask = texture2D( uStickerWear${i}, suv ).r;
			float coverage = smoothstep( 0.02, 0.08, wearMask );
			float scratches = texture2D( uStickerScratches, suv * 2.0 ).r;
			float wearAmt = uStickerWearAmt${i};
			float worn = saturate( wearAmt * ( 0.35 + 0.65 * scratches ) - wearMask * ${unwear} );
			float remain = 1.0 - smoothstep( 0.05, 0.92, worn );
			float alpha = coverage * remain;
			if ( print.a > 0.05 ) alpha *= print.a;
			vec3 rgb = print.rgb;
			if ( uStickerPaper${i} > 0.5 ) {
				vec3 paper = texture2D( uStickerBacking, suv ).rgb;
				rgb = mix( rgb, paper, wearAmt * 0.45 );
			}
			if ( uStickerHolo${i} > 0.5 ) {
				vec3 holoMask = texture2D( uStickerHoloMask${i}, suv ).rgb;
				float tilt = clamp( viewTilt * 0.55 + 0.22, 0.0, 1.0 );
				vec3 spec = texture2D( uStickerSpectrum${i}, vec2( holoMask.g * 0.85 + tilt, holoMask.b ) ).rgb;
				rgb = mix( rgb, spec, saturate( holoMask.r ) );
			}
			stickerOut.rgb = mix( stickerOut.rgb, rgb, saturate( alpha ) );
			stickerOut.a = stickerOut.a + alpha * ( 1.0 - stickerOut.a );
		}
	}`;
}

const COMPOSITE_GLSL = `
	vec4 stickerOut = vec4( 0.0 );
	float viewTilt = clamp( normalize( vViewPosition ).x * 0.5 + 0.5, 0.0, 1.0 );
${slotSampleGlsl(0)}
${slotSampleGlsl(1)}
${slotSampleGlsl(2)}
${slotSampleGlsl(3)}
	if ( uStickerGapsMode > 0.5 ) {
		diffuseColor.rgb = mix( vec3( 0.0 ), stickerOut.rgb, stickerOut.a );
		diffuseColor.a = stickerOut.a;
	} else {
		diffuseColor.rgb = mix( diffuseColor.rgb, stickerOut.rgb, stickerOut.a );
	}
`;

function stickerUniformsGlsl(): string {
  const lines: string[] = ["varying vec2 vStickerUv1;", "uniform sampler2D uStickerScratches;", "uniform sampler2D uStickerBacking;", "uniform float uStickerGapsMode;"];
  for (let i = 0; i < 4; i++) {
    lines.push(
      `uniform float uStickerEnable${i};`,
      `uniform float uStickerWearAmt${i};`,
      `uniform float uStickerRotation${i};`,
      `uniform float uStickerPaper${i};`,
      `uniform float uStickerHolo${i};`,
      `uniform vec2 uStickerOffset${i};`,
      `uniform float uStickerScale${i};`,
      `uniform sampler2D uStickerColor${i};`,
      `uniform sampler2D uStickerWear${i};`,
      `uniform sampler2D uStickerHoloMask${i};`,
      `uniform sampler2D uStickerSpectrum${i};`,
    );
  }
  return lines.join("\n");
}

export function attachStickers(
  material: MeshStandardMaterial,
  maps: StickerSharedMaps,
  opts: { gapsOverlay: boolean },
): StickerHook {
  prepSharedMaps(maps);

  const enable = [0, 0, 0, 0].map((v) => ({ value: v }));
  const wearAmt = [0, 0, 0, 0].map((v) => ({ value: v }));
  const rotation = [0, 0, 0, 0].map((v) => ({ value: v }));
  const paper = [0, 0, 0, 0].map((v) => ({ value: v }));
  const holo = [0, 0, 0, 0].map((v) => ({ value: v }));
  const offsets = [0, 1, 2, 3].map(() => ({ value: new Vector2() }));
  const scales = [0, 0, 0, 0].map((v) => ({ value: v }));
  const colors = [0, 1, 2, 3].map(() => ({ value: maps.dummyColor }));
  const wears = [0, 1, 2, 3].map(() => ({ value: maps.dummyData }));
  const holoMasks = [0, 1, 2, 3].map(() => ({ value: maps.dummyData }));
  const spectra = [0, 1, 2, 3].map(() => ({ value: maps.dummyColor }));
  const gapsMode = { value: opts.gapsOverlay ? 1 : 0 };

  material.defines = { ...(material.defines ?? {}), USE_UV1: "" };

  if (opts.gapsOverlay) {
    material.transparent = true;
    material.depthWrite = false;
    material.opacity = 1;
    material.alphaTest = 0;
  }

  const hook: StickerHook = {
    setSlots(slots) {
      for (let i = 0; i < MAX_STICKER_LAYERS; i++) {
        const slot = slots[i];
        const rec = slot && !isEmptySlot(slot) ? maps.byId.get(slot.id) : undefined;
        const markup = AK47_STICKER_MARKUP[i];
        if (!rec || !slot) {
          enable[i].value = 0;
          colors[i].value = maps.dummyColor;
          wears[i].value = maps.dummyData;
          holoMasks[i].value = maps.dummyData;
          spectra[i].value = maps.dummyColor;
          continue;
        }
        enable[i].value = 1;
        wearAmt[i].value = slot.wear;
        rotation[i].value = (slot.rotationDeg * Math.PI) / 180;
        paper[i].value = rec.extracted.style === "paper" ? 1 : 0;
        holo[i].value = rec.extracted.style === "holo" ? 1 : 0;
        offsets[i].value.set(markup.offset[0] + slot.offsetX, markup.offset[1] + slot.offsetY);
        scales[i].value = markup.scale;
        colors[i].value = rec.color;
        wears[i].value = rec.wear;
        holoMasks[i].value = rec.holo ?? maps.dummyData;
        spectra[i].value = rec.spectrum ?? maps.dummyColor;
      }
    },
  };

  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.call(material, shader, renderer);

    for (let i = 0; i < 4; i++) {
      shader.uniforms[`uStickerEnable${i}`] = enable[i];
      shader.uniforms[`uStickerWearAmt${i}`] = wearAmt[i];
      shader.uniforms[`uStickerRotation${i}`] = rotation[i];
      shader.uniforms[`uStickerPaper${i}`] = paper[i];
      shader.uniforms[`uStickerHolo${i}`] = holo[i];
      shader.uniforms[`uStickerOffset${i}`] = offsets[i];
      shader.uniforms[`uStickerScale${i}`] = scales[i];
      shader.uniforms[`uStickerColor${i}`] = colors[i];
      shader.uniforms[`uStickerWear${i}`] = wears[i];
      shader.uniforms[`uStickerHoloMask${i}`] = holoMasks[i];
      shader.uniforms[`uStickerSpectrum${i}`] = spectra[i];
    }
    shader.uniforms.uStickerScratches = { value: maps.scratches };
    shader.uniforms.uStickerBacking = { value: maps.backing };
    shader.uniforms.uStickerGapsMode = gapsMode;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <uv_pars_vertex>",
        `#include <uv_pars_vertex>
#ifndef USE_UV1
attribute vec2 uv1;
#endif
varying vec2 vStickerUv1;
`,
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
	vStickerUv1 = uv1;
`,
      );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_pars_fragment>",
      `#include <map_pars_fragment>
${stickerUniformsGlsl()}
`,
    );

    if (shader.fragmentShader.includes("diffuseColor *= sampledDiffuseColor;")) {
      shader.fragmentShader = shader.fragmentShader.replace(
        "diffuseColor *= sampledDiffuseColor;",
        `diffuseColor *= sampledDiffuseColor;
${COMPOSITE_GLSL}
`,
      );
    } else {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
${COMPOSITE_GLSL}
`,
      );
    }
  };

  const prevKey = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () =>
    `${prevKey ? prevKey() : "std"}|m5-stickers${opts.gapsOverlay ? "-gaps" : ""}`;
  material.needsUpdate = true;
  return hook;
}
