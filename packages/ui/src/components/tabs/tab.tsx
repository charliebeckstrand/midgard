'use client'

import {
	type ComponentPropsWithoutRef,
	type FocusEvent,
	type MouseEvent,
	type PointerEvent,
	useRef,
} from 'react'
import { cn, dataAttr } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { ActiveIndicator, useActiveIndicator } from '../../primitives/active-indicator'
import { useCurrent } from '../../primitives/current'
import { useDensity } from '../../primitives/density'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/tabs'
import { Button } from '../button'
import { useTabsContext } from './context'

/** Props for {@link Tab}. Selects via `value` (uncontrolled, against the Tabs root) or `current` (controlled); forwards the remaining `<button>` surface. */
export type TabProps = {
	value?: string
	current?: boolean
	/** Links this tab to its panel via aria-controls. */
	id?: string
	/**
	 * Fills the available cross-axis space (equal-width tabs).
	 * @defaultValue false
	 */
	stretch?: boolean
	disabled?: boolean
	/**
	 * Fires once when the user first signals intent to open an inactive tab —
	 * the pointer enters its trigger or the trigger takes focus — with the tab's
	 * `value`. The moment to warm what the panel will need: prefetch its data
	 * (a `queryClient.prefetchQuery`, a route fetch) so the panel is ready by the
	 * click. Latched to fire at most once per tab, skipped for the active tab and
	 * a `disabled` one; runs after any `onPointerEnter` / `onFocus` a caller also
	 * passes. The callback owns the work — the tab stays agnostic to what loads.
	 */
	onPreload?: (value: string | undefined) => void
	className?: string
} & Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'id' | 'value' | 'color'>

/**
 * Resolves the tab's current state plus its auto-wired tab/panel id pair (an
 * explicit `id` overrides; segments never auto-wire `aria-controls`).
 *
 * @internal
 */
function resolveTabState(opts: {
	id: string | undefined
	value: string | undefined
	currentProp: boolean | undefined
	contextValue: string | undefined
	baseId: string | undefined
	isSegment: boolean
	disclosure: { triggerId: string; panelId: string }
}): { current: boolean; tabId: string | undefined; controlsId: string | undefined } {
	const current = opts.currentProp ?? (opts.value !== undefined && opts.contextValue === opts.value)

	const auto =
		!opts.isSegment &&
		opts.id === undefined &&
		opts.value !== undefined &&
		opts.baseId !== undefined

	const tabId = opts.id ?? (auto ? opts.disclosure.triggerId : undefined)

	const controlsId = opts.id ? `${opts.id}-panel` : auto ? opts.disclosure.panelId : undefined

	return { current, tabId, controlsId }
}

/**
 * Single tab trigger: a headless `<Button>` carrying `role="tab"`, roving
 * `tabIndex`, and an `<ActiveIndicator>` while selected. Resolves `size` against
 * the Tabs context (or the Density cascade à la carte), and in the `tab` variant
 * auto-wires `aria-controls` to its `<TabContent>` via the Tabs base id + `value`;
 * `segment` tabs have no panels. Clicking sets the enclosing selection state.
 */
export function Tab({
	value,
	current: currentProp,
	id,
	stretch = false,
	disabled,
	onPreload,
	className,
	children,
	onClick,
	onPointerEnter,
	onFocus,
	...rest
}: TabProps) {
	const context = useCurrent()

	const tabsContext = useTabsContext()

	const indicator = useActiveIndicator()

	// Inside <Tabs>, `tabsContext.size` is pre-resolved; à la carte use
	// (<TabList>+<Tab> without <Tabs>) falls back to the Density cascade.
	const inherited = useDensity()

	const size = tabsContext?.size ?? inherited.size

	const isSegment = tabsContext?.variant === 'segment'

	const orientation = tabsContext?.orientation ?? 'horizontal'

	// Derives a matched tab/panel id pair from the Tabs base id + value,
	// auto-wiring <TabContent value>. An explicit `id` prop overrides this
	// for manual <TabPanel id> linkage. Segments have no panels and never
	// auto-wire `aria-controls`.
	const disclosure = useA11yDisclosure({ id: tabsContext?.baseId, key: value })

	const { current, tabId, controlsId } = resolveTabState({
		id,
		value,
		currentProp,
		contextValue: context?.value,
		baseId: tabsContext?.baseId,
		isSegment,
		disclosure,
	})

	function handleClick(event: MouseEvent<HTMLButtonElement>) {
		onClick?.(event)

		if (value !== undefined) {
			context?.onValueChange?.(value)
		}
	}

	// Warm intent: the first hover or focus on an inactive, enabled tab fires
	// `onPreload` once (latched), so a caller can prefetch what the panel needs
	// before it opens. The active tab is already visited; a disabled one can't be.
	const preloaded = useRef(false)

	function preload() {
		if (preloaded.current || current || disabled) return

		preloaded.current = true

		onPreload?.(value)
	}

	function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
		onPointerEnter?.(event)

		preload()
	}

	function handleFocus(event: FocusEvent<HTMLButtonElement>) {
		onFocus?.(event)

		preload()
	}

	return (
		<span className={k.wrapper({ stretch })} {...indicator.tapHandlers}>
			<HeadlessProvider>
				<Button
					// Forwards the full button surface (aria-label, data-testid,
					// onBlur, title, …); the tab wiring below wins over any
					// colliding consumer prop. A caller's onPointerEnter / onFocus
					// are composed (run first) rather than forwarded, so the preload
					// intent can chain onto them.
					{...rest}
					data-slot="tab"
					data-current={dataAttr(current)}
					role="tab"
					id={tabId}
					aria-selected={current ?? false}
					// Explicit-id panels stay mounted; `aria-controls` is always set.
					// Auto panels unmount when inactive unless an all-mounted
					// TabContents keeps them mounted (registered via context);
					// then every tab references its panel.
					aria-controls={
						id !== undefined || current || tabsContext?.panelsMounted ? controlsId : undefined
					}
					tabIndex={current ? 0 : -1}
					disabled={disabled}
					type="button"
					className={cn(
						k.trigger({ stretch }),
						isSegment ? k.segment.item({ size }) : k.tab({ orientation, size }),
						className,
					)}
					onClick={handleClick}
					onPointerEnter={handlePointerEnter}
					onFocus={handleFocus}
				>
					{children}
				</Button>
			</HeadlessProvider>
			{current && (
				<ActiveIndicator
					ref={indicator.ref}
					className={cn(isSegment ? k.segment.indicator : k.indicator({ orientation }))}
				/>
			)}
		</span>
	)
}
