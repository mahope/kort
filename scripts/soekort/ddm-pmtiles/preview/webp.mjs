// PNG to WebP through a canvas in the browser (Chrome encodes WebP), so no image
// tool is needed. `clip` = [x, y, w, h] in source pixels, `centre` = [w, h] around
// the image centre; `scale` resizes.
export async function toWebp(browser, png, quality, { clip, centre, scale = 1 } = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const data = await page.evaluate(async ([b64, qual, clipBox, centreBox, s]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const [x, y, w, h] = centreBox
      ? [(img.width - centreBox[0]) / 2, (img.height - centreBox[1]) / 2, ...centreBox]
      : clipBox || [0, 0, img.width, img.height];
    const c = document.createElement("canvas");
    c.width = Math.round(w * s);
    c.height = Math.round(h * s);
    const g = c.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
    return c.toDataURL("image/webp", qual).split(",")[1];
  }, [png.toString("base64"), quality, clip || null, centre || null, scale]);
  await ctx.close();
  return Buffer.from(data, "base64");
}
