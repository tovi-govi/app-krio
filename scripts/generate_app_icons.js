const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const projectRoot = path.resolve(__dirname, "..");
const logoPath = path.join(projectRoot, "assets", "logos", "krio-logo.png");
const iconPath = path.join(projectRoot, "assets", "icon.png");
const adaptiveIconPath = path.join(projectRoot, "assets", "adaptive-icon.png");
const splashPath = path.join(projectRoot, "assets", "splash.png");

async function generateIcons() {
  console.log("Generating high-resolution, unclipped app icons...");

  // 1. Prepare centered logo artwork for 1024x1024 canvas
  // Logo dimensions: 680px width, aspect height ~453px
  const resizedLogoBuffer = await sharp(logoPath)
    .resize({ width: 680, height: 453, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Create a rounded white badge container (760x520) behind logo for maximum contrast
  const whiteBadgeSvg = Buffer.from(`
    <svg width="760" height="520">
      <rect x="0" y="0" width="760" height="520" rx="40" ry="40" fill="#FFFFFF"/>
    </svg>
  `);
  const whiteBadgeBuffer = await sharp(whiteBadgeSvg).png().toBuffer();

  // Create 1024x1024 dark blue background (#0f2d6b)
  const bgBuffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 15, g: 45, b: 107, alpha: 1 } // #0f2d6b
    }
  }).png().toBuffer();

  // Composite white badge + logo on 1024x1024 background -> assets/icon.png
  await sharp(bgBuffer)
    .composite([
      { input: whiteBadgeBuffer, top: 252, left: 132 },
      { input: resizedLogoBuffer, top: 285, left: 172 }
    ])
    .toFile(iconPath);
  console.log("Created: assets/icon.png (1024x1024)");

  // 2. Generate Adaptive Foreground Icon (1024x1024 transparent) -> assets/adaptive-icon.png
  // Android safe zone is inner 66% circle (radius ~341px from center).
  // Logo inside white badge resized to 560x385 (fits well inside 66% safe zone)
  const adaptiveLogoBuffer = await sharp(logoPath)
    .resize({ width: 520, height: 346, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const adaptiveBadgeSvg = Buffer.from(`
    <svg width="600" height="420">
      <rect x="0" y="0" width="600" height="420" rx="36" ry="36" fill="#FFFFFF"/>
    </svg>
  `);
  const adaptiveBadgeBuffer = await sharp(adaptiveBadgeSvg).png().toBuffer();

  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite([
    { input: adaptiveBadgeBuffer, top: 302, left: 212 },
    { input: adaptiveLogoBuffer, top: 339, left: 252 }
  ])
  .toFile(adaptiveIconPath);
  console.log("Created: assets/adaptive-icon.png (1024x1024)");

  // 3. Generate Splash Screen (1242x2436) -> assets/splash.png
  const splashBg = await sharp({
    create: {
      width: 1242,
      height: 2436,
      channels: 4,
      background: { r: 15, g: 45, b: 107, alpha: 1 }
    }
  }).png().toBuffer();

  const splashBadgeSvg = Buffer.from(`
    <svg width="780" height="540">
      <rect x="0" y="0" width="780" height="540" rx="44" ry="44" fill="#FFFFFF"/>
    </svg>
  `);
  const splashBadgeBuffer = await sharp(splashBadgeSvg).png().toBuffer();

  const splashLogoBuffer = await sharp(logoPath)
    .resize({ width: 700, height: 466, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp(splashBg)
    .composite([
      { input: splashBadgeBuffer, top: 948, left: 231 },
      { input: splashLogoBuffer, top: 985, left: 271 }
    ])
    .toFile(splashPath);
  console.log("Created: assets/splash.png (1242x2436)");

  console.log("All app icons generated successfully!");
}

generateIcons().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
