'use client'

import type { ElementType, FocusEvent, KeyboardEvent, ReactNode } from 'react'
import { cn, dataAttr } from '../../core'
import { useDensity } from '../../primitives/density'
import { Polymorphic, type PolymorphicProps } from '../../primitives/polymorphic'
import { k } from '../../recipes/kata/list'
import { useListContext, useListItemContext } from './context'
import { ListHandle } from './list-handle'

/**
 * Props for {@link ListItem}: `prefix`/`suffix` slots plus the content area's
 * polymorphic `as`/`href` host attributes.
 *
 * @typeParam Fallback - Element the content area renders when `href` is absent;
 *   its props type constrains the non-link arm. Defaults to `'div'`.
 */
export type ListItemProps<Fallback extends ElementType = 'div'> = {
	/** Content rendered before the main content; replaces the auto-inserted `<ListHandle>` when provided. */
	prefix?: ReactNode
	/** Content rendered after the main content. */
	suffix?: ReactNode
	/**
	 * Whether the row acts on activation, which decides both the content column's
	 * muted-to-full text and the row's hover wash.
	 *
	 * Derived from `href` and `onClick` when omitted, which is right for a row that
	 * carries its own handler. Set it where the derivation cannot see the truth: a
	 * row whose only handler sits on a child, or one that is a target in name only.
	 *
	 * @remarks
	 * The row-wide hit area follows the row's own handler, not this prop: forcing
	 * `interactive` on a row whose handler sits on a child leaves that child the
	 * target, rather than covering it.
	 */
	interactive?: boolean
	/**
	 * Rounds the row's corners. The `separated` and `solid` variants are rounded
	 * already; this is for the `plain` and `outline` rows, whose hover wash would
	 * otherwise paint a square block.
	 */
	rounded?: boolean
	className?: string
	/**
	 * Element rendered for the content area when no `href` is given — an
	 * intrinsic tag (`'button'`, `'span'`) or a custom component. Ignored when
	 * `href` is set, which always renders the app-registered router link.
	 *
	 * @defaultValue 'div'
	 */
	as?: Fallback
	// The content area is the link switch: with `href` set it renders the
	// app-registered router link, the `as` element otherwise. An `onClick` here
	// lands on that content area and marks the row interactive. `prefix` is a
	// string-typed RDFa global we repurpose as a slot; `ref` is owned by the
	// dnd-kit `<li>`.
} & PolymorphicProps<Fallback, 'prefix' | 'ref'>

/**
 * A row within a {@link List}, rendered as `<li>` with `prefix`/`suffix` slots
 * around a polymorphic content area that switches to the app's router link when
 * `href` is set and otherwise renders the `as` element (`'div'` by default). A
 * content area that acts on activation — `href` or `onClick` — counts as
 * interactive and takes the muted text plus hover and pointer treatment. Its hit
 * area covers the whole painted row, the padding and the slot chrome included. In
 * a reorderable list it wires the drag/keyboard bindings and auto-inserts a
 * {@link ListHandle} as the prefix unless one is supplied. An interactive row also
 * takes a hover wash, doubled inside a glass parent. Density-scaled.
 *
 * @remarks
 * A row whose own content area carries the handler stretches that hit area over
 * the row through a pointer-capturing `::after`, so a press or a hover on the
 * padding or the gap reads the same as one on the label. The `prefix` and
 * `suffix` slots step over that overlay and stay pressable; the children of the
 * content area do not, which is why a trailing control belongs in `suffix`. The
 * overlay also takes the pointer off the label text, so such a row gives up text
 * selection.
 *
 * A reorderable row has exactly ONE Tab stop. An interactive content area is
 * natively focusable, so the reorder keys ride it and the `<li>` takes no focus
 * — it keeps only the drag node and the transform. A display-only row has nothing
 * focusable inside, so there the `<li>` is the stop. Wiring both put two
 * indistinguishable stops on every row: one to move it, one to activate it.
 *
 * @typeParam Fallback - Element the content area renders when no `href` is
 *   given; selected via `as`.
 * @remarks Client component.
 */
