import { katachi } from '../../recipes'

const base = katachi.toggleIconButton

export const k = {
	base: [...base.base, 'disabled:text-green-600 disabled:opacity-100 disabled:cursor-default'],
}
