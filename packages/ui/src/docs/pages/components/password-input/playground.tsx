import { PasswordInput, type PasswordInputProps } from 'ui/password-input'

export default function PasswordInputPlayground(props: PasswordInputProps) {
	return <PasswordInput {...props} aria-label="Password" placeholder="Enter password" />
}
