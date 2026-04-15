import {
	autoUpdate,
	type ExtendedRefs,
	flip,
	offset,
	type Placement,
	type ReferenceType,
	shift,
	size,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from '@floating-ui/react'

type UseFloatingUIParams = {
	placement: Placement
	open: boolean
	onOpenChange: (open: boolean) => void
	role?: 'listbox' | 'menu'
}

type UseFloatingUIReturn = {
	refs: ExtendedRefs<ReferenceType>
	floatingStyles: React.CSSProperties
	getReferenceProps: (userProps?: React.HTMLProps<Element>) => Record<string, unknown>
	getFloatingProps: (userProps?: React.HTMLProps<HTMLElement>) => Record<string, unknown>
}

export function useFloatingUI({
	placement,
	open,
	onOpenChange,
	role: roleProp = 'listbox',
}: UseFloatingUIParams): UseFloatingUIReturn {
	const { refs, floatingStyles, context } = useFloating({
		placement,
		open,
		onOpenChange,
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(4),
			flip(),
			shift({ padding: 8 }),
			size({
				apply({ rects, elements }) {
					Object.assign(elements.floating.style, {
						minWidth: `${rects.reference.width}px`,
					})
				},
			}),
		],
	})

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: roleProp })

	const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role])

	return { refs, floatingStyles, getReferenceProps, getFloatingProps }
}
