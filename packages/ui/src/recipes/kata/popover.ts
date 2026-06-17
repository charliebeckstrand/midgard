import { bridge } from '../katakana'
import { popover } from '../kiso/popover'

export const k = bridge.popover(popover, { text: ['text-pretty', popover.text] })
