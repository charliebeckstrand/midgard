import { PasswordStrength, type PasswordStrengthProps } from 'ui/password-strength'

export default function PasswordStrengthPlayground(props: PasswordStrengthProps) {
	return <PasswordStrength {...props} value="Secret12" />
}
