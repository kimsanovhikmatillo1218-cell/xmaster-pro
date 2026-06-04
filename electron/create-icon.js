// Bu script icon.png yaratish uchun — node create-icon.js
// Agar sharp o'rnatilmagan bo'lsa, xm-icon.svg dan foydalaning
const fs = require("fs");
const path = require("path");

// SVG icon kontent
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed"/>
      <stop offset="100%" style="stop-color:#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#g1)"/>
  <text x="256" y="320" text-anchor="middle" font-family="Arial Black, sans-serif"
    font-size="220" font-weight="900" fill="white" letter-spacing="-10">XM</text>
</svg>`;

fs.writeFileSync(path.join(__dirname, "icon.svg"), svg);
console.log("icon.svg created");
