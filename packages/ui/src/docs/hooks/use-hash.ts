import { useSyncExternalStore } from 'react'
import { defaultDemo } from '../registry'

const subscribe = (notify: () => void) => {
	window.addEventListener('hashchange', notify)

	return () => window.removeEventListener('hashchange', notify)
}

const getSnapshot = () => window.location.hash.slice(1) || defaultDemo

export function useHash() {
	return useSyncExternalStore(subscribe, getSnapshot)
}
