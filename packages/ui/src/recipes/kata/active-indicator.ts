import { mode } from '../../core/recipe'
import { ugoki } from '../kiso'

const { spring } = ugoki

export const k = {
	spring: spring.slide,
	fill: mode('bg-zinc-200', 'dark:bg-zinc-700'),
}
