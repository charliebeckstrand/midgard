'use client'

import { Star } from 'lucide-react'
import { type MouseEvent, type PointerEvent, type ReactNode, useRef, useState } from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { useFormResetSync } from '../../hooks/use-form-reset-sync'
import { useIdScope } from '../../hooks/use-id-scope'
import type { scale } from '../../recipes/kata/rating'
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

/**
 * The naming attributes of the display form. The consumer's name labels the
 * image, and the readout follows it through `aria-labelledby`. An `aria-label`
 * joins by a reference to the row itself. With no name from the consumer, the
 * readout is the whole name.
 *
 * @internal
 */
function displayNaming(
	name: { label: string | undefined; labelledBy: string | undefined },
	ids: { row: string; value: string },
	valueText: string,
): { id?: string; 'aria-label'?: string; 'aria-labelledby'?: string } {
	if (name.labelledBy) return { 'aria-labelledby': `${name.labelledBy} ${ids.value}` }

	if (name.label) {
		return { id: ids.row, 'aria-label': name.label, 'aria-labelledby': `${ids.row} ${ids.value}` }
	}

	return { 'aria-label': valueText }
}

/** Props for {@link Rating}: the controllable value triad, the `count` of stars, the `size` step, the recipe `color`, and the read-only display form. */
export type RatingProps = RatingVariants & {
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
	 * The smallest change a reader can set. At `0.5`, each star has two halves:
	 * the start half sets the half score, and the end half sets the whole star.
	 * The arrow keys move one half at a time. The halves follow the reading
	 * direction, so they mirror in a right-to-left row. The display form draws
	 * any fraction and does not read this prop.
	 * @defaultValue 1
	 */
	step?: 1 | 0.5
	/**
	 * Binds the value to the enclosing Form field of this name (CONVENTIONS §7.2).
	 * It is not the native grouping name. The stars group under an id of their
	 * own, so two ratings bound to different fields never merge into one native
	 * group.
	 */
	name?: string
	/**
	 * The density step. Omit it to take the step of the nearest density scope.
	 * A step makes the row a density scope.
	 */
	size?: ScaleStep<typeof scale>
	/**
	 * Show the score and take no input. The row renders as one `role="img"`,
	 * because a reader has no reason to walk five radios that answer nothing. Its
	 * name is the consumer's name followed by the {@link getValueText} readout.
	 * With no name, the readout is the whole name. The image keeps the
	 * `aria-describedby` ids. It takes no validation attributes, because
	 * `aria-invalid` is not a supported attribute of `role="img"`.
	 *
	 * It also renders a fraction: a whole star for each point, a part star for the
	 * remainder. A reader sets only the scores that {@link step} allows.
	 * @defaultValue `false`, or the state of the enclosing Control.
	 */
	readOnly?: boolean
	/** @defaultValue `false`, or the state of the enclosing Control or Field. */
	disabled?: boolean
	/**
	 * Let a click on the current score clear it. A star rating has no other way
	 * back to "unrated", because every star a reader can reach sets a score.
	 *
	 * The stars recede while the pointer rests on the one that would clear them,
	 * so that click previews its result like every other one does. Without it the
	 * clearing star is the only star on the row that answers the pointer with the
	 * row already drawn. It is worst at a score of one, where the pointer sits on
	 * the only filled star and nothing at all moves. A touch has no hover, so it
	 * shows no preview.
	 * @defaultValue true
	 */
	clearable?: boolean
	/**
	 * The readout, for the score in the display form's accessible name and for
	 * each star's own name in the interactive one. Say what the stars mean where they mean
	 * something particular: `` (v) => `${v} of 5 — ${LEVELS[v]}` ``. The
	 * default readout is `` `${value} out of ${count} stars` ``.
	 * @defaultValue {@link defaultValueText}
	 */
	getValueText?: (value: number, count: number) => string
	/** Id for the row; resolves through the explicit prop, then an enclosing `<Control>` / `<Field>`. */
	id?: string
	className?: string
	/**
	 * Names the row when no `<Field>` / `<Label>` wraps it. A
	 * `role="radiogroup"` is not named by an enclosing `<fieldset>` legend, so a
	 * bare Rating needs one of these. The display form puts the
	 * {@link getValueText} readout after this name.
	 * @defaultValue 'Rating'
	 */
	'aria-label'?: string
	'aria-labelledby'?: string
	/**
	 * Consumer-supplied `aria-describedby`, merged ahead of the field's
	 * registered description / error ids. Both forms keep it: the radiogroup
	 * and the display form's `role="img"`.
	 */
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
 * per star. Arrow keys, focus, and the announced position therefore come from
 * the platform, rather than from key handlers of its own. It is `Slider`'s
 * bargain, for the same reason. `readOnly` and `disabled` drop the inputs and
 * render one `role="img"`. Its name is the consumer's name, then the readout.
 * The readout is necessary, because color and shape alone do not carry a score
 * (WCAG 1.4.1).
 *
 * Binds to an enclosing Form field by `name`. An uncontrolled rating goes back
 * to `defaultValue` on a native form reset, and `onValueChange` reports it. Resolves `id` / `disabled` /
 * `readOnly` / `invalid` from an enclosing `<Control>` or `<Field>`. The stars
 * take the step of the nearest density scope. A `<Label as="span">` in the
 * Field names the stars through `aria-labelledby`. No one element of the stars
 * is labelable, so a `<label for>` points at nothing.
 *
 * @remarks A click on the current score clears it while `clearable` holds. The
 * click is canceled rather than handled after the fact. A radio restores its
 * own checkedness when its activation is canceled. The clear therefore never
 * races the `change` that would otherwise set the same star again.
 *
 * The display form draws a fractional score — an average of reviews is not a
 * whole number — by clipping a filled star over an empty one. It draws a whole
 * or an empty star as one glyph, so only the part star stacks two. The
 * interactive form sets a whole star, or a half star at a `step` of `0.5`.
 */
export function Rating({
	value,
	defaultValue,
	onValueChange,
	count = 5,
	step = 1,
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
		controlled,
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

	// The native grouping name, which is this row's own and never the bound
	// field's: two ratings bound to different fields would otherwise share a
	// group and clear each other.
	const scope = useIdScope({ id: resolvedId })

	const current = bound ?? 0

	// A disabled row still shows its score and takes no pointer, so the preview
	// is gated on the input being live rather than dropped at the handler.
	const live = !resolvedReadOnly && !resolvedDisabled

	// The radio of the first score. Every radio of the row is in the same form.
	const firstInputRef = useRef<HTMLInputElement>(null)

	// A native form reset reverts the radios without a change event. The
	// uncontrolled score then goes back to its seed, as the radios do.
	useFormResetSync(firstInputRef, live && !controlled, () => setValue(defaultValue ?? null))

	// The preview the pointer is asking for, or none. A dead row shows its score
	// and nothing else, so the gate sits here rather than on each reader below.
	const preview = live ? previewed : null

	// The lowest score is one step, so a preview is never `0` and the coalesce is
	// exact.
	const shown = preview ?? current

	// Whether the pointer rests on the star a click would clear. Every other star
	// previews the score it would set; this one has to preview the score it would
	// take away, and it cannot do that by drawing the row that is already there.
	const clearing = clearable && preview !== null && preview === current

	const stars = rangeKeys(count, 'star')

	const rowClass = cn(k({ color }), k.group, className)

	// A touch has no hover, so it previews nothing. A tap also sends the
	// compatibility mouse events, with no leave after them, so the preview reads
	// the pointer type rather than listening for mouse events. Otherwise the tap
	// leaves the clearing preview on the score it sets.
	function handlePointerEnter(event: PointerEvent, star: number) {
		if (event.pointerType === 'touch') return

		setPreviewed(star)
	}

	function commit(next: number | null) {
		setValue(next)

		setTouched()
	}

	/** One star's stacked pair: the empty track, and the fill clipped to this star's share. */
	function glyphs(star: number) {
		const fill = starFill(shown, star)

		return (
			<>
				<Star aria-hidden="true" className={cn(k.glyph, k.track)} />

				{fill > 0 && (
					<span
						data-slot="rating-fill"
						className={cn(k.clip, clearing && k.clearing)}
						style={{ width: `${fill * 100}%` }}
					>
						<Star aria-hidden="true" fill="currentColor" className={k.glyph} />
					</span>
				)}
			</>
		)
	}

	// A Label registered on the enclosing Field names the row; an explicit
	// `aria-labelledby` wins over it. Only where neither stands does the row fall
	// back to its own `aria-label`. The interactive form never sets both naming
	// attributes. The display form sets both only to join the readout.
	const labelledBy = ariaLabelledBy ?? control?.labelledBy

	if (!live) {
		const valueText = getValueText(current, count)

		const naming = displayNaming(
			{ label: ariaLabel, labelledBy },
			{ row: scope.sub('row'), value: scope.sub('value') },
			valueText,
		)

		return (
			<span
				data-slot={slot}
				data-density={size}
				{...(resolvedDisabled ? { 'data-disabled': true } : {})}
				role="img"
				{...naming}
				aria-describedby={describedBy}
				className={rowClass}
			>
				{/* The readout that follows the consumer's name. A reference names the
				    row from it while it stays hidden. */}
				{naming['aria-labelledby'] && (
					<span id={scope.sub('value')} hidden>
						{valueText}
					</span>
				)}
				{stars.map((key, index) => {
					const fill = starFill(current, index + 1)

					// A whole or an empty star is one glyph. Only the part star stacks a
					// clipped fill over its track. A list of rated rows draws many of
					// these, and the stack is most of their elements.
					if (fill === 1) {
						return (
							<Star
								key={key}
								data-slot="rating-star"
								aria-hidden="true"
								fill="currentColor"
								className={k.glyph}
							/>
						)
					}

					if (fill === 0) {
						return (
							<Star
								key={key}
								data-slot="rating-star"
								aria-hidden="true"
								className={cn(k.glyph, k.track)}
							/>
						)
					}

					return (
						<span key={key} data-slot="rating-star" className={k.star()}>
							{glyphs(index + 1)}
						</span>
					)
				})}
			</span>
		)
	}

	// A click on the current score clears it. Canceling the activation is what
	// keeps the clear and the change from fighting: the radio restores its own checkedness,
	// and the `change` that would set this same score again never fires.
	function handleClick(event: MouseEvent<HTMLInputElement>, score: number) {
		if (!clearable || current !== score) return

		event.preventDefault()

		commit(null)
	}

	/**
	 * The label for one score, over the native radio that sets it. A whole step
	 * makes it the star's box, and a half step makes it one half of the box.
	 */
	function choice(score: number, label: { slot: string; className: string }, children?: ReactNode) {
		return (
			<label
				key={score}
				data-slot={label.slot}
				data-value={score}
				className={label.className}
				onPointerEnter={(event) => handlePointerEnter(event, score)}
			>
				<input
					ref={score === step ? firstInputRef : undefined}
					type="radio"
					data-slot="rating-input"
					name={scope.id}
					value={score}
					checked={current === score}
					aria-label={getValueText(score, count)}
					className={cn(k.input)}
					onChange={() => commit(score)}
					onClick={(event) => handleClick(event, score)}
				/>

				{children}
			</label>
		)
	}

	// A `<fieldset>` would impose form-field semantics and a min-content box on
	// this inline row, so the grouping is a named `role="radiogroup"` — the
	// treatment `RadioGroup` takes, and for the same reason.
	return (
		<span
			data-slot={slot}
			data-density={size}
			role="radiogroup"
			aria-label={labelledBy ? undefined : (ariaLabel ?? 'Rating')}
			aria-labelledby={labelledBy}
			aria-describedby={describedBy}
			{...validation}
			className={rowClass}
			onPointerLeave={() => setPreviewed(null)}
			onBlur={() => setTouched()}
		>
			{stars.map((key, index) => {
				const star = index + 1

				// A half step splits the star into two labels, one radio each. The
				// start half comes first, so the native arrow keys walk the halves in
				// order.
				if (step === 0.5) {
					return (
						<span key={key} data-slot="rating-star" className={k.star({ interactive: true })}>
							{choice(star - 0.5, { slot: 'rating-half', className: k.half({ side: 'start' }) })}

							{choice(star, { slot: 'rating-half', className: k.half({ side: 'end' }) })}

							{glyphs(star)}
						</span>
					)
				}

				return choice(
					star,
					{ slot: 'rating-star', className: k.star({ interactive: true }) },
					glyphs(star),
				)
			})}
		</span>
	)
}
