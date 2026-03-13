import { Suspense } from 'react'

import { RegisterForm } from './register-form'

export default function RegisterPage() {
	return (
		<Suspense>
			<div className="flex flex-1 items-center justify-center">
				<RegisterForm />
			</div>
		</Suspense>
	)
}
