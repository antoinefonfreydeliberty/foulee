export type CoachStyle = 'warm' | 'direct' | 'technical' | 'playful'
export type RunnerLevel = 'beginner' | 'intermediate' | 'experienced'
export type PainLevel = 0 | 1 | 2
export type SessionType = 'endurance' | 'fractionné' | 'sortie longue' | 'récupération' | 'repos'
export type MessageRole = 'user' | 'assistant'

export interface Profile {
  id: string
  user_id: string
  first_name: string
  coach_name: string
  coach_style: CoachStyle
  weight_kg: number | null
  age: number | null
  runner_level: RunnerLevel | null
  weekly_sessions: number | null
  best_recent_time: string | null
  availability: string[]
  injury_history: string | null
  goal_time: string | null
  onboarding_completed: boolean
  created_at: string
}

export interface TrainingLog {
  id: string
  user_id: string
  date: string
  distance_km: number
  duration_minutes: number
  pace_per_km: string | null
  feeling: number | null
  pain_notes: string | null
  notes: string | null
  created_at: string
}

export interface WeeklyCheckin {
  id: string
  user_id: string
  week_start: string
  sessions_count: number | null
  total_distance_km: number | null
  feeling_score: number | null
  pain_level: PainLevel | null
  pain_notes: string | null
  free_word: string | null
  submitted_at: string
}

export interface TrainingSession {
  day: string
  type: SessionType | string
  label: string
  description: string
  distance_km: number
  duration_minutes: number
}

export interface WeeklyReport {
  id: string
  user_id: string
  week_start: string
  week_number: number
  coach_analysis: string
  email_body: string
  stats: {
    distance: number
    sessions: number
    avg_pace: string
  } | null
  next_week_program: TrainingSession[]
  coach_tips: CoachTip[] | null
  generated_at: string
  email_sent_at: string | null
}

export interface CoachTip {
  category: string
  tip: string
}

export interface TrainingProgram {
  id: string
  user_id: string
  week_start: string
  week_number: number
  sessions: TrainingSession[]
  total_volume_km: number | null
  focus: string | null
  generated_at: string
}

export interface CoachConversation {
  id: string
  user_id: string
  role: MessageRole
  content: string
  created_at: string
}

export interface GroupMember {
  first_name: string
  sessions_this_week: number
  km_this_week: number
  avg_pace_raw: number | null
}

// Une ligne du classement nominatif de la semaine (email hebdomadaire).
// km et sorties sont des données agrégées réelles : 0 est une valeur valide
// (la règle "jamais 0 km" ne s'applique pas ici, cf. Foulée.md).
export interface ClassementEntry {
  rang: number
  userId: string
  prenom: string
  km: number
  sorties: number
}

export interface ProgramWeek {
  week_number: number
  week_start: string
  focus: string
  total_volume_km: number
  sessions: TrainingSession[]
}

export const COACH_OPTIONS = [
  {
    name: 'Marc',
    style: 'direct' as CoachStyle,
    description: 'Direct, factuel, efficace',
    example: '32 km cette semaine. Allure en hausse. Programme de demain : 10 km à 5\'30".',
  },
  {
    name: 'Léa',
    style: 'warm' as CoachStyle,
    description: 'Chaleureuse, à l\'écoute',
    example: 'Trois sorties malgré la semaine chargée. C\'est exactement comme ça qu\'on construit quelque chose.',
  },
  {
    name: 'Thomas',
    style: 'technical' as CoachStyle,
    description: 'Technique, analytique',
    example: 'Ta VMA estimée progresse. On intègre un fractionné jeudi pour travailler le seuil lactique.',
  },
  {
    name: 'Sophie',
    style: 'playful' as CoachStyle,
    description: 'Ludique, motivante',
    example: 'Boom ! Semaine en or. Vannes-Auray est dans 9 semaines et tu es déjà en forme.',
  },
] as const
