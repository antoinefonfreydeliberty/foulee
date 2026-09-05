import type { RaceDayContent, RaceDayStats } from '@/lib/claude/race-day-prompt'
import { RACE_COURSE_INFO } from '@/lib/data/race-course'

// ---------------------------------------------------------------------------
// Email J-1 (veille de course). Fichier dédié pour ne pas alourdir ni risquer
// de régression sur le template hebdomadaire (email-builder.ts). Réutilise le
// design system Studio · Jour (header terracotta, footer, typographies).
// ---------------------------------------------------------------------------

export interface RaceDayEmailParams {
  firstName: string
  coachName: string
  goalTime:  string | null   // objectif renseigné par le coureur (rappel explicite dans l'email)
  content:   RaceDayContent
  stats:     RaceDayStats
  daysLeft:  number
  magicLink: string
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;')
}

// Filet de sécurité identique à email-builder.ts : le prompt interdit déjà les
// tirets cadratins/demi-cadratins, mais on nettoie défensivement tout texte IA
// avant insertion pour garantir qu'aucun (—) ni (–) ne subsiste dans l'email.
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

// Petit encart titré réutilisé pour les blocs stratégie / alimentation / mot du coach.
function section(eyebrow: string, title: string, innerHtml: string): string {
  return `
    <tr>
      <td style="background-color:#FFFFFF;padding:32px 40px 0 40px;">
        <p style="margin:0 0 4px 0;color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">${eyebrow}</p>
        <p style="margin:0 0 16px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;line-height:1.3;">${title}</p>
        ${innerHtml}
      </td>
    </tr>`
}

