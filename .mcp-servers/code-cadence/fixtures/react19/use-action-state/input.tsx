import { useState } from 'react'

export function SignupForm() {
	const [error, setError] = useState<string | null>(null)
	const [pending, setPending] = useState(false)

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setPending(true)
		setError(null)
		try {
			const data = new FormData(event.currentTarget)
			await fetch('/api/signup', { method: 'POST', body: data })
		} catch {
			setError('Signup failed')
		} finally {
			setPending(false)
		}
	}

	return (
		<form onSubmit={handleSubmit}>
			<input name="email" />
			<button disabled={pending} type="submit">
				Sign up
			</button>
			{error && <p>{error}</p>}
		</form>
	)
}
