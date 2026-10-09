'use client'

import { Check } from 'lucide-react'
import { type ComponentProps, memo, type ReactNode, use, useCallback, useId } from 'react'
import { ariaAttr, cn, composeEventHandlers, createContext, dataAttr } from '../../core'
import { k } from '../../recipes/kata/option'
import { capitalizeFirst, getOrCompute } from '../../utilities'

/**
 * Props for {@link Option}: selection state (`selected`, `disabled`), the
 * `onSelect` handler, and the active-descendant / commit-on-Tab behavior flags.
 */
export type OptionProps = {
	className?: string
	selected: boolean
	/**
	 * Disables the option, so that it cannot be selected.
	 * @defaultValue false
	 */
	disabled?: boolean
	onSelect: () => void
	/**
	 * Stamps a stable `id` the owning combobox/textbox points its
	 * `aria-activedescendant` at, and blocks mousedown from pulling focus off
	 * that input. Off for focus-roving lists (listbox/select), which move real
	 * focus to the option.
	 * @defaultValue false
	 */
	activeDescendant?: boolean
	/**
	 * Single-select focus-roving lists: Tab commits the focused option before
	 * the keystroke leaves the widget (APG select pattern: Tab accepts, Escape
	 * cancels). Skipped when the option is already selected: `onSelect` on
	 * the current value clears a `nullable` selection. The event is not
	 * consumed; the owning panel redirects the focus move.
	 * @defaultValue false
	 */
	commitOnTab?: boolean
} & Omit<
	ComponentProps<'div'>,
	'className' | 'onSelect' | 'role' | 'aria-selected' | 'aria-disabled' | 'tabIndex'
>

// Selection and the focus hold run after a consumer `preventDefault()`.
const alwaysRun = { checkForDefaultPrevented: false }

/**
 * Shared option row for select-like components: stamps `role="option"` with
 * `aria-selected`/`aria-disabled`, renders a selected-state check icon, and handles Enter/Space activation.
 *
 * @remarks
 * For active-descendant lists it mints a stable `id` and `preventDefault`s
 * mousedown to keep DOM focus on the owning input; an explicit `id` always
 * wins. With `commitOnTab`, an unselected option commits on Tab before the
 * keystroke leaves the widget. A consumer `onClick`, `onKeyDown`, or
 * `onMouseDown` runs first. Its `preventDefault()` does not cancel selection,
 * which is the activation the row exists to perform. The row and its check
 * icon follow the nearest density scope through stepped classes, and they read
 * no context. Memoized: with a stable `onSelect`, an option skips re-rendering
 * when its own `selected` state is unchanged. Committing a selection therefore
 * re-renders only the rows that actually changed, rather than every option in
 * the list.
 */
function OptionImpl({
	children,
	className,
	selected,
	disabled,
	onSelect,
	activeDescendant = false,
	commitOnTab = false,
	id,
	onClick,
	onKeyDown,
	onMouseDown,
	...props
}: OptionProps) {
	const autoId = useId()

	// Only mint an id for active-descendant lists; an explicit id always wins.
	const optionId = id ?? (activeDescendant ? autoId : undefined)

	// A bare `<Check>` sized from the recipe's icon scale: this primitive
	// never imports `<Icon>` from `components/`.
	const checkIcon = (
		<Check
			aria-hidden="true"
			data-slot="icon"
			className={cn(
				'relative invisible shrink-0 self-center group-data-selected/option:visible',
				k.check,
			)}
		/>
	)

	return (
		<div
			id={optionId}
			className={cn(k.base)}
			{...props}
			// After the spread: a consumer prop must not drop the row out of the
			// list (role), the roving model (tabIndex), or its state.
			role="option"
			aria-selected={selected}
			aria-disabled={ariaAttr(disabled)}
			data-selected={dataAttr(selected)}
			data-disabled={dataAttr(disabled)}
			tabIndex={-1}
			// Composed after the spread: the consumer handler runs first. Selection
			// is the activation the row exists to perform, so a consumer
			// `preventDefault()` does not cancel it (CONVENTIONS §3.9).
			onClick={composeEventHandlers(
				onClick,
				() => {
					if (!disabled) onSelect()
				},
				alwaysRun,
			)}
			onKeyDown={composeEventHandlers(
				onKeyDown,
				(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault()

						if (!disabled) onSelect()
					}

					if (event.key === 'Tab' && commitOnTab && !disabled && !selected) onSelect()
				},
				alwaysRun,
			)}
			// Active-descendant lists keep DOM focus on the owning input;
			// `preventDefault` stops mousedown from transferring focus. The focus
			// hold keeps the active descendant true, so it takes no gate either.
			onMouseDown={
				activeDescendant
					? composeEventHandlers(onMouseDown, (event) => event.preventDefault(), alwaysRun)
					: onMouseDown
			}
		>
			<span className={cn(k.content, className)}>{children}</span>
			{checkIcon}
		</div>
	)
}

