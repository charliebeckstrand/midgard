import { words } from '../../data/words.ts'

export const items = Object.values(words('count', { one: 'One', two: 'Two', three: 'Three' }))
