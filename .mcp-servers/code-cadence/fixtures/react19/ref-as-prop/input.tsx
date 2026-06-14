import { forwardRef } from 'react'

type InputProps = { placeholder?: string }

export const Input = forwardRef<HTMLInputElement, InputProps>(({ placeholder, ...props }, ref) => {
	return <input ref={ref} placeholder={placeholder} {...props} />
})
