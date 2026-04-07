'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { useCallback, useState } from 'react'
import { createContext } from '../../core/create-context'
import { Button } from '../button'
import type { ButtonVariants } from '../button/variants'
import { disclosureButtonVariants, disclosurePanelVariants } from './variants'

type DisclosureContextValue = {
	open: boolean
	toggle: () => void
}

const [DisclosureProvider, useDisclosureContext] =
	createContext<DisclosureContextValue>('Disclosure')

export type DisclosureProps = {
	defaultOpen?: boolean
	children: React.ReactNode
	className?: string
}

export function Disclosure({ defaultOpen = false, children, className }: DisclosureProps) {
	const [open, setOpen] = useState(defaultOpen)

	const toggle = useCallback(() => setOpen((o) => !o), [])

	return (
		<DisclosureProvider value={{ open, toggle }}>
			<div data-slot="disclosure" data-open={open || undefined} className={className}>
				{children}
			</div>
		</DisclosureProvider>
	)
}

export type DisclosureButtonProps = ButtonVariants &
	Omit<React.ComponentProps<'button'>, 'children'> & {
		children: React.ReactNode | ((bag: { open: boolean }) => React.ReactNode)
	}

export function DisclosureButton({ className, children, ...props }: DisclosureButtonProps) {
	const { open, toggle } = useDisclosureContext()

	return (
		<Button
			variant="ghost"
			data-slot="disclosure-button"
			aria-expanded={open}
			spring={false}
			onClick={toggle}
			className={disclosureButtonVariants({ className })}
			{...props}
		>
			{typeof children === 'function' ? children({ open }) : children}
		</Button>
	)
}

export type DisclosurePanelProps = {
	children: React.ReactNode
	className?: string
}

export function DisclosurePanel({ children, className }: DisclosurePanelProps) {
	const { open } = useDisclosureContext()

	return (
		<AnimatePresence initial={false}>
			{open && (
				<motion.div
					data-slot="disclosure-panel"
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: 'auto', opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
					transition={{ duration: 0.2, ease: 'easeInOut' }}
					className={disclosurePanelVariants({ className })}
				>
					{children}
				</motion.div>
			)}
		</AnimatePresence>
	)
}
