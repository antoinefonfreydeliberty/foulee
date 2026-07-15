import type { TrainingSession } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailParams {
  firstName:       string
  coachName:       string
  coachAnalysis:   string
  stats:           { distance: number; sessions: number; avg_pace: string }
  nextWeekProgram: TrainingSession[]
  weekNumber:      number
  daysLeft:        number
  nextWeekStart:   string   // ISO date string of next Monday
  magicLink:       string
}

// ---------------------------------------------------------------------------
// Zone helpers
// ---------------------------------------------------------------------------

const ZONE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  endurance:       { color: '#1D4ED8', bg: '#EBF3FF', label: 'Z2 Endurance' },
  'fractionné':    { color: '#B45309', bg: '#FFF3E0', label: 'Z4 Seuil'     },
  'sortie longue': { color: '#2A6B50', bg: '#ECFDF5', label: 'Z1-Z2'        },
  récupération:    { color: '#2A6B50', bg: '#ECFDF5', label: 'Z1 Récup'     },
  repos:           { color: '#6B7280', bg: '#F3F4F6', label: 'Repos'        },
}

const DAY_OFFSETS: Record<string, number> = {
  lundi: 0, mardi: 1, mercredi: 2, jeudi: 3, vendredi: 4, samedi: 5, dimanche: 6,
}

function sessionDate(nextWeekStart: string, dayName: string): string {
  const base   = new Date(nextWeekStart)
  const offset = DAY_OFFSETS[dayName.toLowerCase()] ?? 0
  base.setDate(base.getDate() + offset)
  const label = base.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;')
}

