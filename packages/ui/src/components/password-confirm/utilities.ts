type Status = 'idle' | 'warning'
type LastEdited = 'password' | 'confirm' | null

export function deriveStatus(password: string, confirm: string, lastEdited: LastEdited): Status {
	if (!password || !confirm) return 'idle'

	if (lastEdited === 'confirm' && confirm.length < password.length) return 'idle'

	if (password === confirm) return 'idle'

	return 'warning'
}

export function handlePasswordInput(
	e: React.SyntheticEvent<HTMLDivElement>,
	setPassword: (value: string) => void,
	setPasswordName: (name: string | undefined) => void,
	setLastEdited: (value: LastEdited) => void,
) {
	const target = e.target

	if (!(target instanceof HTMLInputElement)) return

	if ('passwordConfirmInput' in target.dataset) return

	setPassword(target.value)
	setPasswordName(target.name || undefined)
	setLastEdited('password')
}
