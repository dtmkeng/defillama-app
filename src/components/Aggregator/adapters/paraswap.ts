// Source: https://developers.paraswap.network/api/master

import { ethers, Signer } from 'ethers'

// api docs have an outdated chain list, need to check https://app.paraswap.io/# to find supported networks
export const chainToId = {
	ethereum: 1,
	bsc: 52,
	polygon: 137,
	avax: 43114,
	optimism: 10,
	arbitrum: 42161,
	fantom: 250
}

export const name = 'ParaSwap'
export const token = 'PSP'

export function approvalAddress() {
	return '0x216b4b4ba9f3e719726886d34a177484278bfcae'
}
const nativeToken = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
export async function getQuote(chain: string, from: string, to: string, amount: string) {
	// ethereum = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
	// amount should include decimals

	const tokenFrom = from === ethers.constants.AddressZero ? nativeToken : from
	const tokenTo = to === ethers.constants.AddressZero ? nativeToken : to
	const data = await fetch(
		`https://apiv5.paraswap.io/prices/?srcToken=${tokenFrom}&destToken=${tokenTo}&amount=${amount}&srcDecimals=18&destDecimals=18&side=SELL&network=${chainToId[chain]}`
	).then((r) => r.json())
	return {
		amountReturned: data.priceRoute.destAmount,
		estimatedGas: data.priceRoute.gasCost,
		tokenApprovalAddress: data.priceRoute.tokenTransferProxy,
		rawQuote: data.priceRoute,
		logo: 'https://assets.coingecko.com/coins/images/20403/small/ep7GqM19_400x400.jpg?1636979120'
	}
}

export async function swap({ chain, from, to, amount, signer, rawQuote }) {
	const fromAddress = await signer.getAddress()

	const data = await fetch(`https://apiv5.paraswap.io/transactions/${chainToId[chain]}`, {
		method: 'POST',
		body: JSON.stringify({
			srcToken: rawQuote.srcToken,
			srcDecimals: rawQuote.srcDecimals,
			destToken: rawQuote.destToken,
			destDecimals: rawQuote.destDecimals,
			srcAmount: rawQuote.srcAmount,
			destAmount: rawQuote.destAmount,
			userAddress: fromAddress,
			txOrigin: fromAddress,
			deadline: Math.floor(Date.now() / 1000) + 300,
			priceRoute: rawQuote
		}),
		headers: {
			'Content-Type': 'application/json'
		}
	}).then((r) => r.json())

	const tx = await signer.sendTransaction({
		from: data.from,
		to: data.to,
		data: data.data,
		value: data.value,
		gasPrice: data.gasPrice
	})
	return tx
}
