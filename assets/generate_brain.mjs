// CC0 procedural brain geometry for the Pantip Analytics holographic renderer.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const folder =
  process.argv[2] ||
  fileURLToPath(new URL("../frontend/public/", import.meta.url));
const twoPi = 2 * Math.PI;
const { sin, cos, exp, hypot, min, max, tanh } = Math;

function corticalPoint(a, b, side) {
  const x = sin(a) * cos(b);
  const y = cos(a);
  const z = sin(a) * sin(b);
  const p =
    x + 0.105 * sin(5.3 * y + 3.4 * z) + 0.062 * sin(10.1 * z - 4.9 * x);
  const q = y + 0.147 * sin(5.7 * x - 5.3 * z) + 0.071 * sin(8.3 * z + 6.1 * y);
  const r = z + 0.083 * sin(6.9 * y - 3.1 * x) + 0.075 * sin(4.2 * x - 6.2 * y);
  // A warped gyroid field creates rounded, connected cortical folds.
  const field =
    sin(10.5 * p + 0.6 * sin(4 * r)) * cos(10 * q) +
    sin(10 * q + 0.5 * sin(4 * p)) * cos(10.5 * r) +
    sin(10.5 * r + 0.6 * sin(4 * q)) * cos(10.5 * p);
  const folds =
    0.095 * tanh(1.55 * Math.abs(field)) -
    0.075 +
    0.012 * sin(5 * p - 4 * r + 3 * q);
  const lateral = 0.356 + (0.505 + 0.027 * x - 0.02 * y) * z + folds * z;
  const medialWall = 0.024 + 0.011 * sin(7 * x + y);
  const hemisphere =
    side *
    (medialWall +
      0.5 * (lateral - medialWall + hypot(lateral - medialWall, 0.034)));
  const foreAft =
    x * (1.06 + folds + 0.025 * y) + 0.036 * cos(3.1 * y) + 0.032 * cos(3 * z);
  const vertical =
    0.14 +
    (0.69 + (0.045 * (x + 1)) / 2 + folds) * y +
    0.025 * x -
    0.028 * z * z +
    0.04 * exp(-13 * (x - 0.44) ** 2) * min(y, 0);
  return [foreAft, vertical, hemisphere];
}

function cerebellumPoint(a, b, side) {
  const x = sin(a) * cos(b);
  const y = cos(a);
  const z = sin(a) * sin(b);
  const folia =
    0.01 * cos(43 * (y + 0.12 * x + 0.1 * x * x + 0.04 * sin(6 * z)));
  return [
    -0.54 + (0.37 + folia) * x,
    -0.54 + (0.31 + folia) * y + 0.045 * x,
    side * (0.22 + (0.28 + folia) * z),
  ];
}

function stemPoint(a, b) {
  const x = sin(a) * cos(b);
  const y = cos(a);
  const z = sin(a) * sin(b);
  const pons = 0.05 * exp(-27 * (y - 0.18) ** 2);
  return [
    -0.17 + 0.2 * y + (0.1 + pons) * (0.72 + (0.28 * (y + 1)) / 2) * x,
    -0.7 + 0.4 * y,
    (0.1 + pons) * (0.72 + (0.28 * (y + 1)) / 2) * z,
  ];
}

function mesh(point, rows, columns, hue) {
  const stride = columns + 1;
  const vertices = [];
  const triangles = [];
  const d = 0.0018;
  for (let i = 0; i <= rows; i++) {
    const a = max(0.002, min(Math.PI - 0.002, (i / rows) * Math.PI));
    for (let j = 0; j <= columns; j++) {
      const b = (j / columns) * twoPi;
      const [x, y, z] = point(a, b);
      const aa = point(a + d, b);
      const bb = point(a, b + d);
      const u = [aa[0] - x, aa[1] - y, aa[2] - z];
      const v = [bb[0] - x, bb[1] - y, bb[2] - z];
      const n = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      const m = hypot(...n);
      vertices.push([
        x,
        y,
        z,
        (n[0] / m) * hue.dir,
        (n[1] / m) * hue.dir,
        (n[2] / m) * hue.dir,
        hue.intensity,
      ]);
      if (i < rows && j < columns) {
        const index = i * stride + j;
        triangles.push(
          index,
          index + stride,
          index + 1,
          index + 1,
          index + stride,
          index + stride + 1,
        );
      }
    }
  }
  return { vertices, triangles };
}

