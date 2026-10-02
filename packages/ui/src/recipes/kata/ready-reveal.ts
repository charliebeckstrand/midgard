import { ugoki } from '../kiso'

const { reveal } = ugoki

export const k = {
	transition: reveal.transition,
	/** The live region that announces `loadingLabel`. It is out of flow, so it does not size the cell. */
	status: 'sr-only',
}
