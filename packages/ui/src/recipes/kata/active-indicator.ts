import { mode } from '../../core/recipe'
import { sen, ugoki } from '../kiso'

const { forced } = sen
const { spring } = ugoki

export const k = {
	spring: spring.slide,
	// Forced colors remove the fill, so an outline then marks the current item.
	fill: [...mode('bg-zinc-200', 'dark:bg-zinc-700'), forced.outline],
}
