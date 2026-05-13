import { omote } from '../ryu/omote'
import { tsunagi } from '../ryu/tsunagi'

export const placeholder = {
	base: [omote.skeleton, 'block h-4', 'rounded-lg', ...tsunagi.base],
}

export { placeholder as k }