/**
 * Shared, memoized option row for select-like components. See
 * {@link OptionImpl} for behavior.
 */
export const Option = memo(OptionImpl)

/** Primary label for a select-like option. */
export function OptionLabel({ className, ...props }: ComponentProps<'span'>) {
	return <span {...props} className={cn(k.label, className)} />
}

/** Secondary description for a select-like option. */
export function OptionDescription({ className, children, ...props }: ComponentProps<'span'>) {
	return (
		<span {...props} className={cn(k.description, className)}>
			<span className="flex-1 truncate">{children}</span>
		</span>
	)
}

/**
 * Stacks an {@link OptionLabel} over an {@link OptionDescription}. Without it,
 * the description sits beside the label. It takes the free width of the row.
 */
export function OptionText({ className, ...props }: ComponentProps<'span'>) {
	return <span {...props} className={cn(k.text, className)} />
}

/** Props for a select-like option produced by `createSelectOption`; `value` is matched against the host's selection. */
export type SelectOptionProps<TValue = unknown> = {
	value: TValue
	disabled?: boolean
	className?: string
	children?: ReactNode
	/**
	 * Explicit id, overriding the auto-generated one. Set this when the option
	 * renders inside a `VirtualOptions` with `getOptionId`. The host needs a
	 * data-driven, predictable id to point `aria-activedescendant` at before the
	 * row mounts. React's auto-`id` is opaque and minted per instance, so it can't
	 * supply one.
	 */
	id?: string
	/**
	 * Windowed-list a11y position from `VirtualOptions`' render `meta` — spread
	 * directly (`{...meta}`) so a windowed listbox still reports the option's
	 * true "n of m" position.
	 */
	'aria-setsize'?: number
	/** Windowed-list a11y position from `VirtualOptions`' render `meta`; see `aria-setsize`. */
	'aria-posinset'?: number
}

/** Props for `OptionLabel`. */
export type OptionLabelProps = ComponentProps<'span'>

/** Props for `OptionText`. */
export type OptionTextProps = ComponentProps<'span'>

/** Props for `OptionDescription`. */
export type OptionDescriptionProps = ComponentProps<'span'>

/**
 * Selection state a {@link createSelectOption} host exposes through its context:
 * the current `value` (an array when `multiple`), and the `multiple` flag. It
 * also holds the `onSelect` callback fired when an option is activated, and the
 * `capitalize` flag that first-word-capitalizes string option labels at render.
 */
export type OptionSelectionContext<TValue = unknown> = {
	value: TValue | TValue[] | undefined
	multiple?: boolean
	onSelect: (value: TValue) => void
	capitalize?: boolean
}

// Membership sets keyed by the selected-values array. Every option in one render
// reads the same array reference off the host context, so the first option to
// look up builds the set (O(k)) and the rest reuse it (O(1)) — a multi-select
// toggle costs O(n + k), not the O(n·k) of an `includes` scan per option. The
// host swaps in a new array on change, so a WeakMap keys cleanly and old sets
// are collected with their arrays.
// The host's `capitalize` flag, which each `Option` hands to its own `Label`.
// A `Label` that reads the whole selection context re-renders on each selection
// change. This boolean does not change with the selection, so a `Label` skips
// that work.
const [CapitalizeContext] = createContext('OptionCapitalize', { default: false })

