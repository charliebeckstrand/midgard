import { AuthFormPage, type AuthFormPageProps } from './auth-form'

export type LoginPageProps = AuthFormPageProps

export function LoginPage({ submitLabel = 'Sign in', ...props }: LoginPageProps) {
	return (
		<AuthFormPage defaultHeading="Sign in to your account" submitLabel={submitLabel} {...props} />
	)
}
