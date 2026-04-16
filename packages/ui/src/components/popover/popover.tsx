'use client'

import {
	autoUpdate,
	FloatingPortal,
	flip,
	offset,
	type Placement,
	shift,
	useClick,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import {
	cloneElement,
	isValidElement,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn, createContext } from '../../core'
import { omote, sumi, ugoki } from '../../recipes'
import { Box, type BoxPadding } from '../box'
import { useGlass } from '../glass/context'
import { k } from './variants'

const popoverMiddleware = [offset(8), flip(), shift({ padding: 8 })]

type PopoverContextValue = {
	open: boolean
	setOpen: (open: boolean) => void
	close: () => void
	triggerRef: React.RefObject<HTMLButtonElement | null>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: React.CSSProperties
	getReferenceProps: (userProps?: object) => Record<string, unknown>
	getFloatingProps: (userProps?: object) => Record<string, unknown>
	onExitComplete?: () => void
}

const [PopoverProvider, usePopoverContext] = createContext<PopoverContextValue>('Popover')

export type PopoverProps = {
	placement?: Placement
	open?: boolean
	onOpenChange?: (open: boolean) => void
	onExitComplete?: () => void
	className?: string
	children: React.ReactNode
}

export function Popover({
	placement = 'bottom',
	open: openProp,
	onOpenChange,
	onExitComplete,
	className,
	children,
}: PopoverProps) {
	const [internalOpen, setInternalOpen] = useState(false)

	const open = openProp !== undefined ? openProp : internalOpen

	const setOpen = useCallback(
		(value: boolean) => {
			if (openProp === undefined) setInternalOpen(value)
			onOpenChange?.(value)
		},
		[openProp, onOpenChange],
	)

	const triggerRef = useRef<HTMLButtonElement>(null)

	const { refs, floatingStyles, context } = useFloating({
		placement,
		open,
		onOpenChange: setOpen,
		whileElementsMounted: autoUpdate,
		middleware: popoverMiddleware,
	})

	const click = useClick(context)

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: 'dialog' })

	const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])

	const prevOpenRef = useRef(open)

	useEffect(() => {
		if (prevOpenRef.current && !open) {
			triggerRef.current?.focus()
		}

		prevOpenRef.current = open
	}, [open])

	const close = useCallback(() => {
		setOpen(false)
	}, [setOpen])

	const contextValue = useMemo<PopoverContextValue>(
		() => ({
			open,
			setOpen,
			close,
			triggerRef,
			setReference: refs.setReference,
			setFloating: refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			onExitComplete,
		}),
		[
			open,
			setOpen,
			close,
			refs.setReference,
			refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			onExitComplete,
		],
	)

	return (
		<PopoverProvider value={contextValue}>
			<div data-slot="popover" className={cn(className)}>
				{children}
			</div>
		</PopoverProvider>
	)
}

export type PopoverTriggerProps = {
	children: React.ReactNode
	className?: string
	manual?: boolean
}

export function PopoverTrigger({ children, className, manual = false }: PopoverTriggerProps) {
	const { open, triggerRef, setReference, getReferenceProps } = usePopoverContext()

	const mergeRefs = useCallback(
		(node: HTMLElement | null) => {
			;(triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current =
				node as HTMLButtonElement | null
			setReference(node)
		},
		[triggerRef, setReference],
	)

	const shouldIgnore = useCallback((e: React.SyntheticEvent<HTMLElement>): boolean => {
		return e.target instanceof Element && e.target.closest('[data-popover-ignore]') !== null
	}, [])

	const wrapReferenceProps = useCallback(
		(props?: Record<string, unknown>) => {
			const refProps = getReferenceProps(props)

			const eventKeys = Object.keys(refProps).filter((key) => /^on[A-Z]/.test(key))

			const wrapped: Record<string, unknown> = { ...refProps }

			for (const key of eventKeys) {
				const original = refProps[key]

				if (typeof original === 'function') {
					wrapped[key] = (e: React.SyntheticEvent<HTMLElement>) => {
						if (shouldIgnore(e)) return

						return original(e)
					}
				}
			}

			return wrapped
		},
		[getReferenceProps, shouldIgnore],
	)

	if (isValidElement(children)) {
		const child = children as React.ReactElement<
			React.HTMLAttributes<HTMLElement> &
				React.RefAttributes<HTMLElement> & { [key: `data-${string}`]: string | undefined }
		>
		const referenceProps = manual
			? child.props
			: wrapReferenceProps(child.props as Record<string, unknown>)

		return cloneElement(child, {
			...(referenceProps as React.HTMLAttributes<HTMLElement>),
			ref: mergeRefs,
			'aria-haspopup': 'dialog',
			'aria-expanded': open,
			'data-slot': 'popover-trigger',
			className: cn(k.trigger, child.props.className, className),
		})
	}

	const referenceProps = manual ? {} : wrapReferenceProps()

	return (
		<button
			{...referenceProps}
			ref={mergeRefs}
			type="button"
			aria-haspopup="dialog"
			aria-expanded={open}
			data-slot="popover-trigger"
			className={cn(k.trigger, className)}
		>
			{children}
		</button>
	)
}

export type PopoverContentProps = {
	className?: string
	autoFocus?: boolean
	p?: BoxPadding
	children: React.ReactNode
}

export function PopoverContent({
	className,
	autoFocus = false,
	p = 4,
	children,
}: PopoverContentProps) {
	const { open, setFloating, floatingStyles, getFloatingProps, onExitComplete } =
		usePopoverContext()

	const contentRef = useRef<HTMLDivElement | null>(null)

	const glass = useGlass()

	useLayoutEffect(() => {
		if (open && autoFocus) {
			contentRef.current?.focus()
		}
	}, [open, autoFocus])

	return (
		<FloatingPortal>
			<AnimatePresence onExitComplete={onExitComplete}>
				{open && (
					<div
						ref={setFloating}
						style={floatingStyles}
						className={k.portal}
						{...getFloatingProps()}
					>
						<motion.div
							{...ugoki.popover}
							ref={contentRef}
							tabIndex={autoFocus ? -1 : undefined}
							data-slot="popover-content"
							className={cn('z-50', sumi.text, glass && omote.glass)}
						>
							<Box
								p={p}
								bg={glass ? 'none' : 'popover'}
								radius="lg"
								border={glass || undefined}
								className={className}
							>
								{children}
							</Box>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</FloatingPortal>
	)
}
