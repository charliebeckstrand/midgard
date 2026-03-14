'use client'

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { Input } from 'catalyst'
import { type ComponentPropsWithoutRef, useCallback, useRef, useState } from 'react'
import { DecryptedText } from 'reactbits/decrypted-text'

type PasswordInputProps = Omit<ComponentPropsWithoutRef<typeof Input>, 'type'>

export function PasswordInput({ value, ...props }: PasswordInputProps) {
	const [visible, setVisible] = useState(false)
	const [animationKey, setAnimationKey] = useState(0)
	const [showOverlay, setShowOverlay] = useState(false)
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

	const toggle = useCallback(() => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current)

		if (!visible) {
			setVisible(true)
			setAnimationKey((k) => k + 1)
			setShowOverlay(true)

			const charCount = String(value ?? '').length
			const duration = Math.min(charCount * 50 + 200, 1000)

			timeoutRef.current = setTimeout(() => {
				setShowOverlay(false)
			}, duration)
		} else {
			setShowOverlay(false)
			setVisible(false)
		}
	}, [visible, value])

	const passwordValue = String(value ?? '')

	return (
		<div className="relative">
			<Input {...props} type={visible ? 'text' : 'password'} value={value} />
			{visible && showOverlay && passwordValue.length > 0 && (
				<span className="pointer-events-none absolute inset-0 flex items-center px-[calc(var(--spacing-3-5)-1px)] sm:px-[calc(var(--spacing-3)-1px)]">
					<DecryptedText
						key={animationKey}
						text={passwordValue}
						speed={40}
						maxIterations={8}
						sequential
						revealDirection="start"
						animateOn="view"
						className="text-base/6 text-zinc-950 sm:text-sm/6 dark:text-white"
						encryptedClassName="text-base/6 text-zinc-400 sm:text-sm/6 dark:text-zinc-500"
					/>
				</span>
			)}
			<button
				type="button"
				onClick={toggle}
				className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
				aria-label={visible ? 'Hide password' : 'Show password'}
			>
				{visible ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
			</button>
		</div>
	)
}
