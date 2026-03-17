import { AuthFormPage, type AuthFormPageProps } from './auth-form'

export type RegisterPageProps = AuthFormPageProps

export function RegisterPage({ submitLabel = 'Create account', ...props }: RegisterPageProps) {
	return <AuthFormPage defaultHeading="Create your account" submitLabel={submitLabel} {...props} />
}
