'use client'

import { type ComponentProps, useRef } from 'react'
import { cn, composeEventHandlers, dataAttr } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { useStableEvent } from '../../hooks/use-stable-event'
import { ActiveIndicator, useActiveIndicator } from '../../primitives/active-indicator'
import { useCurrentItem } from '../../primitives/current/current'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/tabs'
import { Button } from '../button'
import { useTabsContext } from './context'
import { useTabSelectScroll } from './use-tab-list-scroll'

/** Props for {@link Tab}. Selects via `value` (uncontrolled, against the Tabs root) or `current` (controlled); forwards the remaining `<button>` surface. */
export type TabProps = {
	/** The key of the tab. The tab is current when it matches the `value` of the {@link Tabs} root, and a click selects it. */
	value?: string
	/**
	 * Marks the tab as current and overrides the match against the root `value`.
	 *
	 * @defaultValue `false`, or `true` when the `value` matches the `value` of the {@link Tabs} root.
	 */
	current?: boolean
	/**
	 * Links this tab to a panel the consumer renders itself, via `aria-controls`
	 * (`${id}-panel`). Leave it unset to auto-wire a `<TabContent value>`.
	 */
	id?: string
	/**
	 * Fills the available cross-axis space (equal-width tabs).
	 * @defaultValue false
	 */
	stretch?: boolean
	/**
	 * Disables the tab, so that it cannot be selected.
	 * @defaultValue false
	 */
	disabled?: boolean
	/**
	 * Fires once when the user first signals intent to open an inactive tab, with
	 * the tab's `value`. Intent is the pointer entering its trigger, or the
	 * trigger taking focus. The moment to warm what the panel will need: prefetch
	 * its data (a `queryClient.prefetchQuery`, a route fetch) so the panel is
	 * ready by the click. Latched to fire at most once per tab, skipped for the
	 * active tab and a `disabled` one. It runs after any `onPointerEnter` /
	 * `onFocus` a caller also passes. The callback owns the work — the tab stays agnostic to what loads.
	 *
	 * @remarks
	 * A `mount` policy on `TabContents` covers only half of this. A held panel
	 * rests in a hidden `<Activity>`, which renders its children. Render-phase
	 * work therefore warms for free: a `lazy()` chunk resolves, a `use()`d promise
	 * starts.
	 * A hidden Activity mounts no effects, so effect-driven work does not — a
	 * `useQuery` inside a held panel still waits to be shown. `onPreload` is what
	 * warms that half, under every mount policy.
	 */
	onPreload?: (value: string | undefined) => void
	className?: string
} & Omit<ComponentProps<'button'>, 'className' | 'id' | 'value' | 'color'>

/**
 * Resolves the tab's current state plus its auto-wired tab/panel id pair (an
 * explicit `id` overrides).
 *
 * @internal
 */
function resolveTabState(opts: {
	id: string | undefined
	value: string | undefined
	currentProp: boolean | undefined
	contextCurrent: boolean
	baseId: string | undefined
	disclosure: { triggerId: string; panelId: string }
}): { current: boolean; tabId: string | undefined; controlsId: string | undefined } {
	const current = opts.currentProp ?? opts.contextCurrent

	const auto = opts.id === undefined && opts.value !== undefined && opts.baseId !== undefined

	const tabId = opts.id ?? (auto ? opts.disclosure.triggerId : undefined)

	const controlsId = opts.id ? `${opts.id}-panel` : auto ? opts.disclosure.panelId : undefined

	return { current, tabId, controlsId }
}

/**
 * Single tab trigger: a headless `<Button>` carrying `role="tab"`, roving
 * `tabIndex`, and an `<ActiveIndicator>` while selected. Its padding and text
 * follow the nearest density scope. In the `tab` variant it
 * auto-wires `aria-controls` to its `<TabContent>` via the Tabs base id +
 * `value`. A `segment` tab does the same while the group renders a
 * `<TabContents>`, because a segmented control often has no panels. Clicking
 * sets the enclosing selection state.
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
	ref: consumerRef,
	...rest
}: TabProps) {
	// The tab reads its own value, so a switch renders only the tab that stops
	// being current and the tab that becomes current.
	const item = useCurrentItem(value)

	const tabsContext = useTabsContext()

	// Destructured: the compiler reads a property of a result that holds a ref as
	// a ref read.
	const { ref: indicatorRef, tapHandlers } = useActiveIndicator()

	const isSegment = tabsContext?.variant === 'segment'

	const orientation = tabsContext?.orientation ?? 'horizontal'

	// Derives a matched tab/panel id pair from the Tabs base id + value,
	// auto-wiring <TabContent value>. An explicit `id` prop overrides this to
	// link a panel the consumer renders.
	const disclosure = useA11yDisclosure({ id: tabsContext?.baseId, key: value })

	const { current, tabId, controlsId } = resolveTabState({
		id,
		value,
		currentProp,
		contextCurrent: item.current,
		baseId: tabsContext?.baseId,
		disclosure,
	})

	// Explicit-id panels stay mounted; `aria-controls` is always set. Auto panels
	// unmount when inactive unless an all-mounted TabContents keeps them mounted
	// (registered via context); then every tab references its panel. A segmented
	// control often has no panels, so a segment tab also waits for a TabContents.
	const panelInDom =
		id !== undefined ||
		((current || tabsContext?.panelsMounted) && (!isSegment || tabsContext?.panelsPresent))

	// Selection is the activation a tab exists to perform, so a consumer's
	// preventDefault() does not cancel it (CONVENTIONS.md §3.9).
	const handleClick = composeEventHandlers(
		onClick,
		() => {
			if (value !== undefined) {
				item.onValueChange?.(value)
			}
		},
		{ checkForDefaultPrevented: false },
	)

	// Warm intent: the first hover or focus on an inactive, enabled tab fires
	// `onPreload` once (latched), so a caller can prefetch what the panel needs
	// before it opens. The active tab is already visited; a disabled one can't be.
	const preloaded = useRef(false)

	// The latch is a ref, so the handler reads it through a stable event and not
	// during render.
	const preload = useStableEvent(() => {
		if (preloaded.current || current || disabled) return

		preloaded.current = true

		onPreload?.(value)
	})

	// The preload is side behavior, so a consumer's preventDefault() skips it.
	const handlePointerEnter = composeEventHandlers(onPointerEnter, preload)

	const handleFocus = composeEventHandlers(onFocus, preload)

	// A selection that does not move focus scrolls the tab into the viewport of
	// the list. The segment variant has no viewport.
	const selectScrollRef = useTabSelectScroll(current, orientation, !isSegment)

	const setTab = useComposedRef(selectScrollRef, consumerRef)

	return (
		<span className={k.wrapper({ stretch })} {...tapHandlers}>
			<HeadlessProvider>
				<Button
					// Forwards the full button surface (aria-label, data-testid,
					// onBlur, title, …); the tab wiring below wins over any
					// colliding consumer prop. A caller's onPointerEnter / onFocus
					// are composed (run first) rather than forwarded, so the preload
					// intent can chain onto them.
					{...rest}
					ref={setTab}
					data-slot="tab"
					data-current={dataAttr(current)}
					role="tab"
					id={tabId}
					aria-selected={current}
					aria-controls={panelInDom ? controlsId : undefined}
					tabIndex={current ? 0 : -1}
					disabled={disabled}
					type="button"
					className={cn(
						k.trigger({ stretch }),
						isSegment ? k.segment.item : k.tab({ orientation }),
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
					ref={indicatorRef}
					className={cn(isSegment ? k.segment.indicator : k.indicator({ orientation }))}
				/>
			)}
		</span>
	)
}