const meshes = [
  mesh((a, b) => corticalPoint(a, b, 1), 208, 304, { dir: -1, intensity: 1 }),
  mesh((a, b) => corticalPoint(a, b, -1), 208, 304, {
    dir: 1,
    intensity: 0.92,
  }),
  mesh((a, b) => cerebellumPoint(a, b, 1), 60, 104, {
    dir: -1,
    intensity: 0.8,
  }),
  mesh((a, b) => cerebellumPoint(a, b, -1), 60, 104, {
    dir: 1,
    intensity: 0.78,
  }),
  mesh(stemPoint, 28, 70, { dir: -1, intensity: 0.87 }),
];

const names = [
  "Right cerebral hemisphere",
  "Left cerebral hemisphere",
  "Right cerebellum",
  "Left cerebellum",
  "Brainstem",
];
const directions = [-1, 1, -1, 1, -1];
const gltf = {
  asset: {
    version: "2.0",
    generator: "Pantip Sentiment original procedural geometry",
    copyright: "CC0-1.0",
  },
  scene: 0,
  scenes: [{ name: "Pantip Brain", nodes: [] }],
  nodes: [],
  meshes: [],
  materials: [
    {
      name: "Deep navy cortex",
      pbrMetallicRoughness: {
        baseColorFactor: [0.035, 0.11, 0.19, 1],
        metallicFactor: 0.12,
        roughnessFactor: 0.5,
      },
    },
  ],
  buffers: [],
  bufferViews: [],
  accessors: [],
};
const buffers = [];
let length = 0;
function writeAccessor(
  data,
  target,
  componentType,
  type,
  components,
  bounds = {},
) {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const view =
    gltf.bufferViews.push({
      buffer: 0,
      byteOffset: length,
      byteLength: bytes.length,
      target,
    }) - 1;
  buffers.push(bytes);
  length += bytes.length;
  const padding = (4 - (length % 4)) % 4;
  if (padding) {
    buffers.push(Buffer.alloc(padding));
    length += padding;
  }
  return (
    gltf.accessors.push({
      bufferView: view,
      componentType,
      count: data.length / components,
      type,
      ...bounds,
    }) - 1
  );
}
for (const [i, { vertices, triangles }] of meshes.entries()) {
  const positions = new Float32Array(vertices.length * 3),
    normals = new Float32Array(positions.length);
  const lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity];
  for (const [j, v] of vertices.entries()) {
    positions.set(v.slice(0, 3), j * 3);
    normals.set(v.slice(3, 6), j * 3);
    for (let k = 0; k < 3; k++) {
      let value = positions[j * 3 + k];
      lo[k] = Math.min(lo[k], value);
      hi[k] = Math.max(hi[k], value);
    }
  }
  const indices = new Uint16Array(triangles);
  if (directions[i] < 0) {
    for (let j = 0; j < indices.length; j += 3)
      [indices[j + 1], indices[j + 2]] = [indices[j + 2], indices[j + 1]];
  }
  const pos = writeAccessor(positions, 34962, 5126, "VEC3", 3, {
    min: lo,
    max: hi,
  });
  const norm = writeAccessor(normals, 34962, 5126, "VEC3", 3);
  const ix = writeAccessor(indices, 34963, 5123, "SCALAR", 1);
  gltf.meshes.push({
    name: names[i],
    primitives: [
      { attributes: { POSITION: pos, NORMAL: norm }, indices: ix, material: 0 },
    ],
  });
  gltf.nodes.push({ name: names[i], mesh: i });
  gltf.scenes[0].nodes.push(i);
}
gltf.buffers.push({ byteLength: length });
const raw = Buffer.from(JSON.stringify(gltf));
const json = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 32);
raw.copy(json);
function header(...words) {
  const b = Buffer.alloc(4 * words.length);
  words.forEach((n, i) => b.writeUInt32LE(n, 4 * i));
  return b;
}
const bin = Buffer.concat(buffers);
const output = Buffer.concat([
  header(0x46546c67, 2, 28 + json.length + bin.length),
  header(json.length, 0x4e4f534a),
  json,
  header(bin.length, 0x004e4942),
  bin,
]);
mkdirSync(folder, { recursive: true });
writeFileSync(join(folder, "brain.glb"), output);
