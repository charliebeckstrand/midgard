/**
 * The value props of a control that selects one option or, with `multiple`,
 * many. They are discriminated on `multiple`, so `value`, `defaultValue`, and
 * `onValueChange` take one value or an array.
 *
 * @typeParam T - The option value type.
 * @internal
 */
export type SelectionValueProps<T> =
	| {
			/** Controlled value. `undefined` leaves the control uncontrolled; `null` keeps it controlled with no selection (CONVENTIONS §7.3). */
			value?: T | null
			defaultValue?: T
			/** Fires when the selection changes, with the new selection, or `null` when it is cleared. */
			onValueChange?: (value: T | null) => void
			/**
			 * Allows more than one selection. Set it to `true` to take an array `value`.
			 * @defaultValue false
			 */
			multiple?: false
	  }
	| {
			multiple: true
			value?: T[]
			defaultValue?: T[]
			onValueChange?: (value: T[]) => void
	  }
