import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

export function Barcode128({ value, height = 48 }: { value: string; height?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    JsBarcode(ref.current, value, {
      format: "CODE128",
      height,
      width: 1.6,
      margin: 6,
      background: "#ffffff",
      lineColor: "#000000",
      fontOptions: "bold",
      fontSize: 13,
      font: "monospace",
    });
  }, [value, height]);
  return <svg ref={ref} className="rounded-sm bg-white" />;
}

export function QrCode({ value, size = 104 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
  }, [value, size]);
  return <canvas ref={ref} className="rounded-sm bg-white" />;
}
