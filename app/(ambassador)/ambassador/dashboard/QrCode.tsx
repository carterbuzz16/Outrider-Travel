import QRCode from "qrcode";

/**
 * The referral link as a QR code, drawn here on the server from the qrcode
 * package's module matrix (pinned in package.json): no third-party image
 * service ever sees the link, and no markup string is injected. Black on
 * white with the standard four-module quiet zone, whatever the page's scheme,
 * because that is what phone cameras read best.
 */
export default function QrCode({ value, label }: { value: string; label: string }) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const quiet = 4;
  const view = modules.size + quiet * 2;
  let d = "";
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (modules.get(row, col)) d += `M${col + quiet} ${row + quiet}h1v1h-1z`;
    }
  }
  return (
    <svg
      viewBox={`0 0 ${view} ${view}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className="block h-auto w-full"
    >
      <rect width={view} height={view} fill="#ffffff" />
      <path d={d} fill="#000000" />
    </svg>
  );
}
