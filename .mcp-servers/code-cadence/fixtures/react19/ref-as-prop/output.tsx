import type { Ref } from 'react'

type InputProps = { placeholder?: string }

export const Input = ({ ref, placeholder, ...props }: InputProps & { ref?: Ref<HTMLInputElement> }) => {
	return <input ref={ref} placeholder={placeholder} {...props} />
}
