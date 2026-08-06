import { omote, sou, ugoki } from '../kiso'

const { backdrop } = omote
const { overlay } = ugoki

export const k = {
	motion: overlay,
	backdrop,
	// Seals the page for a transaction. `PersistentChrome`, floats, and toasts all
	// sit above — see the `sou` ladder.
	root: ['inset-0', sou.overlay],
}
