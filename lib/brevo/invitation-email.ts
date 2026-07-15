interface BuildInvitationEmailParams {
  recipientName: string
  loginUrl: string
}

export function buildInvitationEmail({
  recipientName,
  loginUrl,
}: BuildInvitationEmailParams): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F0EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px 40px;">

  <!-- Header -->
  <div style="background:#C5402C;border-radius:16px 16px 0 0;padding:36px 32px;text-align:center;">
    <p style="color:rgba(255,255,255,0.75);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Semi-marathon · 13 septembre 2026</p>
    <h1 style="color:#ffffff;font-size:44px;font-weight:800;margin:0 0 8px;letter-spacing:-2px;line-height:1;">Foulée</h1>
    <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">Ton coach IA pour Vannes-Auray</p>
  </div>

  <!-- Body -->
  <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;border:1px solid #DDD7CE;border-top:none;">

    <!-- Salutation -->
    <p style="color:#160E08;font-size:17px;font-weight:700;margin:0 0 12px;">Salut ${recipientName} 👋</p>
    <p style="color:#6E5E55;font-size:15px;line-height:1.7;margin:0 0 24px;">Antoine t'a invité à rejoindre <strong style="color:#160E08;">Foulée</strong>, l'app qu'il a développée pour préparer ensemble le semi-marathon Vannes-Auray du 13 septembre.</p>

    <!-- Divider -->
    <hr style="border:none;border-top:1px solid #EDE8E1;margin:0 0 24px;">

    <!-- C'est quoi -->
    <p style="color:#C5402C;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 8px;">C'est quoi</p>
    <p style="color:#160E08;font-size:15px;font-weight:700;margin:0 0 8px;">Un coach IA qui s'adapte chaque semaine</p>
    <p style="color:#6E5E55;font-size:14px;line-height:1.7;margin:0 0 24px;">Foulée génère un programme sur mesure basé sur ton niveau et tes disponibilités. Il évolue chaque semaine selon tes sorties réelles, pas selon ce que tu étais censé faire.</p>

    <!-- Coaches -->
    <p style="color:#C5402C;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 12px;">Ton coach</p>
    <p style="color:#6E5E55;font-size:14px;margin:0 0 12px;">Tu choisis ton style d'accompagnement à l'inscription :</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
      <tr>
        <td style="width:50%;padding:0 6px 12px 0;vertical-align:top;">
          <div style="background:#FDF8F3;border:1px solid #EDE8E1;border-radius:10px;padding:14px;">
            <div style="width:32px;height:32px;border-radius:50%;background:#C5402C;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;margin-bottom:8px;">M</div>
            <p style="color:#160E08;font-size:14px;font-weight:700;margin:0 0 2px;">Marc</p>
            <p style="color:#6E5E55;font-size:12px;margin:0;">Direct, factuel</p>
          </div>
        </td>
        <td style="width:50%;padding:0 0 12px 6px;vertical-align:top;">
          <div style="background:#FDF8F3;border:1px solid #EDE8E1;border-radius:10px;padding:14px;">
            <div style="width:32px;height:32px;border-radius:50%;background:#C5402C;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;margin-bottom:8px;">L</div>
            <p style="color:#160E08;font-size:14px;font-weight:700;margin:0 0 2px;">Léa</p>
            <p style="color:#6E5E55;font-size:12px;margin:0;">Chaleureuse, bienveillante</p>
          </div>
        </td>
      </tr>
      <tr>
        <td style="width:50%;padding:0 6px 0 0;vertical-align:top;">
          <div style="background:#FDF8F3;border:1px solid #EDE8E1;border-radius:10px;padding:14px;">
            <div style="width:32px;height:32px;border-radius:50%;background:#C5402C;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;margin-bottom:8px;">T</div>
            <p style="color:#160E08;font-size:14px;font-weight:700;margin:0 0 2px;">Thomas</p>
            <p style="color:#6E5E55;font-size:12px;margin:0;">Technique, analytique</p>
          </div>
        </td>
        <td style="width:50%;padding:0 0 0 6px;vertical-align:top;">
          <div style="background:#FDF8F3;border:1px solid #EDE8E1;border-radius:10px;padding:14px;">
            <div style="width:32px;height:32px;border-radius:50%;background:#C5402C;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;margin-bottom:8px;">S</div>
            <p style="color:#160E08;font-size:14px;font-weight:700;margin:0 0 2px;">Sophie</p>
            <p style="color:#6E5E55;font-size:12px;margin:0;">Ludique, motivante</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Ce qui t'attend -->
    <p style="color:#C5402C;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 12px;">Ce qui t'attend</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
      <tr>
        <td style="padding:8px 0;vertical-align:top;border-bottom:1px solid #EDE8E1;">
          <p style="color:#160E08;font-size:14px;font-weight:700;margin:0 0 2px;">Mail du dimanche</p>
          <p style="color:#6E5E55;font-size:13px;margin:0;line-height:1.5;">Check-in hebdo + programme de la semaine suivante adapté à tes sorties</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;vertical-align:top;border-bottom:1px solid #EDE8E1;">
          <p style="color:#160E08;font-size:14px;font-weight:700;margin:0 0 2px;">Journal d'entraînement</p>
          <p style="color:#6E5E55;font-size:13px;margin:0;line-height:1.5;">Log tes sorties : distance, durée, ressenti, douleurs éventuelles</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;vertical-align:top;border-bottom:1px solid #EDE8E1;">
          <p style="color:#160E08;font-size:14px;font-weight:700;margin:0 0 2px;">Chat avec ton coach</p>
          <p style="color:#6E5E55;font-size:13px;margin:0;line-height:1.5;">Entraînement, récup, nutrition, motivation - à tout moment</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;vertical-align:top;">
          <p style="color:#160E08;font-size:14px;font-weight:700;margin:0 0 2px;">Vue groupe</p>
          <p style="color:#6E5E55;font-size:13px;margin:0;line-height:1.5;">Suis la progression d'Antoine, Hugo, Rémi et Alix en temps réel</p>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <a href="${loginUrl}" style="display:block;background:#C5402C;color:#ffffff;text-align:center;padding:18px;border-radius:13px;font-size:16px;font-weight:800;text-decoration:none;letter-spacing:-0.3px;margin:0 0 24px;">Rejoindre Foulée →</a>

    <p style="color:#6E5E55;font-size:13px;line-height:1.6;margin:0 0 8px;text-align:center;">Tu arrives sur la page de connexion avec ton email pré-rempli.<br>Clique sur "Recevoir mon code", entre le code, et c'est parti.</p>

  </div>

  <!-- Footer -->
  <p style="color:#C5BCAF;font-size:12px;text-align:center;margin:20px 0 0;line-height:1.6;">
    Vannes-Auray · 13 septembre 2026 · 21,1 km<br>
    Envoyé par Foulée · <a href="https://www.foulee.run" style="color:#C5BCAF;">foulee.run</a>
  </p>

</div>
</body>
</html>`
}
