export interface Meal {
  name:       string
  kcal:       number
  foods:      string[]
  note?:      string
  highlight?: 'pre' | 'post'
}
