/**
 * Minimal PNG icon yaratuvchi — tashqi paket kerak emas
 * Violet gradient bilan 512x512 PNG
 */
const fs   = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len  = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t    = Buffer.from(type);
  const crc  = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

const W = 512, H = 512;

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

// Raw image — violet gradient background
const raw = Buffer.alloc((W * 3 + 1) * H);
let offset = 0;
for (let y = 0; y < H; y++) {
  raw[offset++] = 0; // filter type
  for (let x = 0; x < W; x++) {
    const cx = x - W / 2, cy = y - H / 2;
    const dist = Math.sqrt(cx * cx + cy * cy) / (W / 2);
    const t = (x / W + y / H) / 2;

    // Violet to purple gradient
    const r = Math.round(124 + (168 - 124) * t);
    const g = Math.round(58  + (85  - 58)  * t);
    const b = Math.round(237);

    // Rounded rect alpha (simulate)
    const rx = Math.abs(x - W/2) / (W/2 - 40);
    const ry = Math.abs(y - H/2) / (H/2 - 40);
    const inside = Math.pow(rx, 8) + Math.pow(ry, 8) < 1;

    if (inside) {
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    } else {
      // Transparent-like border (white bg)
      raw[offset++] = 255;
      raw[offset++] = 255;
      raw[offset++] = 255;
    }
  }
}

// "XM" text — simple pixel font
const drawChar = (pixels, char, startX, startY, color) => {
  const CHARS = {
    X: [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],
    M: [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  };
  const bitmap = CHARS[char];
  if (!bitmap) return;
  const scale = 32;
  for (let row = 0; row < bitmap.length; row++) {
    for (let col = 0; col < bitmap[row].length; col++) {
      if (bitmap[row][col]) {
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = startX + col * scale + sx;
            const py = startY + row * scale + sy;
            if (px >= 0 && px < W && py >= 0 && py < H) {
              // pixels is raw buf; filter byte at start of each row
              const rowStart = py * (W * 3 + 1) + 1;
              const pos = rowStart + px * 3;
              pixels[pos] = color[0];
              pixels[pos + 1] = color[1];
              pixels[pos + 2] = color[2];
            }
          }
        }
      }
    }
  }
};

const textW = 5 * 32 * 2 + 20; // two chars
const textH = 5 * 32;
const startX = Math.floor((W - textW) / 2);
const startY = Math.floor((H - textH) / 2);
drawChar(raw, "X", startX, startY, [255, 255, 255]);
drawChar(raw, "M", startX + 5 * 32 + 20, startY, [255, 255, 255]);

const idat = zlib.deflateSync(raw);
const png  = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = path.join(__dirname, "icon.png");
fs.writeFileSync(out, png);
console.log("✅ icon.png yaratildi:", out, `(${Math.round(png.length/1024)}KB)`);
