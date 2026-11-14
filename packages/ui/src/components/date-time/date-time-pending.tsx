import { k } from '../../recipes/kata/date-time'
import { Placeholder } from '../placeholder'

/**
 * The skeleton of a date text that waits for hydration. It holds `children`,
 * the text from `standText`, as text that does not show. Thus the skeleton has
 * about the size, the line breaks, and the baseline of the text that replaces
 * it. `DateTime`, the labels of `Calendar`, and the value of `DatePicker` show
 * it in the server render and in the hydration render (§3.13).
 *
 * @remarks Static leaf: renders in React Server Components.
 * @internal
 */
export function DateTimePending({ children }: { children: string }) {
	return (
		<Placeholder as="span" className={k.skeleton.text}>
			{children}
		</Placeholder>
	)
}
