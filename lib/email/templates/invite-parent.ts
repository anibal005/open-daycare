export function buildInviteParentEmail({
  inviteeName,
  childName,
  daycareName,
  relationshipLabel,
  inviteCode,
  inviteUrl,
}: {
  inviteeName: string;
  childName: string;
  daycareName: string;
  relationshipLabel: string;
  inviteCode: string;
  inviteUrl: string;
}) {
  const subject = `Invitación para seguir el día de ${childName}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7dac8;">
          <tr>
            <td style="padding:32px 32px 16px 32px;">
              <h1 style="margin:0;font-size:24px;color:#3f362e;">OpenDayCare</h1>
              <p style="margin:12px 0 0 0;font-size:16px;color:#6e6359;">Hola ${inviteeName},</p>
              <p style="margin:12px 0 0 0;font-size:16px;line-height:24px;color:#3f362e;">
                Te invitaron a seguir el día de <strong>${childName}</strong> en <strong>${daycareName}</strong> como <strong>${relationshipLabel}</strong>.
              </p>
              <p style="margin:16px 0 0 0;font-size:16px;line-height:24px;color:#3f362e;">
                Usá el siguiente código de invitación para activar tu cuenta:
              </p>
              <div style="margin:20px 0;text-align:center;padding:20px;background:#f7f3ee;border-radius:12px;border:1px dashed #d8cbba;">
                <div style="font-size:14px;letter-spacing:6px;text-transform:uppercase;color:#8a7c6d;">CÓDIGO DE INVITACIÓN</div>
                <div style="margin-top:8px;font-size:36px;letter-spacing:12px;font-weight:bold;color:#3f362e;">${inviteCode}</div>
                <div style="margin-top:8px;font-size:14px;color:#8a7c6d;">Vence en 7 días</div>
              </div>
              <p style="text-align:center;margin:24px 0 0 0;">
                <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(180deg,#F4977E 0%,#EE8164 100%);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:14px;font-weight:bold;font-size:16px;">Activar mi cuenta</a>
              </p>
              <p style="margin:16px 0 0 0;font-size:14px;line-height:22px;color:#6e6359;">
                Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br />
                <a href="${inviteUrl}" style="color:#d9583c;">${inviteUrl}</a>
              </p>
              <p style="margin:24px 0 0 0;font-size:14px;line-height:22px;color:#6e6359;">
                Si no esperabas esta invitación, podés ignorar este correo.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 32px 32px;text-align:center;font-size:13px;color:#8a7c6d;">
              © ${new Date().getFullYear()} OpenDayCare
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `OpenDayCare\n\nHola ${inviteeName},\n\nTe invitaron a seguir el día de ${childName} en ${daycareName} como ${relationshipLabel}.\n\nCódigo de invitación: ${inviteCode}\nVence en 7 días\n\nActivar mi cuenta: ${inviteUrl}\n\nSi no esperabas esta invitación, podés ignorar este correo.`;

  return { subject, html, text };
}
