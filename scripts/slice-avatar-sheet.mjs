import sharp from "sharp";

const SRC = "public/avatar-sheet-new.png";

function isPageBg(r, g, b) {
  return r > 235 && g > 230 && b > 210 && Math.abs(r - g) < 35 && Math.abs(g - b) < 45;
}

async function main() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const w = info.width;
  const h = info.height;
  const midX = Math.floor(w / 2);
  const midY = Math.floor(h / 2);

  const regions = [
    { name: "a", x0: 0, y0: 0, x1: midX, y1: midY, out: "public/avatars/avatar-a.png" },
    { name: "b", x0: midX, y0: 0, x1: w, y1: midY, out: "public/avatars/avatar-b.png" },
    { name: "c", x0: 0, y0: midY, x1: midX, y1: h, out: "public/avatars/avatar-c.png" },
    { name: "d", x0: midX, y0: midY, x1: w, y1: h, out: "public/avatars/avatar-d.png" },
  ];

  for (const reg of regions) {
    let minX = reg.x1;
    let minY = reg.y1;
    let maxX = reg.x0;
    let maxY = reg.y0;
    for (let y = reg.y0; y < reg.y1; y++) {
      for (let x = reg.x0; x < reg.x1; x++) {
        const i = (y * w + x) * 4;
        if (isPageBg(data[i], data[i + 1], data[i + 2])) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }

    const side = Math.min(maxX - minX + 1, maxY - minY + 1);
    // Only geometric inset past rounded corners — no pixel recolor
    const inset = Math.round(side * 0.1);
    const cx = Math.floor((minX + maxX) / 2);
    const cy = Math.floor((minY + maxY) / 2);
    const size = side - inset * 2;
    const left = cx - Math.floor(size / 2);
    const top = cy - Math.floor(size / 2);

    await sharp(SRC)
      .extract({ left, top, width: size, height: size })
      .resize(256, 256, { fit: "fill" })
      .png()
      .toFile(reg.out);

    // sample bg for meta (read only, no write)
    const raw = await sharp(reg.out).raw().toBuffer({ resolveWithObject: true });
    const sw = raw.info.width;
    const i = (12 * sw + 12) * 4;
    const hex =
      "#" +
      [raw.data[i], raw.data[i + 1], raw.data[i + 2]]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
    console.log(reg.name, { left, top, size }, "bg~", hex);
  }
}

main();
