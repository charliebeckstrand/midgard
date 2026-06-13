/** Supported card brand identifiers. */
export type CreditCardBrand =
	| 'visa'
	| 'mastercard'
	| 'amex'
	| 'discover'
	| 'diners'
	| 'jcb'
	| 'unionpay'

/** Brand metadata: display label plus the number lengths, digit-group gap offsets, and CVV length that drive masking and validation. */
export type CreditCardBrandInfo = {
	brand: CreditCardBrand
	label: string
	lengths: number[]
	gaps: number[]
	cvvLength: number
}
