'use client'

import { Star } from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import { cn } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { useControlSize } from '../../primitives/density'
import type { Step } from '../../recipes'
import { k, type RatingVariants } from '../../recipes/kata/rating'
import { clamp, rangeKeys } from '../../utilities'
import { useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import { useFormValue } from '../form/use-form-value'

/** How much of one star fills at `value`: the whole star below it, none above, the remainder on it. @internal */
function starFill(value: number, star: number): number {
	return clamp(value - (star - 1), 0, 1)
}

/** The default readout: `4 out of 5 stars`. @internal */
function defaultValueText(value: number, count: number): string {
	return `${value} out of ${count} stars`
}

/** Props for {@link Rating}: the controllable value triad, the `count` of stars, the `size`/`color` recipe axes, and the read-only display form. */
export type RatingProps = Omit<RatingVariants, 'size'> & {
	/** Controlled value. `undefined` leaves the rating uncontrolled; `null` keeps it controlled with no score (CONVENTIONS §7.3). */
	value?: number | null
	/** Initial value when uncontrolled and not form-bound. */
	defaultValue?: number
	/** Fires with the new score, or `null` once it is cleared. */
	onValueChange?: (value: number | null) => void
	/**
	 * Stars in the row, which is also the highest score.
	 * @defaultValue 5
	 */
	count?: number
	/**
	 * Binds the value to the enclosing Form field of this name (CONVENTIONS §7.2).
	 * It is not the native grouping name: the stars group under an id of their
	 * own, so two ratings bound to different fields never merge into one native
	 * group.
	 */
	name?: string
	/**
	 * Size step. Resolution order: this prop, then the Density cascade, then `md`.
	 */
	size?: Step
	/**
	 * Show the score and take no input. The row renders as one `role="img"`
	 * carrying the {@link getValueText} readout, because a reader has no reason to
	 * walk five radios that answer nothing.
	 *
	 * It also renders a fraction: a whole star for each point, a part star for the
	 * remainder. Only the display form does — a reader picks whole stars.
	 */
	readOnly?: boolean
	disabled?: boolean
	/**
	 * Let a click on the current score clear it. A star rating has no other way
	 * back to "unrated", because every star a reader can reach sets a score.
	 *
	 * The stars recede while the pointer rests on the one that would clear them,
	 * so that click previews its result like every other one does. Without it the
	 * clearing star is the only star on the row that answers the pointer with the
	 * row already drawn — worst at a score of one, where the pointer sits on the
	 * only filled star and nothing at all moves.
	 * @defaultValue true
	 */
	clearable?: boolean
	/**
	 * The readout, for the display form's accessible name and for each star's own
	 * name in the interactive one. Say what the stars mean where they mean
	 * something particular: `` (v) => `${v} of 5 — ${LEVELS[v]}` ``.
	 * @defaultValue `` `${value} out of ${count} stars` ``
	 */
	getValueText?: (value: number, count: number) => string
	/** Id for the row; resolves through the explicit prop, then an enclosing `<Control>` / `<Field>`. */
	id?: string
	className?: string
	/**
	 * Names the interactive row when no `<Field>` / `<Label>` wraps it. A
	 * `role="radiogroup"` is not named by an enclosing `<fieldset>` legend, so a
	 * bare Rating needs one of these. The display form names itself from
	 * {@link getValueText} and ignores this.
	 */
	'aria-label'?: string
	'aria-labelledby'?: string
	/** Consumer-supplied `aria-describedby`, merged ahead of the field's registered description / error ids. */
	'aria-describedby'?: string
	/**
	 * Overrides the `data-slot` attribute.
	 * @defaultValue 'rating'
	 */
	'data-slot'?: string
}

/**
 * Star rating: a row of stars standing for a score out of {@link RatingProps.count}.
 *
 * Interactive, it is a `role="radiogroup"` over one native `<input type="radio">`
 * per star, so arrow keys, focus, and the announced position come from the
 * platform rather than from key handlers of its own — `Slider`'s bargain, for
 * the same reason. `readOnly` drops the inputs and renders one `role="img"`
 * carrying the readout, because colour and shape alone do not carry a score
 * (WCAG 1.4.1).
 *
 * Binds to an enclosing Form field by `name`, resolves `id` / `disabled` /
 * `readOnly` / `invalid` from an enclosing `<Control>` or `<Field>`, and takes
 * `size` from the Density cascade.
 *
 * @remarks A click on the current score clears it while `clearable` holds. The
 * click is cancelled rather than handled after the fact: a radio restores its
 * own checkedness when its activation is cancelled, so the clear never races the
 * `change` that would otherwise set the same star again.
 *
 * The display form draws a fractional score — an average of reviews is not a
 * whole number — by clipping a filled star over an empty one. The interactive
 * form sets whole stars only.
 */
export function Rating({
	value,
	defaultValue,
	onValueChange,
	count = 5,
	name,
	size,
	readOnly,
	disabled,
	color,
	clearable = true,
	getValueText = defaultValueText,
	id,
	className,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
	'aria-describedby': ariaDescribedBy,
	'data-slot': slot = 'rating',
}: RatingProps) {
	const {
		value: bound,
		setValue,
		setTouched,
		invalid,
	} = useFormValue<number>(name, { value, defaultValue, onValueChange })

	// The score under the pointer, which stands in for the value while the
	// pointer is over the row. A star rating that does not answer the pointer
	// makes the reader guess which star they are about to commit to.
	const [previewed, setPreviewed] = useState<number | null>(null)

	const control = useControl()

	const {
		id: resolvedId,
		disabled: resolvedDisabled,
		readOnly: resolvedReadOnly,
		'aria-describedby': describedBy,
		validation,
	} = useControlProps({ id, disabled, readOnly, invalid, 'aria-describedby': ariaDescribedBy })

	const token = useControlSize(size)

	// The native grouping name, which is this row's own and never the bound
	// field's: two ratings bound to different fields would otherwise share a
	// group and clear each other.
	const scope = useIdScope({ id: resolvedId })

	const current = bound ?? 0

	// A disabled row still shows its score and takes no pointer, so the preview
	// is gated on the input being live rather than dropped at the handler.
	const live = !resolvedReadOnly && !resolvedDisabled

	// The preview the pointer is asking for, or none. A dead row shows its score
	// and nothing else, so the gate sits here rather than on each reader below.
	const preview = live ? previewed : null

	// Stars count from one, so a preview is never `0` and the coalesce is exact.
	const shown = preview ?? current

	// Whether the pointer rests on the star a click would clear. Every other star
	// previews the score it would set; this one has to preview the score it would
	// take away, and it cannot do that by drawing the row that is already there.
	const clearing = clearable && preview !== null && preview === current

	const stars = rangeKeys(count, 'star')

	const rowClass = cn(k({ size: token.size, color }), className)

	const glyph = k.glyph[token.size]

	function commit(next: number | null) {
		setValue(next)

		setTouched()
	}

	/** One star's stacked pair: the empty track, and the fill clipped to this star's share. */
	function glyphs(star: number) {
		const fill = starFill(shown, star)

		return (
			<>
				<Star aria-hidden="true" className={cn(glyph, k.track)} />

				{fill > 0 && (
					<span
						data-slot="rating-fill"
						className={cn(k.clip, clearing && k.clearing)}
						style={{ width: `${fill * 100}%` }}
					>
						<Star aria-hidden="true" fill="currentColor" className={glyph} />
					</span>
				)}
			</>
		)
	}

	if (!live) {
		return (
			<span
				data-slot={slot}
				data-size={token.size}
				{...(resolvedDisabled ? { 'data-disabled': true } : {})}
				role="img"
				aria-label={getValueText(current, count)}
				className={rowClass}
			>
				{stars.map((key, index) => (
					<span key={key} data-slot="rating-star" className={k.star()}>
						{glyphs(index + 1)}
					</span>
				))}
			</span>
		)
	}

	// A click on the current score clears it. Cancelling the activation is what
	// keeps the two halves from fighting: the radio restores its own checkedness,
	// and the `change` that would set this same star again never fires.
	function handleClick(event: MouseEvent<HTMLInputElement>, star: number) {
		if (!clearable || current !== star) return

		event.preventDefault()

		commit(null)
	}

	// A Label registered on the enclosing Field names the group; an explicit
	// `aria-labelledby` wins over it. Only where neither stands does the row fall
	// back to its own `aria-label`, so the two naming attributes are never both set.
	const labelledBy = ariaLabelledBy ?? control?.labelledBy

	// A `<fieldset>` would impose form-field semantics and a min-content box on
	// this inline row, so the grouping is a named `role="radiogroup"` — the
	// treatment `RadioGroup` takes, and for the same reason.
	return (
		<span
			data-slot={slot}
			data-size={token.size}
			role="radiogroup"
			aria-label={labelledBy ? undefined : (ariaLabel ?? 'Rating')}
			aria-labelledby={labelledBy}
			aria-describedby={describedBy}
			{...validation}
			className={rowClass}
			onMouseLeave={() => setPreviewed(null)}
			onBlur={() => setTouched()}
		>
			{stars.map((key, index) => {
				const star = index + 1

				return (
					<label
						key={key}
						data-slot="rating-star"
						data-value={star}
						className={k.star({ interactive: true })}
						onMouseEnter={() => setPreviewed(star)}
					>
						<input
							type="radio"
							data-slot="rating-input"
							name={scope.id}
							value={star}
							checked={current === star}
							aria-label={getValueText(star, count)}
							className={cn(k.input)}
							onChange={() => commit(star)}
							onClick={(event) => handleClick(event, star)}
						/>

						{glyphs(star)}
					</label>
				)
			})}
		</span>
	)
}
