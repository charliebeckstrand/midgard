type Status = 'idle' | 'valid' | 'warning'

export function deriveStatus(password: string, confirm: string): Status {
	if (!password || !confirm || confirm.length < password.length) return 'idle'

	if (password === confirm) return 'valid'

	return 'warning'
}

export function handlePasswordInput(
	e: React.SyntheticEvent<HTMLDivElement>,
	setPassword: (value: string) => void,
) {
	const target = e.target

	if (!(target instanceof HTMLInputElement)) return

	if ('passwordConfirmInput' in target.dataset) return

	setPassword(target.value)
}
