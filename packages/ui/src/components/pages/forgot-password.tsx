import { AuthFormPage, type AuthFormPageProps } from './auth-form'

export type ForgotPasswordPageProps = AuthFormPageProps

export function ForgotPasswordPage({
	submitLabel = 'Send reset link',
	...props
}: ForgotPasswordPageProps) {
	return <AuthFormPage defaultHeading="Reset your password" submitLabel={submitLabel} {...props} />
}
