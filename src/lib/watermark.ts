import QRCode from "qrcode";

/**
 * Generates a unique proof verification ID.
 */
const generateProofId = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
};

/**
 * Adds a date/time watermark, "Nidit" branding, and a unique QR code to an image file.
 * Returns { file, proofId } with the watermarked File and the unique proof ID.
 */
export const addWatermark = async (
  file: File,
  coords?: { lat: number; lng: number } | null
): Promise<{ file: File; proofId: string }> => {
  const proofId = generateProofId();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve({ file, proofId }); return; }

      ctx.drawImage(img, 0, 0);

      // --- Diagonal "Nidit" watermark pattern ---
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

      const lines = [`Nidit • ${dateStr}`, `🔑 ${proofId}`];
      if (coords) {
        lines.push(`📍 ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
      }

      const fontSize = Math.max(14, Math.round(img.width * 0.028));
      const padding = Math.round(fontSize * 0.7);
      const lineHeight = fontSize * 1.4;
      const boxHeight = lines.length * lineHeight + padding * 2;

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

      // --- Nidit badge ---
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

      // --- QR Code (top-left corner) ---
      try {
        const verificationUrl = `https://nidit.app/verify/${proofId}`;
        const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: Math.max(80, Math.round(img.width * 0.12)),
          margin: 1,
          color: { dark: "#1a2279", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });

        const qrImg = new Image();
        qrImg.onload = () => {
          const qrSize = qrImg.width;
          const qrPadding = Math.round(padding * 1.5);
          const qrX = qrPadding;
          const qrY = qrPadding;

          // Background for QR
          ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
          ctx.beginPath();
          ctx.roundRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 28, 8);
          ctx.fill();

          // Draw QR
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

          // Label under QR
          const labelSize = Math.max(8, Math.round(fontSize * 0.6));
          ctx.font = `600 ${labelSize}px system-ui, -apple-system, sans-serif`;
          ctx.fillStyle = "#1a2279";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText("Vérifier", qrX + qrSize / 2, qrY + qrSize + 4);

          canvas.toBlob(
            (blob) => {
              if (!blob) { resolve({ file, proofId }); return; }
              resolve({ file: new File([blob], file.name, { type: "image/jpeg" }), proofId });
            },
            "image/jpeg",
            0.92
          );
        };
        qrImg.onerror = () => {
          // Fallback without QR
          canvas.toBlob(
            (blob) => {
              if (!blob) { resolve({ file, proofId }); return; }
              resolve({ file: new File([blob], file.name, { type: "image/jpeg" }), proofId });
            },
            "image/jpeg",
            0.92
          );
        };
        qrImg.src = qrDataUrl;
      } catch {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve({ file, proofId }); return; }
            resolve({ file: new File([blob], file.name, { type: "image/jpeg" }), proofId });
          },
          "image/jpeg",
          0.92
        );
      }
    };
    img.onerror = () => reject(new Error("Failed to load image for watermark"));
    img.src = URL.createObjectURL(file);
  });
};