export function buildRaceDayEmailHtml(p: RaceDayEmailParams): string {
  const course = RACE_COURSE_INFO

  const preparation = paragraphsToHtml(sanitizeDashes(p.content.preparation_analysis))
  const strategy    = paragraphsToHtml(sanitizeDashes(p.content.race_strategy))
  const nutrition   = paragraphsToHtml(sanitizeDashes(p.content.nutrition))
  const motivation  = paragraphsToHtml(sanitizeDashes(p.content.motivation))
  const successMsg  = escapeHtml(sanitizeDashes(p.content.success_message))
  const targetPace  = p.content.target_pace ? escapeHtml(sanitizeDashes(p.content.target_pace)) : null

  // Estimation de réussite bornée défensivement (Claude peut déraper hors 0-100).
  const pct = Math.max(0, Math.min(100, Math.round(p.content.success_percentage ?? 0)))

  const jMinus     = `J&#8209;${p.daysLeft}`
  const preheader  = `Demain, c&#39;est le grand jour &#183; Ta strat&#233;gie pour Vannes-Auray &#183; Foul&#233;e`
  const distanceKm = course.distanceKm.toFixed(3).replace('.', ',')

  // Description du parcours (prose statique, une seule ligne fluide) et rappel de
  // l'objectif renseigné par le coureur.
  const courseDescription = escapeHtml(course.description.replace(/\s*\n\s*/g, ' '))
  const objective = p.goalTime ? escapeHtml(sanitizeDashes(p.goalTime)) : null

  // ── Bloc parcours (stats statiques, factuelles) ──────────────────────────
  const courseStats = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="31%" style="border:1px solid #DDD7CE;border-radius:12px;padding:18px 12px;text-align:center;background-color:#FFFFFF;vertical-align:middle;">
              <p style="margin:0 0 2px 0;color:#C5402C;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;letter-spacing:-1px;line-height:1;">${distanceKm}</p>
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:11px;">km</p>
            </td>
            <td width="3%" style="padding:0 5px;font-size:0;line-height:0;"></td>
            <td width="31%" style="border:1px solid #DDD7CE;border-radius:12px;padding:18px 12px;text-align:center;background-color:#FFFFFF;vertical-align:middle;">
              <p style="margin:0 0 2px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;letter-spacing:-1px;line-height:1;">+${course.elevationGainM}</p>
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:11px;">m D+</p>
            </td>
            <td width="3%" style="padding:0 5px;font-size:0;line-height:0;"></td>
            <td width="31%" style="border:1px solid #DDD7CE;border-radius:12px;padding:18px 12px;text-align:center;background-color:#FFFFFF;vertical-align:middle;">
              <p style="margin:0 0 2px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;letter-spacing:-1px;line-height:1;">-${course.elevationLossM}</p>
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:11px;">m D-</p>
            </td>
          </tr>
        </table>`

  // ── Bloc estimation de réussite (bienveillant, pas un verdict) ───────────
  const successBlock = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #DDD7CE;border-radius:12px;background-color:#F4F0EA;">
          <tr>
            <td style="padding:22px 24px;vertical-align:middle;" width="34%" align="center">
              <p style="margin:0 0 2px 0;color:#C5402C;font-family:Georgia,'Times New Roman',serif;font-size:40px;font-weight:700;letter-spacing:-1.5px;line-height:1;">${pct}%</p>
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.4;">estimation,<br>a prendre avec le sourire</p>
            </td>
            <td style="padding:22px 24px 22px 0;vertical-align:middle;">
              <p style="margin:0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;">${successMsg}</p>
            </td>
          </tr>
        </table>`

  // ── Bloc stratégie : allure cible + texte + points clés du parcours ──────
  const targetPaceHtml = targetPace ? `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
          <tr>
            <td style="background-color:#C5402C;border-radius:10px;padding:12px 20px;">
              <span style="color:rgba(255,255,255,0.75);font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Allure cible&#160;&#160;</span>
              <span style="color:#FFFFFF;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;">${targetPace}</span>
            </td>
          </tr>
        </table>` : ''

  const keyPointsRows = course.keyPoints.map((kp, i) => {
    const isLast = i === course.keyPoints.length - 1
    const kmLabel = String(kp.km).replace('.', ',')
    const note = ('note' in kp && kp.note) ? `<span style="color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:12px;"> &#183; ${escapeHtml(kp.note)}</span>` : ''
    return `
              <tr>
                <td style="padding:11px 18px;${isLast ? '' : 'border-bottom:1px solid #EDE8E1;'}">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="52" style="vertical-align:middle;">
                        <span style="color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;">km&#160;${kmLabel}</span>
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;">${escapeHtml(kp.label)}</span>${note}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`
  }).join('')

  const keyPointsHtml = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;border:1px solid #DDD7CE;border-radius:12px;background-color:#FFFFFF;">${keyPointsRows}
        </table>`

  // ── Template complet ─────────────────────────────────────────────────────
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>J-${p.daysLeft} - Vannes-Auray 2026 - Foul&#233;e</title>
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

    <!-- ═══ HEADER (bandeau J-1) ═══════════════════════════════════ -->
    <tr>
      <td style="background-color:#C5402C;border-radius:16px 16px 0 0;padding:36px 40px 40px 40px;">
        <p style="margin:0 0 14px 0;color:rgba(255,255,255,0.65);font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;line-height:1;">${jMinus} &nbsp;&#183;&nbsp; C&#39;est bient&#244;t l&#39;heure&#160;!</p>
        <h1 style="margin:0 0 12px 0;color:#FFFFFF;font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:700;letter-spacing:-0.5px;line-height:1.1;">Vannes-Auray 2026</h1>
        <p style="margin:0;color:rgba(255,255,255,0.78);font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:400;line-height:1.55;">Demain, c&#39;est le grand jour. Voici tout ce qu&#39;il te faut pour aborder la course sereinement.</p>
      </td>
    </tr>

    <!-- ═══ BODY : analyse de préparation ═════════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:36px 40px 0 40px;">
        <p style="margin:0 0 24px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;line-height:1.3;">Bonjour ${escapeHtml(p.firstName)},</p>
        ${preparation}
      </td>
    </tr>

    <!-- ═══ PARCOURS (stats + description) ════════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:20px 40px 0 40px;">
        <p style="margin:0 0 16px 0;color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Le parcours</p>
        ${courseStats}
        <p style="margin:18px 0 0 0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.75;">${courseDescription}</p>
      </td>
    </tr>

    <!-- ═══ ESTIMATION DE RÉUSSITE (+ rappel objectif) ════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:32px 40px 0 40px;">
        <p style="margin:0 0 4px 0;color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Tes chances sur ton objectif</p>
        ${objective ? `<p style="margin:0 0 16px 0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">Ton objectif&#160;: <strong style="color:#C5402C;">${objective}</strong></p>` : '<div style="height:12px;line-height:12px;font-size:0;">&#160;</div>'}
        ${successBlock}
      </td>
    </tr>

    <!-- ═══ STRATÉGIE DE COURSE ═══════════════════════════════════ -->
    ${section('Strat&#233;gie', 'Ta strat&#233;gie de course', `${targetPaceHtml}${strategy}${keyPointsHtml}`)}

    <!-- ═══ ALIMENTATION ══════════════════════════════════════════ -->
    ${section('Alimentation', 'Ce soir et demain matin', nutrition)}

    <!-- ═══ MOT DU COACH ══════════════════════════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:32px 40px 0 40px;">
        <p style="margin:0 0 4px 0;color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Le mot de ${escapeHtml(p.coachName)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;">
          <tr>
            <td style="border-left:3px solid #C5402C;padding:2px 0 2px 16px;">
              ${motivation}
              <p style="margin:6px 0 0 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-style:italic;font-weight:700;line-height:1.2;">${escapeHtml(p.coachName)}</p>
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:12px;">Ton coach IA &#183; Foul&#233;e</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ═══ CTA ════════════════════════════════════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:32px 40px 40px 40px;">
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
