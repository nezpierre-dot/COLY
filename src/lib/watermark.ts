/**
 * Adds a date/time watermark to an image file.
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

      const now = new Date();
      const dateStr = now.toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });

      const lines = [`📅 ${dateStr}`];
      if (coords) {
        lines.push(`📍 ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
      }

      const fontSize = Math.max(14, Math.round(img.width * 0.028));
      const padding = Math.round(fontSize * 0.7);
      const lineHeight = fontSize * 1.4;
      const boxHeight = lines.length * lineHeight + padding * 2;
      const boxWidth = Math.min(img.width, Math.round(img.width * 0.6));

      // Semi-transparent background
      const x = img.width - boxWidth - padding;
      const y = img.height - boxHeight - padding;
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.beginPath();
      ctx.roundRect(x, y, boxWidth, boxHeight, fontSize * 0.4);
      ctx.fill();

      // Text
      ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      lines.forEach((line, i) => {
        ctx.fillText(line, x + padding, y + padding + i * lineHeight);
      });

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
