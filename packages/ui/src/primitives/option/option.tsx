'use client'

import { Check } from 'lucide-react'
import {
	type ComponentPropsWithoutRef,
	type Context as ReactContext,
	type ReactNode,
	use,
	useId,
} from 'react'
import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/option'
import { useDensity } from '../density'

/**
 * Per-Density-step Tailwind size class for the selected-state check icon,
 * mirroring `<Icon>`'s size scale. Local to this primitive so it never imports
 * `<Icon>` from `components/`.
 *
 * @internal
 */
const checkIconSize = {
	sm: 'size-4',
	md: 'size-5',
	lg: 'size-6',
} satisfies Record<Step, string>

type BaseOptionProps = {
	className?: string
	icon?: ReactNode
	selected: boolean
	disabled?: boolean
	onSelect: () => void
	/**
	 * Stamps a stable `id` the owning combobox/textbox points its
	 * `aria-activedescendant` at, and blocks mousedown from pulling focus off
	 * that input. Off for focus-roving lists (listbox/select), which move real
	 * focus to the option.
	 */
	activeDescendant?: boolean
	/**
	 * Single-select focus-roving lists: Tab commits the focused option before
	 * the keystroke leaves the widget (APG select pattern: Tab accepts, Escape
	 * cancels). Skipped when the option is already selected: `onSelect` on
	 * the current value clears a `nullable` selection. The event is not
	 * consumed; the owning panel redirects the focus move.
	 */
	commitOnTab?: boolean
} & Omit<
	ComponentPropsWithoutRef<'div'>,
	| 'className'
	| 'onSelect'
	| 'onClick'
	| 'onKeyDown'
	| 'onMouseDown'
	| 'role'
	| 'aria-selected'
	| 'aria-disabled'
	| 'tabIndex'
>

/**
 * Shared option row for select-like components: stamps `role="option"` with
 * `aria-selected`/`aria-disabled`, renders a Density-sized selected-state check
 * icon (overridable via `icon`), and handles Enter/Space activation.
 *
 * @remarks
 * For active-descendant lists it mints a stable `id` and `preventDefault`s
 * mousedown to keep DOM focus on the owning input; an explicit `id` always
 * wins. With `commitOnTab`, an unselected option commits on Tab before the
 * keystroke leaves the widget. Reads ambient Density via `useDensity`.
 */
export function BaseOption({
	children,
	className,
	icon,
	selected,
	disabled,
	onSelect,
	activeDescendant = false,
	commitOnTab = false,
	id,
	...props
}: BaseOptionProps) {
	const { size } = useDensity()

	const autoId = useId()

	// Only mint an id for active-descendant lists; an explicit id always wins.
	const optionId = id ?? (activeDescendant ? autoId : undefined)

	const sharedClasses = cn(k.content)

	const checkIcon = icon ?? (
		<Check
			aria-hidden="true"
			data-slot="icon"
			className={cn(
				'relative hidden shrink-0 self-center text-green-600 group-data-selected/option:inline',
				checkIconSize[size],
			)}
		/>
	)

	return (
		<div
			id={optionId}
			role="option"
			aria-selected={selected}
			aria-disabled={disabled || undefined}
			data-selected={selected || undefined}
			data-disabled={disabled || undefined}
			tabIndex={-1}
			// Active-descendant lists keep DOM focus on the owning input;
			// `preventDefault` stops mousedown from transferring focus.
			onMouseDown={activeDescendant ? (event) => event.preventDefault() : undefined}
			onClick={() => !disabled && onSelect()}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()

					if (!disabled) onSelect()
				}

				if (event.key === 'Tab' && commitOnTab && !disabled && !selected) onSelect()
			}}
			className={cn(k.base, k.size[size])}
			{...props}
		>
			<span className={cn(sharedClasses, className)}>{children}</span>
			{checkIcon}
		</div>
	)
}

/** Primary label for a select-like option. */
export function OptionLabel({ className, ...props }: ComponentPropsWithoutRef<'span'>) {
	return <span {...props} className={cn(k.label, className)} />
}

/** Secondary description for a select-like option. */
export function OptionDescription({
	className,
	children,
	...props
}: ComponentPropsWithoutRef<'span'>) {
	return (
		<span {...props} className={cn(k.description, className)}>
			<span className="flex-1 truncate">{children}</span>
		</span>
	)
}

/** Props for a select-like option produced by `createSelectOption`; `value` is matched against the host's selection. */
export type OptionProps<TValue = unknown> = {
	value: TValue
	disabled?: boolean
	icon?: ReactNode
	className?: string
	children?: ReactNode
}

/** Props for `OptionLabel`. */
export type OptionLabelProps = ComponentPropsWithoutRef<'span'>

/** Props for `OptionDescription`. */
export type OptionDescriptionProps = ComponentPropsWithoutRef<'span'>

/**
 * Selection state a {@link createSelectOption} host exposes through its context:
 * the current `value` (an array when `multiple`), the `multiple` flag, and the
 * `onSelect` callback fired when an option is activated.
 */
export type OptionSelectionContext<TValue = unknown> = {
	value: TValue | TValue[] | undefined
	multiple?: boolean
	onSelect: (value: TValue) => void
}

/**
 * Factory for select-like option components. Consumers supply the data-slot
 * prefix and the host's selection {@link OptionSelectionContext}; the generated
 * `Option` reads it with React's `use`.
 *
 * `BaseOption` owns the selected-state check icon and sizes it from the
 * ambient Density. Per-option `icon` overrides it.
 *
 * @returns The bound `{ Option, Label, Description }` triad, each pre-wired with
 * the host's `data-slot` prefix and selection context.
 * @see {@link BaseOption}
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
	context: ReactContext<TContext>
}) {
	function Option({ value, disabled, icon, className, children }: OptionProps<TValue>) {
		const { value: selectedValue, multiple, onSelect } = use(config.context)

		const selected =
			multiple && Array.isArray(selectedValue)
				? selectedValue.includes(value)
				: selectedValue === value

		return (
			<BaseOption
				selected={selected}
				disabled={disabled}
				icon={icon}
				onSelect={() => onSelect(value)}
				data-slot={`${config.slotPrefix}-option`}
				className={className}
				activeDescendant={config.activeDescendant}
				// Focus-roving single-select only: active-descendant lists keep DOM
				// focus on the input (the option never sees the keydown), and
				// multi-select toggles stay put until an explicit Enter/Space/click.
				commitOnTab={!config.activeDescendant && !multiple}
			>
				{children}
			</BaseOption>
		)
	}

	function Label({ className, ...props }: OptionLabelProps) {
		return <OptionLabel data-slot={`${config.slotPrefix}-label`} className={className} {...props} />
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

	return { Option, Label, Description }
}
