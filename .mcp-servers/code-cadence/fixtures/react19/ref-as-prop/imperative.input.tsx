import { forwardRef, useImperativeHandle, useRef } from 'react'

type DialogHandle = { focus: () => void }

export const Dialog = forwardRef<DialogHandle, { title: string }>(({ title }, ref) => {
	const localRef = useRef<HTMLDivElement>(null)
	useImperativeHandle(ref, () => ({ focus: () => localRef.current?.focus() }))
	return <div ref={localRef}>{title}</div>
})