// Filet de sécurité : le prompt Claude interdit déjà les tirets cadratins/demi-cadratins,
// mais on nettoie défensivement le texte IA avant insertion pour garantir qu'aucun
// tiret cadratin (—) ou demi-cadratin (–) ne subsiste dans l'email final.
function sanitizeDashes(str: string): string {
  return str.replace(/[–—]/g, '-').replace(/&(?:mdash|ndash|#8211|#8212);/g, '-')
}

function analysisToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 18px 0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.78;">${escapeHtml(p)}</p>`)
    .join('\n')
}

function renderSession(session: TrainingSession, nextWeekStart: string): string {
  const zone       = ZONE_CONFIG[session.type] ?? { color: '#6B7280', bg: '#F3F4F6', label: session.type }
  const dateLabel  = sessionDate(nextWeekStart, session.day)
  const detail     = session.distance_km > 0
    ? `${session.distance_km}&nbsp;km${session.duration_minutes > 0 ? ` &nbsp;&#183;&nbsp; ~${session.duration_minutes}&nbsp;min` : ''}`
    : session.description

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
      <tr>
        <td style="border:1px solid #DDD7CE;border-radius:12px;padding:18px 20px;background-color:#FFFFFF;">
          <p style="margin:0 0 3px 0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">${escapeHtml(dateLabel)}</p>
          <p style="margin:0 0 10px 0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:1.3;">${escapeHtml(session.label)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color:${zone.bg};border-radius:99px;padding:4px 11px;">
                <span style="color:${zone.color};font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;">${escapeHtml(zone.label)}</span>
              </td>
              <td style="padding-left:10px;">
                <span style="color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:12px;">${detail}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
}

// ---------------------------------------------------------------------------
// Main builder - selects template based on whether stats exist
// ---------------------------------------------------------------------------

export function buildEmailHtml(p: EmailParams): string {
  const hasStats  = p.stats.sessions > 0
  // Message d'accueil « semaine blanche » : réservé à la VRAIE semaine 1 sans données.
  // Au-delà (ex. semaine 5 sans séance loggée), une semaine à 0 séance ne doit jamais
  // prétendre que le programme démarre — texte neutre à la place.
  const isWelcomeWeek = !hasStats && p.weekNumber === 1
  const analysis  = sanitizeDashes(p.coachAnalysis)
  const weekLabel = `SEMAINE&#160;${p.weekNumber}&#160;/&#160;14`
  const jMinus    = `J&#8209;${p.daysLeft}`
  const preheader = hasStats
    ? `Semaine ${p.weekNumber} &#183; ${p.stats.distance > 0 ? p.stats.distance.toFixed(1) + '&#160;km' : '--'} cette semaine &#183; Foul&#233;e`
    : isWelcomeWeek
      ? `Semaine ${p.weekNumber} &#183; Ton programme d&#233;marre &#183; Foul&#233;e`
      : `Semaine ${p.weekNumber} &#183; Ton bilan de la semaine &#183; Foul&#233;e`

  const subtitle = isWelcomeWeek
    ? 'Ton programme d&#233;marre aujourd&#8217;hui.'
    : (analysis.split(/[.!?]/)[0]?.slice(0, 90) ?? 'La progression continue.') + '.'

  // État vide des stats : idem, on ne parle de « début de programme » qu'en semaine 1.
  const emptyStatsMessage = isWelcomeWeek
    ? 'Aucune sortie enregistr&#233;e pour l&#8217;instant&#160;: le programme commence maintenant. Tes premi&#232;res donn&#233;es appara&#238;tront ici d&#232;s la semaine prochaine.'
    : 'Aucune sortie enregistr&#233;e cette semaine.'

  const bodyParagraphs  = analysisToHtml(analysis)
  const sessionsHtml    = p.nextWeekProgram.map(s => renderSession(s, p.nextWeekStart)).join('')
  const nextWeekNum     = Math.min(p.weekNumber + 1, 14)
  const nextWeekRange   = (() => {
    const start = new Date(p.nextWeekStart)
    const end   = new Date(p.nextWeekStart)
    end.setDate(end.getDate() + 6)
    const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    return `Semaine&#160;${nextWeekNum} &#183; ${start.getDate()} - ${fmt.format(end)}`
  })()

  // ── Stats block ─────────────────────────────────────────────────────────

  const statsBlock = hasStats ? `
    <!-- ═══ STATS GRID ════════════════════════════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:32px 40px 0 40px;">
        <p style="margin:0 0 16px 0;color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Stats de la semaine</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="31%" style="border:1px solid #DDD7CE;border-radius:12px;padding:20px 16px;text-align:center;background-color:#FFFFFF;vertical-align:middle;">
              <p style="margin:0 0 2px 0;color:#C5402C;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;letter-spacing:-1px;line-height:1;">${p.stats.distance > 0 ? p.stats.distance.toFixed(1).replace('.', ',') : '--'}</p>
              <p style="margin:0 0 5px 0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;">km</p>
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:11px;">Distance</p>
            </td>
            <td width="3%" style="padding:0 5px;font-size:0;line-height:0;"></td>
            <td width="31%" style="border:1px solid #DDD7CE;border-radius:12px;padding:20px 16px;text-align:center;background-color:#FFFFFF;vertical-align:middle;">
              <p style="margin:0 0 2px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;letter-spacing:-1px;line-height:1;">${p.stats.sessions}</p>
              <p style="margin:0 0 5px 0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;">sortie${p.stats.sessions > 1 ? 's' : ''}</p>
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:11px;">S&#233;ances</p>
            </td>
            <td width="3%" style="padding:0 5px;font-size:0;line-height:0;"></td>
            <td width="31%" style="border:1px solid #DDD7CE;border-radius:12px;padding:20px 16px;text-align:center;background-color:#FFFFFF;vertical-align:middle;">
              <p style="margin:0 0 2px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;letter-spacing:-1px;line-height:1;">${escapeHtml(p.stats.avg_pace !== '--\'--"' ? p.stats.avg_pace : '--')}</p>
              <p style="margin:0 0 5px 0;color:#160E08;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;">/km</p>
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:11px;">Allure moy.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : `
    <!-- ═══ STATS - ETAT VIDE ════════════════════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:32px 40px 0 40px;">
        <p style="margin:0 0 16px 0;color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Stats de la semaine</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background-color:#F4F0EA;border-left:3px solid #C5402C;border-radius:0 12px 12px 0;padding:20px 24px;">
              <p style="margin:0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;">${emptyStatsMessage}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`

  // ── Full template ────────────────────────────────────────────────────────

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Semaine ${p.weekNumber} - Vannes-Auray 2026 - Foul&#233;e</title>
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

    <!-- ═══ HEADER ════════════════════════════════════════════════ -->
    <tr>
      <td style="background-color:#C5402C;border-radius:16px 16px 0 0;padding:36px 40px 40px 40px;">
        <p style="margin:0 0 14px 0;color:rgba(255,255,255,0.65);font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;line-height:1;">${weekLabel} &nbsp;&#183;&nbsp; ${jMinus}</p>
        <h1 style="margin:0 0 12px 0;color:#FFFFFF;font-family:Georgia,'Times New Roman',serif;font-size:38px;font-weight:700;letter-spacing:-0.5px;line-height:1.1;">Vannes-Auray 2026</h1>
        <p style="margin:0;color:rgba(255,255,255,0.78);font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:400;line-height:1.55;">${subtitle}</p>
      </td>
    </tr>

    <!-- ═══ BODY ══════════════════════════════════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:36px 40px 0 40px;">
        <p style="margin:0 0 24px 0;color:#160E08;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;line-height:1.3;">Bonjour ${escapeHtml(p.firstName)},</p>
        ${bodyParagraphs}
      </td>
    </tr>

    ${statsBlock}

    <!-- ═══ PROGRAMME ══════════════════════════════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:32px 40px 0 40px;">
        <p style="margin:0 0 4px 0;color:#C5402C;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;">Programme</p>
        <p style="margin:0 0 18px 0;color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:12px;">${nextWeekRange}</p>
        ${sessionsHtml || `<p style="color:#6E5E55;font-family:Arial,Helvetica,sans-serif;font-size:13px;">Programme en cours de g&#233;n&#233;ration.</p>`}
      </td>
    </tr>

    <!-- ═══ SIGNATURE ══════════════════════════════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:32px 40px 0 40px;">
        <a href="${p.magicLink}" style="display:inline-block;background-color:#C5402C;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;padding:14px 28px;margin-bottom:32px;">
          Ouvrir mon dashboard &#8594;
        </a>
      </td>
    </tr>

    <tr>
      <td style="background-color:#FFFFFF;padding:0 40px 40px 40px;">
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

    <!-- ═══ DIVISEUR ══════════════════════════════════════════════ -->
    <tr>
      <td style="background-color:#FFFFFF;padding:0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border-top:1px solid #DDD7CE;font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>
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
