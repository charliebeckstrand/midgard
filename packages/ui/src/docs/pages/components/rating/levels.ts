import { words } from '../../../data/words.ts'

export const levels = Object.values(
	words('service-level', {
		unrated: 'Unrated',
		poor: 'Poor',
		fair: 'Fair',
		good: 'Good',
		great: 'Great',
		excellent: 'Excellent',
	}),
)
