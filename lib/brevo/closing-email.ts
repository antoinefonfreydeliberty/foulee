import type { ClosingPodiumEntry, ClosingStats, RaceResult } from '@/lib/claude/closing-prompt'

// ---------------------------------------------------------------------------
// Email de CLOTURE (jour de la course, semaine 14/14). Fichier dédié, même
// design system Studio · Jour que l'email hebdomadaire et l'email J-1, sans
// toucher email-builder.ts (non-régression sur les 13 emails hebdomadaires).
// Pas de section "programme semaine suivante" : le programme est terminé.
// ---------------------------------------------------------------------------

export interface ClosingEmailParams {
  firstName:     string
  coachName:     string
  coachAnalysis: string
  stats:         ClosingStats
  raceResult:    RaceResult | null            // null = course pas encore enregistrée
  podium:        ClosingPodiumEntry[]         // classement final par temps (identique dans les 4 emails)
  coachTips?:    { category: string; tip: string }[]
  magicLink:     string
}

const FEELING_EMOJI: Record<number, string> = { 1: '😓', 2: '😕', 3: '😐', 4: '😊', 5: '🔥' }

function escapeHtml(str: string): string {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;')
}

// Filet de sécurité identique aux autres templates : nettoie tout tiret cadratin
// (—) ou demi-cadratin (–) qui subsisterait dans le texte IA avant insertion.
function sanitizeDashes(str: string): string {
  return str.replace(/[–—]/g, '-').replace(/&(?:mdash|ndash|#8211|#8212);/g, '-')
}

function paragraphsToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 18px 0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.78;">${escapeHtml(p)}</p>`)
    .join('\n')
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

// Podium final : classé par temps de course. Les coureurs sans résultat
// enregistré sont affichés en fin de liste, sans médaille, avec une mention
// neutre (jamais culpabilisante).
function renderPodium(podium: ClosingPodiumEntry[]): string {
  if (!podium || podium.length === 0) return ''

  const rows = podium.map((e, i) => {
    const isLast = i === podium.length - 1
    const badge = e.hasResult && e.rang && MEDALS[e.rang]
      ? `<span style="font-size:20px;line-height:1;">${MEDALS[e.rang]}</span>`
      : e.hasResult && e.rang
        ? `<span style="color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">${e.rang}.</span>`
        : `<span style="color:#C5BCAF;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">&#183;</span>`
    const right = e.hasResult
      ? `<span style="color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">${escapeHtml(e.timeLabel ?? '')}</span>`
      : `<span style="color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:12px;">r&#233;sultat &#224; venir</span>`

    return `
              <tr>
                <td style="padding:13px 18px;${isLast ? '' : 'border-bottom:1px solid #EDE8E1;'}">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="34" style="vertical-align:middle;">${badge}</td>
                      <td style="vertical-align:middle;">
                        <span style="color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">${escapeHtml(e.prenom)}</span>
                      </td>
                      <td align="right" style="vertical-align:middle;white-space:nowrap;">${right}</td>
                    </tr>
                  </table>
                </td>
              </tr>`
  }).join('')

  return `
    <!-- ═══ PODIUM FINAL (par temps de course) ════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:32px 40px 8px 40px;">
        <p style="margin:0 0 4px 0;color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Podium</p>
        <p style="margin:0 0 16px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;line-height:1.3;">Le podium de la course</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #DDD7CE;border-radius:12px;background-color:#FFFFFF;">${rows}
        </table>
        <p style="margin:12px 0 0 0;color:#9A8D84;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;">Class&#233; par temps de course sur le semi.</p>
      </td>
    </tr>`
}

function renderTips(tips?: { category: string; tip: string }[]): string {
  if (!tips || tips.length === 0) return ''
  const rows = tips.map((t, i) => {
    const isLast = i === tips.length - 1
    return `
              <tr>
                <td style="padding:13px 18px;${isLast ? '' : 'border-bottom:1px solid #EDE8E1;'}">
                  <p style="margin:0 0 2px 0;color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">${escapeHtml(sanitizeDashes(t.category))}</p>
                  <p style="margin:0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;">${escapeHtml(sanitizeDashes(t.tip))}</p>
                </td>
              </tr>`
  }).join('')

  return `
    <!-- ═══ ET MAINTENANT (conseils post-course) ══════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:32px 40px 0 40px;">
        <p style="margin:0 0 4px 0;color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Et maintenant</p>
        <p style="margin:0 0 16px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;line-height:1.3;">Apr&#232;s la course</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #DDD7CE;border-radius:12px;background-color:#FFFFFF;">${rows}
        </table>
      </td>
    </tr>`
}

export function buildClosingEmailHtml(p: ClosingEmailParams): string {
  const analysis  = sanitizeDashes(p.coachAnalysis)
  const body      = paragraphsToHtml(analysis)
  const preheader = `C&#39;est fait &#183; Ton bilan des 14 semaines &#183; Foul&#233;e`
  const subtitle  = (analysis.split(/[.!?]/)[0]?.slice(0, 90) ?? 'Bravo pour ces 14 semaines.') + '.'

  const kmLabel   = p.stats.totalKm > 0 ? p.stats.totalKm.toFixed(1).replace('.', ',') : '--'
  const longLabel = p.stats.longestRunKm > 0 ? p.stats.longestRunKm.toFixed(1).replace('.', ',') : '--'

  // ── Hero : résultat du jour J, ou invitation à l'enregistrer ─────────────
  const heroBlock = p.raceResult
    ? `
    <tr>
      <td style="background-color:#FFFFFF;padding:36px 40px 0 40px;">
        <p style="margin:0 0 4px 0;color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Ton r&#233;sultat</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #DDD7CE;border-radius:12px;background-color:#F4F0EA;margin-top:12px;">
          <tr>
            <td style="padding:24px 26px;vertical-align:middle;" align="center" width="42%">
              <p style="margin:0 0 2px 0;color:#C5402C;font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:700;letter-spacing:-1.5px;line-height:1;">${escapeHtml(p.raceResult.durationLabel)}</p>
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:11px;">sur le semi ${p.raceResult.feeling ? `&#183; ${FEELING_EMOJI[p.raceResult.feeling] ?? ''}` : ''}</p>
            </td>
            <td style="padding:24px 26px 24px 0;vertical-align:middle;">
              <p style="margin:0 0 6px 0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;">${p.raceResult.distanceKm.toFixed(1).replace('.', ',')}&#160;km parcourus</p>
              ${p.raceResult.pace ? `<p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:14px;">Allure moyenne&#160;: <strong style="color:#160E08;">${escapeHtml(p.raceResult.pace)}</strong></p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : `
    <tr>
      <td style="background-color:#FFFFFF;padding:36px 40px 0 40px;">
        <p style="margin:0 0 4px 0;color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Ta course</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
          <tr>
            <td style="background-color:#F4F0EA;border-left:3px solid #C5402C;border-radius:0 12px 12px 0;padding:20px 24px;">
              <p style="margin:0 0 10px 0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;">On n&#39;a pas encore ton r&#233;sultat de course. Enregistre-le sur ton dashboard pour compl&#233;ter ton bilan et retrouver ta course dans ton journal.</p>
              <a href="${p.magicLink}" style="display:inline-block;background-color:#C5402C;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;text-decoration:none;border-radius:10px;padding:11px 22px;">
                Enregistrer ma course &#8594;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`

  // ── Bilan global 14 semaines (grille 3 colonnes) ─────────────────────────
  const statsBlock = `
    <tr>
      <td style="background-color:#FFFFFF;padding:32px 40px 0 40px;">
        <p style="margin:0 0 16px 0;color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Ton bilan des 14 semaines</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="31%" style="border:1px solid #DDD7CE;border-radius:12px;padding:20px 12px;text-align:center;background-color:#FFFFFF;vertical-align:middle;">
              <p style="margin:0 0 2px 0;color:#C5402C;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;letter-spacing:-1px;line-height:1;">${kmLabel}</p>
              <p style="margin:0 0 5px 0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;">km au total</p>
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:11px;">${p.stats.sessions}&#160;s&#233;ances</p>
            </td>
            <td width="3%" style="padding:0 5px;font-size:0;line-height:0;"></td>
            <td width="31%" style="border:1px solid #DDD7CE;border-radius:12px;padding:20px 12px;text-align:center;background-color:#FFFFFF;vertical-align:middle;">
              <p style="margin:0 0 2px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;letter-spacing:-1px;line-height:1;">${longLabel}</p>
              <p style="margin:0 0 5px 0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;">km max</p>
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:11px;">plus longue sortie</p>
            </td>
            <td width="3%" style="padding:0 5px;font-size:0;line-height:0;"></td>
            <td width="31%" style="border:1px solid #DDD7CE;border-radius:12px;padding:20px 12px;text-align:center;background-color:#FFFFFF;vertical-align:middle;">
              <p style="margin:0 0 2px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;letter-spacing:-1px;line-height:1;">${p.stats.weeksTrained}</p>
              <p style="margin:0 0 5px 0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;">/ 14 sem.</p>
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:11px;">actives</p>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0 0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:12px;">Allure moyenne globale&#160;: <strong style="color:#160E08;">${escapeHtml(p.stats.avgPace)}</strong></p>
      </td>
    </tr>`

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Ton bilan - Vannes-Auray 2026 - Foul&#233;e</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F0EA;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F0EA;">
<tr>
<td align="center" style="padding:28px 16px 48px 16px;">

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

    <!-- PRE-HEADER invisible -->
    <tr>
      <td style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F4F0EA;">
        ${preheader}
      </td>
    </tr>

    <!-- ═══ HEADER (bilan final) ═══════════════════════════════════ -->
    <tr>
      <td style="background-color:#C5402C;border-radius:16px 16px 0 0;padding:36px 40px 40px 40px;">
        <p style="margin:0 0 14px 0;color:rgba(255,255,255,0.65);font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;line-height:1;">Bilan final &nbsp;&#183;&nbsp; Semaine 14 / 14</p>
        <h1 style="margin:0 0 12px 0;color:#FFFFFF;font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:700;letter-spacing:-0.5px;line-height:1.1;">Vannes-Auray 2026</h1>
        <p style="margin:0;color:rgba(255,255,255,0.78);font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:400;line-height:1.55;">${subtitle}</p>
      </td>
    </tr>

    <!-- ═══ BODY : bilan de clôture ═══════════════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:36px 40px 0 40px;">
        <p style="margin:0 0 24px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;line-height:1.3;">Bonjour ${escapeHtml(p.firstName)},</p>
        ${body}
      </td>
    </tr>

    ${heroBlock}

    ${statsBlock}

${renderPodium(p.podium)}
${renderTips(p.coachTips)}
    <!-- ═══ MOT DU COACH ══════════════════════════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:32px 40px 0 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-left:3px solid #C5402C;padding:2px 0 2px 16px;">
              <p style="margin:0 0 3px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-style:italic;font-weight:700;line-height:1.2;">${escapeHtml(p.coachName)}</p>
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:12px;">Ton coach IA &#183; Foul&#233;e</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ═══ CTA ════════════════════════════════════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:28px 40px 40px 40px;">
        <a href="${p.magicLink}" style="display:inline-block;background-color:#C5402C;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;padding:14px 28px;">
          Ouvrir mon dashboard &#8594;
        </a>
      </td>
    </tr>

    <!-- ═══ FOOTER ═════════════════════════════════════════════════ -->
    <tr>
      <td style="background-color:#EDE8E1;border-radius:0 0 16px 16px;padding:28px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <p style="margin:0 0 8px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;letter-spacing:-0.4px;">Foul&#233;e</p>
              <p style="margin:0 0 10px 0;color:#9A8D84;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.65;text-align:center;">Vous recevez cet email car vous utilisez Foul&#233;e.<br>&#169;&#160;2026 Foul&#233;e &#183; Tous droits r&#233;serv&#233;s</p>
              <a href="#" style="color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;text-decoration:underline;">Se d&#233;sabonner</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>
</td>
</tr>
</table>
</body>
</html>`
}
