import sharp from "sharp";

/** Outer frame: near-black OR dark gray scrap */
function isDarkFrame(r, g, b, a = 255) {
  if (a < 200) return true;
  return Math.max(r, g, b) < 72;
}

function isNearBlack(r, g, b, a = 255) {
  return a > 200 && r < 40 && g < 40 && b < 40;
}

function colorDist(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function findContentBox(data, w, h) {
  const darkRow = (y) => {
    let c = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (isDarkFrame(data[i], data[i + 1], data[i + 2], data[i + 3])) c++;
    }
    return c / w > 0.72;
  };
  const darkCol = (x) => {
    let c = 0;
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      if (isDarkFrame(data[i], data[i + 1], data[i + 2], data[i + 3])) c++;
    }
    return c / h > 0.72;
  };

  let top = 0;
  let bottom = h - 1;
  let left = 0;
  let right = w - 1;
  while (top < h && darkRow(top)) top++;
  while (bottom > top && darkRow(bottom)) bottom--;
  while (left < w && darkCol(left)) left++;
  while (right > left && darkCol(right)) right--;

  // peel remaining thin black rim (1-4px)
  for (let k = 0; k < 6; k++) {
    let peel = false;
    const samples = [
      [left, top],
      [right, top],
      [left, bottom],
      [right, bottom],
      [Math.floor((left + right) / 2), top],
      [Math.floor((left + right) / 2), bottom],
      [left, Math.floor((top + bottom) / 2)],
      [right, Math.floor((top + bottom) / 2)],
    ];
    for (const [x, y] of samples) {
      const i = (y * w + x) * 4;
      if (isNearBlack(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        peel = true;
        break;
      }
    }
    if (!peel) break;
    left += 1;
    top += 1;
    right -= 1;
    bottom -= 1;
  }

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function floodBg(data, w, h, thresh) {
  const mask = new Uint8Array(w * h);
  let seed = null;
  let sx = 0;
  let sy = 0;
  // Prefer bright corner pixel as seed (actual bg)
  const candidates = [
    [2, 2],
    [w - 3, 2],
    [2, h - 3],
    [w - 3, h - 3],
    [8, 8],
    [w - 9, 8],
  ];
  for (const [x, y] of candidates) {
    const i = (y * w + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (!isDarkFrame(r, g, b, data[i + 3]) && Math.max(r, g, b) > 120) {
      seed = [r, g, b];
      sx = x;
      sy = y;
      break;
    }
  }
  if (!seed) {
    seed = [data[0], data[1], data[2]];
  }

  const q = [[sx, sy]];
  mask[sy * w + sx] = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (mask[ni]) continue;
      const p = ni * 4;
      const col = [data[p], data[p + 1], data[p + 2]];
      // Include dark rim touching bg so outer black disappears
      if (isNearBlack(col[0], col[1], col[2], data[p + 3])) {
        // only absorb near-black if adjacent to already-marked bg or edge
        let ok = false;
        for (const [ax, ay] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const tx = nx + ax;
          const ty = ny + ay;
          if (tx < 0 || ty < 0 || tx >= w || ty >= h || mask[ty * w + tx]) {
            ok = true;
            break;
          }
        }
        if (ok) {
          mask[ni] = 1;
          q.push([nx, ny]);
        }
        continue;
      }
      if (colorDist(col, seed) <= thresh) {
        mask[ni] = 1;
        q.push([nx, ny]);
      }
    }
  }
  return { mask, seed };
}

async function processAvatar(src, out, bgHex, thresh = 55, size = 250) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const ow = info.width;
  const oh = info.height;
  const box = findContentBox(data, ow, oh);
  console.log(src, "content box", box);

  const cropped = await sharp(data, {
    raw: { width: ow, height: oh, channels: 4 },
  })
    .extract(box)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = cropped.info.width;
  const h = cropped.info.height;
  const buf = Buffer.from(cropped.data);

  const { mask, seed } = floodBg(buf, w, h, thresh);
  console.log(src, "seed bg", seed, "mask%", ((mask.reduce((a, b) => a + b, 0) / mask.length) * 100).toFixed(1));

  const hex = bgHex.replace("#", "");
  const br = parseInt(hex.slice(0, 2), 16);
  const bg = parseInt(hex.slice(2, 4), 16);
  const bb = parseInt(hex.slice(4, 6), 16);

  for (let i = 0; i < w * h; i++) {
    if (!mask[i]) continue;
    const p = i * 4;
    buf[p] = br;
    buf[p + 1] = bg;
    buf[p + 2] = bb;
    buf[p + 3] = 255;
  }

  // Force any leftover dark frame pixels at the absolute edge to new bg
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x > 1 && y > 1 && x < w - 2 && y < h - 2) continue;
      const p = (y * w + x) * 4;
      if (isDarkFrame(buf[p], buf[p + 1], buf[p + 2], buf[p + 3])) {
        buf[p] = br;
        buf[p + 1] = bg;
        buf[p + 2] = bb;
        buf[p + 3] = 255;
      }
    }
  }

  await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .resize(size, size, { kernel: sharp.kernel.nearest, fit: "cover" })
    .png()
    .toFile(out);

  const v = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => {
    const i = (y * v.info.width + x) * 4;
    return [v.data[i], v.data[i + 1], v.data[i + 2]];
  };
  console.log(" ->", out, "corners", at(1, 1), at(20, 20), at(230, 20));
}

// c: sunglasses — mint green (distinct from purple/cyan)
await processAvatar(
  "public/avatars/male-1.png",
  "public/avatars/avatar-c.png",
  "#98ebc4",
  60,
);

// d: yellow beanie (replaces pink twin-tails) — soft peach
await processAvatar(
  "public/avatars/male-3.png",
  "public/avatars/avatar-d.png",
  "#ffb89a",
  55,
);

console.log("done");
