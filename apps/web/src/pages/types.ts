export type Decision = 'Buy' | 'Don\'t Buy' | 'Caution'
export type NavKey = 'home' | 'inventory' | 'scan' | 'adviser' | 'routine'

export interface Product {
  name: string
  subtitle: string
  tags: string[]
  decision?: Decision
}
