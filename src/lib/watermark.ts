/**
 * Adds a date/time watermark + "Nidit" branding to an image file.
 * Returns a new File with the watermark applied.
 */
export const addWatermark = (file: File, coords?: { lat: number; lng: number } | null): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0);

      // --- Diagonal "Nidit" watermark pattern across the image ---
      const wmFontSize = Math.max(24, Math.round(img.width * 0.07));
      ctx.save();
      ctx.translate(img.width / 2, img.height / 2);
      ctx.rotate(-Math.PI / 6);
      ctx.font = `800 ${wmFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.10)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const spacing = wmFontSize * 3;
      const diagonal = Math.sqrt(img.width ** 2 + img.height ** 2);
      const repeats = Math.ceil(diagonal / spacing) + 2;

      for (let row = -repeats; row <= repeats; row++) {
        for (let col = -repeats; col <= repeats; col++) {
          ctx.fillText("Nidit", col * spacing * 2, row * spacing);
        }
      }
      ctx.restore();

      // --- Bottom-right info box ---
      const now = new Date();
      const dateStr = now.toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });

      const lines = [`Nidit • ${dateStr}`];
      if (coords) {
        lines.push(`📍 ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
      }

      const fontSize = Math.max(14, Math.round(img.width * 0.028));
      const padding = Math.round(fontSize * 0.7);
      const lineHeight = fontSize * 1.4;
      const boxHeight = lines.length * lineHeight + padding * 2;

      // Measure actual text width
      ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
      const maxTextWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const boxWidth = maxTextWidth + padding * 2;

      const x = img.width - boxWidth - padding;
      const y = img.height - boxHeight - padding;
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, fontSize * 0.4);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      lines.forEach((line, i) => {
        ctx.fillText(line, x + padding, y + padding + i * lineHeight);
      });

      // --- Nidit logo mark (small "N" badge) top-left of info box ---
      const badgeSize = Math.round(fontSize * 1.8);
      const bx = x - badgeSize - padding * 0.5;
      const by = y + (boxHeight - badgeSize) / 2;
      ctx.fillStyle = "rgba(81, 141, 198, 0.85)";
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeSize, badgeSize, badgeSize * 0.25);
      ctx.fill();

      ctx.font = `800 ${Math.round(badgeSize * 0.55)}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("N", bx + badgeSize / 2, by + badgeSize / 2);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => reject(new Error("Failed to load image for watermark"));
    img.src = URL.createObjectURL(file);
  });
};