export function ListItem<Fallback extends ElementType = 'div'>({
	prefix,
	suffix,
	children,
	className,
	href,
	interactive: interactiveProp,
	rounded = false,
	// The default is reached only when `Fallback` was left at its `'div'`
	// default, so the cast is sound at runtime.
	as = 'div' as Fallback,
	...props
}: ListItemProps<Fallback>) {
	const { id, setNodeRef, attributes, style, dragging } = useListItemContext()

	// The list's own `interactive` is the reorder wiring; the row's is the
	// content area's activation treatment. Alias the former to keep them apart.
	const {
		variant,
		sortable,
		interactive: reorderable,
		liftedId,
		onItemKeyDown,
		onItemBlur,
	} = useListContext()

	const { space } = useDensity()

	const lifted = liftedId === id

	// Whether the content area itself acts on activation. Read the handler's
	// value, not its key: `onClick={enabled ? open : undefined}` leaves the key on
	// an inert row, which `in` would still count as a target.
	const activates = href !== undefined || (props as { onClick?: unknown }).onClick !== undefined

	// A row that navigates and a row that fires a handler read the same to the
	// user, so both take the interactive treatment. The prop overrides the
	// reading, for the rows whose activation the derivation cannot see.
	const interactive = interactiveProp ?? activates

	// The content column is only `flex-1`: the row's padding, the gaps, and the
	// prefix / suffix chrome lie outside it, so a press there hit the `<li>`, which
	// acts on nothing. Stretching the content area over the row hands the whole
	// painted surface to the one handler.
	//
	// It needs both readings, because the overlay can only deliver a press to the
	// content area. A row marked interactive for a handler that sits on a child
	// would cover that child instead, and a row that suppresses the treatment
	// would grow a target it does not paint.
	const stretched = interactive && activates

	// dnd-kit's attributes set role="button", overriding the host element's semantics
	// (a row is a list item; its content area is a link or a button). Drop the role;
	// keep the focus/aria hints.
	const { role: _role, tabIndex, ...dragAttrs } = attributes

	// One row, one Tab stop. An activatable content area is ALREADY focusable, so the
	// reorder gestures ride it rather than the `<li>` — wiring the `<li>` too put two
	// indistinguishable stops on every row of a reorderable list, one to move it and
	// one to open it. A row whose content only displays has nothing focusable inside,
	// so there the `<li>` is the stop, as before.
	const stopOnContent = reorderable && interactive
	const stopOnRow = reorderable && !interactive

	// The content area is also where `props` lands, so the row's own handlers are read out and
	// composed rather than left to fight the spread: whichever order they went in, one side would
	// silently win, and a consumer passing `onKeyDown` quietly turning off reordering for that row
	// is a bug nothing points at. Theirs runs first, then the gesture.
	const { onKeyDown: consumerKeyDown, onBlur: consumerBlur } = props as {
		onKeyDown?: (event: KeyboardEvent) => void
		onBlur?: (event: FocusEvent) => void
	}

	const reorderProps = {
		// The library's stop wins over a consumer `tabIndex`: a reorderable row has to be reachable,
		// and a row that is silently unreachable reads as the feature being broken.
		tabIndex: tabIndex ?? 0,
		onKeyDown: (event: KeyboardEvent) => {
			if (stopOnContent) consumerKeyDown?.(event)

			// Keys bubbling from focusable descendants (buttons, inputs) belong to
			// them, not the reorder gestures.
			if (event.target !== event.currentTarget) return

			onItemKeyDown(id, event)
		},
		onBlur: (event: FocusEvent) => {
			if (stopOnContent) consumerBlur?.(event)

			onItemBlur()
		},
		...dragAttrs,
	}

	return (
		<li
			ref={setNodeRef}
			style={style}
			{...(stopOnRow ? reorderProps : {})}
			data-slot="list-item"
			data-item-id={id}
			data-active={dataAttr(dragging)}
			data-lifted={dataAttr(lifted)}
			data-interactive={dataAttr(interactive)}
			className={cn(
				k.item({
					variant,
					density: space,
					active: dragging,
					lifted,
					interactive,
					stretched,
					rounded,
				}),
				className,
			)}
		>
			{prefix ?? (sortable ? <ListHandle /> : null)}
			<Polymorphic
				as={as}
				href={href}
				data-slot="list-item-content"
				className={k.content({ interactive, lifted, stretched })}
				{...props}
				{...(stopOnContent ? reorderProps : {})}
			>
				{children}
			</Polymorphic>
			{suffix}
		</li>
	)
}
