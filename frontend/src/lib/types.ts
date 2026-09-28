export type Phase =
  | 'follicular'
  | 'menstrual'
  | 'ovulatory'
  | 'luteal'
  | 'pmos'
  | 'menopause'

export interface User {
  id: string
  name: string
  phase: Phase
}
