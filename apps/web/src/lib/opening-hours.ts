export type DaySchedule = { open: string; close: string } | null

export type OpeningHours = {
  mon?: DaySchedule
  tue?: DaySchedule
  wed?: DaySchedule
  thu?: DaySchedule
  fri?: DaySchedule
  sat?: DaySchedule
  sun?: DaySchedule
}

const DAY_KEYS: (keyof OpeningHours)[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export const DAY_LABELS: Record<keyof OpeningHours, string> = {
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
  sun: 'Domingo',
}

/** Retorna se a loja está aberta agora, com base em openingHours */
export function isOpenNow(hours: OpeningHours | null | undefined): boolean {
  if (!hours) return true // sem horário configurado = sempre exibir como aberto

  const now = new Date()
  const dayKey = DAY_KEYS[now.getDay()]
  const schedule = hours[dayKey]

  if (!schedule) return false // fechado hoje

  const [openH, openM] = schedule.open.split(':').map(Number)
  const [closeH, closeM] = schedule.close.split(':').map(Number)

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes
}

/** Retorna o horário de hoje formatado, ex: "08:00 – 22:00" */
export function todaySchedule(hours: OpeningHours | null | undefined): string | null {
  if (!hours) return null

  const now = new Date()
  const dayKey = DAY_KEYS[now.getDay()]
  const schedule = hours[dayKey]

  if (!schedule) return 'Fechado hoje'
  return `${schedule.open} – ${schedule.close}`
}
