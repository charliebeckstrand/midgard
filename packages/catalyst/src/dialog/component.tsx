'use client'

import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { createContext, useContext, useEffect, useId } from 'react'
import { overlayAnimation } from '../utils/motion'
import { Text } from '../text'

const sizes = {
	xs: 'sm:max-w-xs',
	sm: 'sm:max-w-sm',
	md: 'sm:max-w-md',
	lg: 'sm:max-w-lg',
	xl: 'sm:max-w-xl',
	'2xl': 'sm:max-w-2xl',
	'3xl': 'sm:max-w-3xl',
	'4xl': 'sm:max-w-4xl',
	'5xl': 'sm:max-w-5xl',
}

interface DialogContextValue {
	titleId: string
	descriptionId: string
}

const DialogContext = createContext<DialogContextValue>({
	titleId: '',
	descriptionId: '',
})

export function Dialog({
	open,
	onClose,
	size = 'lg',
	className,
	children,
}: {
	open: boolean
	onClose: () => void
	size?: keyof typeof sizes
	className?: string
	children: React.ReactNode
}) {
	const titleId = useId()
	const descriptionId = useId()

	useEffect(() => {
		if (!open) return

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose()
		}

		document.addEventListener('keydown', onKeyDown)
		document.body.style.overflow = 'hidden'

		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.body.style.overflow = ''
		}
	}, [open, onClose])

	return (
		<DialogContext.Provider value={{ titleId, descriptionId }}>
			<AnimatePresence>
				{open && (
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby={titleId}
						aria-describedby={descriptionId}
						className="fixed inset-0 z-50"
					>
						<motion.div
							aria-hidden="true"
							{...overlayAnimation}
							className="fixed inset-0 bg-zinc-950/25 dark:bg-zinc-950/50"
							onClick={onClose}
						/>

						<div className="fixed inset-0 w-screen overflow-y-auto pt-6 sm:pt-0">
							<div className="grid min-h-full grid-rows-[1fr_auto] justify-items-center sm:grid-rows-[1fr_auto_3fr] sm:p-4">
								<motion.div
									initial={{ opacity: 0, y: 0 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 0 }}
									transition={{ duration: 0.15 }}
									className={clsx(sizes[size], 'row-start-2 flex w-full min-w-0 sm:mb-auto')}
								>
									<div
										className={clsx(
											className,
											'w-full min-w-0 rounded-t-3xl bg-white p-(--gutter) shadow-lg ring-1 ring-zinc-950/10 [--gutter:--spacing(8)] sm:rounded-2xl dark:bg-zinc-900 dark:ring-white/10 forced-colors:outline',
										)}
									>
										{children}
									</div>
								</motion.div>
							</div>
						</div>
					</div>
				)}
			</AnimatePresence>
		</DialogContext.Provider>
	)
}

export function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<'h2'>) {
	const { titleId } = useContext(DialogContext)

	return (
		<h2
			id={titleId}
			{...props}
			className={clsx(className, 'text-lg/6 font-semibold text-balance text-zinc-950 sm:text-base/6 dark:text-white')}
		/>
	)
}

export function DialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof Text>) {
	const { descriptionId } = useContext(DialogContext)

	return <Text id={descriptionId} {...props} className={clsx(className, 'mt-2 text-pretty')} />
}

export function DialogBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div {...props} className={clsx(className, 'mt-6')} />
}

export function DialogActions({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return (
		<div
			{...props}
			className={clsx(
				className,
				'mt-8 flex flex-col-reverse items-center justify-end gap-3 *:w-full sm:flex-row sm:*:w-auto',
			)}
		/>
	)
}
