import { type ReactNode, type RefObject, useEffect } from 'react'

const noop = () => {}

const identity = <T>(x: T) => x

type MockContext = { open?: boolean; onOpenChange?: (open: boolean) => void }

type MockInteraction = { reference?: { onClick?: (e: unknown) => void } }

type MockFocusManagerProps = {
	children: ReactNode
	initialFocus?: RefObject<HTMLElement | null>
}

function MockFloatingFocusManager({ children, initialFocus }: MockFocusManagerProps) {
	useEffect(() => {
		initialFocus?.current?.focus()
	}, [initialFocus])

	return children
}

/**
 * `@floating-ui/react` mock applied globally via `setup/module-mocks.ts`.
 *
 * Provides just enough behavior for tests:
 *   - `useFloating` exposes `open` and `onOpenChange` on `context` so consumers
 *     of `useClick` can wire click-to-toggle.
 *   - `useClick` returns an onClick that flips open via `onOpenChange`.
 *   - `useInteractions` merges interaction-supplied onClick handlers into the
 *     reference props alongside any user-supplied onClick.
 *
 * Everything else (positioning, hover, focus, dismiss, role, portals) is a
 * noop or identity passthrough. Mocking globally keeps the module graph
 * consistent across the vmThreads pool — per-file mocks for the same module
 * can resolve inconsistently when `sequence.shuffle` reorders worker loading.
 */
const floatingUIMock = {
	autoUpdate: noop,
	FloatingFocusManager: MockFloatingFocusManager,
	FloatingPortal: ({ children }: { children: ReactNode }) => children,
	flip: () => ({}),
	offset: () => ({}),
	shift: () => ({}),
	size: () => ({}),
	safePolygon: () => () => {},
	useClick: (context: MockContext): MockInteraction => ({
		reference: {
			onClick: () => context?.onOpenChange?.(!context?.open),
		},
	}),
	useClientPoint: (): MockInteraction => ({}),
	useDismiss: (): MockInteraction => ({}),
	useFocus: (): MockInteraction => ({}),
	useHover: (): MockInteraction => ({}),
	useFloating: (opts: MockContext) => ({
		refs: {
			setReference: noop,
			setFloating: noop,
			reference: { current: null },
			floating: { current: null },
			domReference: { current: null },
		},
		floatingStyles: {},
		context: { open: opts?.open, onOpenChange: opts?.onOpenChange } as MockContext,
		x: 0,
		y: 0,
		strategy: 'absolute',
		placement: 'bottom',
		middlewareData: {},
		isPositioned: true,
		update: noop,
	}),
	useInteractions: (interactions: MockInteraction[] = []) => ({
		getReferenceProps: (userProps: Record<string, unknown> = {}) => {
			const merged: Record<string, unknown> = { ...userProps }

			for (const interaction of interactions) {
				const onClick = interaction?.reference?.onClick

				if (typeof onClick === 'function') {
					const existing = merged.onClick as ((e: unknown) => void) | undefined

					merged.onClick = (e: unknown) => {
						existing?.(e)
						onClick(e)
					}
				}
			}

			return merged
		},
		getFloatingProps: identity,
		getItemProps: identity,
	}),
	useRole: (): MockInteraction => ({}),
}

export default floatingUIMock
