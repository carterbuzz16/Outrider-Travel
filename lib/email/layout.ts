// Table-based layout with inline styles — not a stylistic choice, it's
// what's actually required for this to render consistently across email
// clients (Outlook desktop renders HTML via Word's engine, which ignores
// most modern CSS and strips <style> blocks in many contexts).
//
// Colors/wordmark here are a placeholder, not real brand assets — swap
// BRAND.name for a real <img> logo and adjust the palette once a proper
// brand pass happens.
const BRAND = {
  name: "OUTRIDER",
  navy: "#0F1B2D",
  gold: "#C9A227",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#E5E7EB",
  bg: "#F3F4F6",
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmailLayout(opts: { preheader: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string }) {
  const { bodyHtml, ctaLabel, ctaUrl } = opts;
  const preheader = escapeHtml(opts.preheader);

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `
    <tr>
      <td style="padding: 8px 32px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-radius: 6px; background-color: ${BRAND.navy};">
              <a href="${ctaUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 600; color: #FFFFFF; text-decoration: none;">${ctaLabel}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${BRAND.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.bg};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; border: 1px solid ${BRAND.border};">
          <tr>
            <td style="background-color: ${BRAND.navy}; padding: 24px 32px;">
              <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; letter-spacing: 2px; color: ${BRAND.gold};">${BRAND.name}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 8px; color: ${BRAND.text}; font-size: 16px; line-height: 1.6;">
              ${bodyHtml}
            </td>
          </tr>
          ${ctaHtml}
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid ${BRAND.border}; color: ${BRAND.muted}; font-size: 12px; line-height: 1.5;">
              You're receiving this because you have a booking with Outrider. Questions? Just reply to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
