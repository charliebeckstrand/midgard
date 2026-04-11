import { useEffect, useState } from 'react'
import { defaultDemo } from '../registry'

export function useHash() {
	const [hash, setHash] = useState(() => window.location.hash.slice(1) || defaultDemo)

	useEffect(() => {
		const onHashChange = () => setHash(window.location.hash.slice(1) || defaultDemo)

		window.addEventListener('hashchange', onHashChange)

		return () => window.removeEventListener('hashchange', onHashChange)
	}, [])

	return hash
}
