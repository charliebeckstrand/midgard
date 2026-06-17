import { bridge } from '../katakana'
import { popover } from '../kiso/popover'

export const k = bridge.popover(popover, { text: [popover.text, 'text-pretty'] })