const membershipCache = new WeakMap<readonly unknown[], Set<unknown>>()

function isOptionSelected(
	selectedValue: unknown,
	value: unknown,
	multiple: boolean | undefined,
): boolean {
	if (multiple && Array.isArray(selectedValue)) {
		return getOrCompute(membershipCache, selectedValue, (values) => new Set(values)).has(value)
	}

	return selectedValue === value
}

/**
 * Factory for select-like option components. Consumers supply the data-slot
 * prefix and a hook that reads the host's selection
 * {@link OptionSelectionContext}. The generated `Option` and `Label` call it.
 *
 * `Option` owns the selected-state check icon. The icon takes its size
 * from the nearest density scope.
 *
 * @returns The bound `{ Option, Label, Text, Description }` set, each pre-wired with
 * the host's `data-slot` prefix and selection hook.
 * @remarks Pass the hook that `createContext` generates for the host context.
 * It throws outside a provider, so an orphan option fails at render with a
 * message that names the host. A raw `use(Context)` returns the missing-value
 * sentinel, and the fault then shows as an unnamed error at the first click.
 */
export function createSelectOption<
	TValue = unknown,
	TContext extends OptionSelectionContext<TValue> = OptionSelectionContext<TValue>,
>(config: {
	slotPrefix: string
	/**
	 * Pass for active-descendant lists (combobox); each option gets a stable
	 * `id` the owning input references. Omit for focus-roving lists.
	 */
	activeDescendant?: boolean
	/**
	 * Reads the host's selection context. Pass the hook that `createContext`
	 * generates, so that an orphan option throws a named error.
	 */
	useSelection: () => TContext
}) {
	function SelectOption({
		value,
		disabled,
		className,
		children,
		id,
		'aria-setsize': ariaSetsize,
		'aria-posinset': ariaPosinset,
	}: SelectOptionProps<TValue>) {
		const { value: selectedValue, multiple, onSelect, capitalize } = config.useSelection()

		const selected = isOptionSelected(selectedValue, value, multiple)

		// Stable per option (the host's `onSelect` is stable and `value` is fixed),
		// so the memoized `Option` can bail when `selected` is unchanged.
		const handleSelect = useCallback(() => onSelect(value), [onSelect, value])

		const label = capitalize && typeof children === 'string' ? capitalizeFirst(children) : children

		return (
			<CapitalizeContext value={capitalize ?? false}>
				<Option
					id={id}
					selected={selected}
					disabled={disabled}
					onSelect={handleSelect}
					data-slot={`${config.slotPrefix}-option`}
					className={className}
					activeDescendant={config.activeDescendant}
					aria-setsize={ariaSetsize}
					aria-posinset={ariaPosinset}
					// Focus-roving single-select only: active-descendant lists keep DOM
					// focus on the input (the option never sees the keydown), and
					// multi-select toggles stay put until an explicit Enter/Space/click.
					commitOnTab={!config.activeDescendant && !multiple}
				>
					{label}
				</Option>
			</CapitalizeContext>
		)
	}

	function Label({ className, children, ...props }: OptionLabelProps) {
		// The host's `capitalize` formats string labels at render — the same JS
		// mechanism every select-family surface uses (custom nodes pass through
		// as authored). The enclosing `Option` supplies the flag.
		const capitalize = use(CapitalizeContext)

		const label = capitalize && typeof children === 'string' ? capitalizeFirst(children) : children

		return (
			<OptionLabel data-slot={`${config.slotPrefix}-label`} className={className} {...props}>
				{label}
			</OptionLabel>
		)
	}

	function Text({ className, ...props }: OptionTextProps) {
		return <OptionText data-slot={`${config.slotPrefix}-text`} className={className} {...props} />
	}

	function Description({ className, ...props }: OptionDescriptionProps) {
		return (
			<OptionDescription
				data-slot={`${config.slotPrefix}-description`}
				className={className}
				{...props}
			/>
		)
	}

	return { Option: SelectOption, Label, Text, Description }
}
