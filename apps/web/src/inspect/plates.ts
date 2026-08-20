/**
 * Visual StatTrak counter + nametag plate (M10).
 * Not a CS2 mesh extract — authored canvas textures on small planes
 * parented to the rifle, plus HTML overlays in the inspect chrome.
 */
import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from "three";

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: CanvasTexture } {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d canvas required for inspect plates");
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return { canvas, ctx, tex };
}

function paintStatTrak(ctx: CanvasRenderingContext2D, kills: number): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#1c140c";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#c9a36a";
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.fillStyle = "#c9a36a";
  ctx.font = "bold 18px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("StatTrak™", 14, 26);
  ctx.fillStyle = "#2a1608";
  ctx.fillRect(12, 36, w - 24, h - 48);
  ctx.fillStyle = "#ff7a18";
  ctx.font = "bold 40px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "right";
  ctx.fillText(String(Math.max(0, Math.floor(kills))), w - 18, h - 18);
}

function paintNametag(ctx: CanvasRenderingContext2D, text: string): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#8a8374";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#d8d2c4";
  ctx.fillRect(6, 6, w - 12, h - 12);
  ctx.strokeStyle = "#3a3428";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = "#1c1810";
  ctx.font = "bold 36px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 1, w - 28);
}

export type PlateHook = {
  mesh: Mesh;
  setVisible: (on: boolean) => void;
  dispose: () => void;
};

export function createStatTrakPlate(): PlateHook & { setKills: (n: number) => void } {
  const { ctx, tex } = makeCanvas(256, 96);
  paintStatTrak(ctx, 0);
  const mat = new MeshBasicMaterial({
    map: tex,
    transparent: true,
    side: DoubleSide,
    depthTest: true,
    toneMapped: false,
  });
  const mesh = new Mesh(new PlaneGeometry(0.075, 0.028), mat);
  mesh.name = "m10_stattrak";
  mesh.visible = false;
  mesh.renderOrder = 2;
  return {
    mesh,
    setKills(n: number) {
      paintStatTrak(ctx, n);
      tex.needsUpdate = true;
    },
    setVisible(on: boolean) {
      mesh.visible = on;
    },
    dispose() {
      tex.dispose();
      mat.dispose();
      mesh.geometry.dispose();
    },
  };
}

export function createNametagPlate(): PlateHook & { setText: (text: string) => void } {
  const { ctx, tex } = makeCanvas(384, 80);
  paintNametag(ctx, "");
  const mat = new MeshBasicMaterial({
    map: tex,
    transparent: false,
    side: DoubleSide,
    depthTest: true,
    toneMapped: false,
  });
  const mesh = new Mesh(new PlaneGeometry(0.11, 0.023), mat);
  mesh.name = "m10_nametag";
  mesh.visible = false;
  mesh.renderOrder = 2;
  return {
    mesh,
    setText(text: string) {
      paintNametag(ctx, text);
      tex.needsUpdate = true;
    },
    setVisible(on: boolean) {
      mesh.visible = on;
    },
    dispose() {
      tex.dispose();
      mat.dispose();
      mesh.geometry.dispose();
    },
  };
}

/** Place plates on the AK receiver (authored, not a CS2 attach point). */
export function placeInspectPlates(st: Mesh, nt: Mesh, center: { x: number; y: number; z: number }): void {
  // Receiver / +X side so the default inspect + front cameras read the LCD.
  st.position.set(center.x + 0.036, center.y + 0.01, center.z - 0.02);
  st.rotation.set(-0.15, -Math.PI / 2, 0);
  // Nameplate above the dust cover, tilted toward the inspect camera.
  nt.position.set(center.x + 0.004, center.y + 0.044, center.z + 0.02);
  nt.rotation.set(-0.55, 0.12, 0);
}
