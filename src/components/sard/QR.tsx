import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Real, scannable QR code. High-contrast modules are required for phone cameras to read it. */
export function QR({ value, size = 180 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    if (!value) return;
    QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0a0c18", light: "#ffffff" } }).then(setSvg);
  }, [value]);
  return <div className="overflow-hidden rounded-xl bg-foreground p-2" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
