import {
	type ExtSuit,
	type ExtValue,
	type Call,
	type ExtCard,
	type DoubleFlushCall,
	HandRank,
	names,
	RNI,
	RNIKeys,
	royalFlushes,
	symbolToValueObj,
} from "./bs_poker_types.js";
import { emoji, suits } from "../cards/basic_card_types.js";
import {
	suitToBasicEmoji,
	valueToSymbol,
} from "../cards/basic_card_functions.js";
import { countInArray, invalidNumber } from "../util.js";

const toEmptyRgx = /[.,!]/g;
const toSpacesRgx = /-/g;

function namesHas(index: number, given: string) {
	return names[index].some(name => given.startsWith(name));
}

export function parseCall(givenCall: string): Call | null {
	try {
		const call = givenCall
			.toLowerCase()
			.replace(toEmptyRgx, "")
			.replace(toSpacesRgx, " ")
			.trim();
		const royalIndex = royalFlushes.findIndex(x => x.includes(call));
		if (royalIndex !== -1) {
			const suit = suits[royalIndex];
			return {
				high: { value: 14, suit },
				call: HandRank.StraightFlush,
			};
		}
		const tokens = call.split(" ");

		const pairAppearances = countInArray(tokens, x =>
			names[RNI[HandRank.Pair]].includes(x)
		);

		if (pairAppearances === 2) {
			// double pair case
			// double pairs are asked like this: 2 pair 4 pair
			const high1 = symbolToValue(tokens[0]);
			if (invalidNumber(high1)) return null;
			const high2 = symbolToValue(tokens[2]);
			if (invalidNumber(high2)) return null;
			return {
				high: [high1, high2],
				call: HandRank.DoublePair,
			};
		}

		if (pairAppearances === 3) {
			// triple pair case
			// triple pairs are asked like this: 2 pair 4 pair 6 pair
			const high1 = symbolToValue(tokens[0]);
			if (invalidNumber(high1)) return null;
			const high2 = symbolToValue(tokens[2]);
			if (invalidNumber(high2)) return null;
			const high3 = symbolToValue(tokens[4]);
			if (invalidNumber(high3)) return null;
			return {
				high: [high1, high2, high3],
				call: HandRank.TriplePair,
			};
		}

		const tripleAppearances = countInArray(tokens, x =>
			names[RNI[HandRank.Triple]].includes(x)
		);
		if (tripleAppearances === 2) {
			// double triple case
			// double triples are asked like this: 2 triple 4 triple
			const high1 = symbolToValue(tokens[0]);
			if (invalidNumber(high1)) return null;
			const high2 = symbolToValue(tokens[2]);
			if (invalidNumber(high2)) return null;
			return {
				high: [high1, high2],
				call: HandRank.DoubleTriple,
			};
		}

		// Full Houses
		if (pairAppearances === 1 && tripleAppearances === 1) {
			const tripleIndex = tokens.findIndex(x =>
				names[RNI[HandRank.Triple]].includes(x)
			);
			const pairIndex = tokens.findIndex(x =>
				names[RNI[HandRank.Pair]].includes(x)
			);
			const indices = tripleIndex < pairIndex ? [0, 2] : [2, 0];
			const high1 = symbolToValue(tokens[indices[0]]);
			if (invalidNumber(high1)) return null;
			const high2 = symbolToValue(tokens[indices[1]]);
			if (invalidNumber(high2)) return null;
			return {
				high: [high1, high2],
				call: HandRank.FullHouse,
			};
		}

		const high = symbolToValue(tokens[0]);
		if (high === null) return null;
		const callName = tokens.slice(1).join(" ");
		const callIndex = names.findIndex(name => name.includes(callName));

		const call1 = tokens.findIndex(x => symbolToValue(x) !== null);
		const call2 = tokens.findLastIndex(x => symbolToValue(x) !== null);
		const c1c2good = call1 !== -1 && call2 !== -1 && call1 !== call2;
		// Split the call into 4 sections
		// Example call: A flush hearts K flush clubs -> ["A", "flush hearts", "K", "flush clubs"]
		// the indexes of the A and K are given in call1 and call2
		const newSplit = c1c2good
			? [
					tokens
						.slice(0, call1 + 1)
						.join(" ")
						.trim(),
					tokens
						.slice(call1 + 1, call2)
						.join(" ")
						.trim(),
					tokens
						.slice(call2, call2 + 1)
						.join(" ")
						.trim(),
					tokens
						.slice(call2 + 1)
						.join(" ")
						.trim(),
			  ]
			: null;
		const flushAppearances = newSplit
			? newSplit
					.map((x): ExtSuit => {
						if (namesHas(RNI[HandRank.Flush], x)) return "H";
						if (namesHas(RNI[HandRank.Flush + 1], x)) return "D";
						if (namesHas(RNI[HandRank.Flush + 2], x)) return "C";
						if (namesHas(RNI[HandRank.Flush + 3], x)) return "S";
						return null;
					})
					.filter(x => x !== null)
			: null;
		// Flushes
		if (
			(flushAppearances && flushAppearances.length > 0) ||
			(callIndex >= RNI[HandRank.Flush] && callIndex <= RNI[HandRank.FlushMax])
		) {
			if (flushAppearances && flushAppearances.length === 2) {
				// double flush case
				// double flushes are asked like this: 2 flush 4 flush
				const suit1 = flushAppearances[0];
				const suit2 = flushAppearances[1];
				if (!suit1 || !suit2) return null;

				const high1 = symbolToValue(newSplit[0]);
				const high2 = symbolToValue(newSplit[2]);
				if (invalidNumber(high1) || invalidNumber(high2)) return null;

				return {
					high: [
						{ value: high1, suit: suit1 },
						{ value: high2, suit: suit2 },
					],
					call: HandRank.DoubleFlush,
				};
			}

			const index = callIndex - RNI[HandRank.Flush];
			if (index < 0 || index > 3) return null;
			const suit = suits[index];
			return {
				high: { value: high, suit },
				call: HandRank.Flush,
			};
		}
		// Straight Flushes
		if (
			callIndex >= RNI[HandRank.StraightFlush] &&
			callIndex <= RNI[HandRank.StraightFlushMax]
		) {
			const index = callIndex - RNI[HandRank.StraightFlush];
			if (index < 0 || index > 3) return null;
			const suit = suits[index];
			return {
				high: { value: high, suit },
				call: HandRank.StraightFlush,
			};
		}
		return {
			high: { value: high, suit: null },
			call: RNIKeys.find(key => RNI[key] === callIndex),
		};
	} catch {
		return null;
	}
}

function symbolToValue(textGiven: string): ExtValue | null {
	const text = textGiven.toLowerCase().trim();
	const lookup = symbolToValueObj[text];
	if (lookup) return lookup;
	const value = parseInt(text);
	if (invalidNumber(value)) return null;
	if (value < 1 || value > 15) return null;
	return value as ExtValue;
}

// make every word in a string start with a capital
function capitalize(text: string) {
	return text
		.split(" ")
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
function rankToName(call: HandRank) {
	return capitalize(names[RNI[call]][0]);
}
// will return whether arr1 is higher than arr2
// "higher" means that the max of arr1 is greater than the max of arr2
// if the maxes are equal, the second highest values are compared, and so on
// if all values are equal, the function will return false
function isHigherArray(arr1: number[], arr2: number[]) {
	arr1.sort((a, b) => b - a);
	arr2.sort((a, b) => b - a);
	for (let i = 0; i < arr1.length; i++) {
		if (arr1[i] > arr2[i]) return true;
		if (arr1[i] < arr2[i]) return false;
	}
	return false;
}
function isLowerArray(arr1: number[], arr2: number[]) {
	arr1.sort((a, b) => a - b);
	arr2.sort((a, b) => a - b);
	for (let i = 0; i < arr1.length; i++) {
		if (arr1[i] < arr2[i]) return true;
		if (arr1[i] > arr2[i]) return false;
	}
	return false;
}

/**
 * returns whether call1 is a higher call than call2
 * */
export function isHigher(call1: Call, call2: Call) {
	if (call1.call > call2.call) return true;
	if (call1.call < call2.call) return false;
	if (
		call1.call === HandRank.DoublePair ||
		call1.call === HandRank.DoubleTriple ||
		call1.call === HandRank.TriplePair
	) {
		const arr1 = call1.high;
		const arr2 = call2.high as typeof call1.high;
		return isHigherArray(arr1, arr2);
	}
	if (call1.call === HandRank.FullHouse) {
		if (call1.high[0] > call2.high[0]) return true;
		if (call1.high[0] < call2.high[0]) return false;
		return call1.high[1] > call2.high[1];
	}
	if (call1.call === HandRank.DoubleFlush) {
		const arr1 = call1.high.map(card => card.value);
		const arr2 = (call2.high as typeof call1.high).map(card => card.value);
		return isLowerArray(arr1, arr2);
	}
	const call1_high = (call1.high as ExtCard).value;
	const call2_high = (call2.high as ExtCard).value;
	if (call1.call !== HandRank.Flush) return call1_high > call2_high;
	return call1_high < call2_high;
}

export function formatCall(call: Call) {
	if (!call || call.call == null) return "Unknown Call";

	if (call.call === HandRank.StraightFlush && call.high.value === 14) {
		switch (call.high.suit) {
			case "H":
				return `Royal Flush${emoji.hearts}`;
			case "D":
				return `Royal Flush${emoji.diamonds}`;
			case "C":
				return `Royal Flush${emoji.clubs}`;
			case "S":
				return `Royal Flush${emoji.spades}`;
			default:
				return "Unknown Call";
		}
	}
	if (call.call === HandRank.DoublePair) {
		return `${valueToSymbol(call.high[0])} Pair ${valueToSymbol(
			call.high[1]
		)} Pair`;
	}
	if (call.call === HandRank.FullHouse) {
		return `${valueToSymbol(call.high[0])} Triple ${valueToSymbol(
			call.high[1]
		)} Pair`;
	}
	if (call.call === HandRank.TriplePair) {
		return `${valueToSymbol(call.high[0])} Pair ${valueToSymbol(
			call.high[1]
		)} Pair ${valueToSymbol(call.high[2])} Pair`;
	}
	if (call.call === HandRank.DoubleTriple) {
		return `${valueToSymbol(call.high[0])} Triple ${valueToSymbol(
			call.high[1]
		)} Triple`;
	}
	if (call.call === HandRank.Flush) {
		return `${valueToSymbol(call.high.value)} Flush${suitToBasicEmoji(
			call.high.suit
		)}`;
	}
	if (call.call === HandRank.StraightFlush) {
		return `${valueToSymbol(call.high.value)} Straight Flush${suitToBasicEmoji(
			call.high.suit
		)}`;
	}
	if (call.call === HandRank.DoubleFlush) {
		const high = call.high as [ExtCard, ExtCard];
		return `${valueToSymbol(high[0].value)} Flush${suitToBasicEmoji(
			high[0].suit
		)} ${valueToSymbol(high[1].value)} Flush${suitToBasicEmoji(high[1].suit)}`;
	}

	return `${valueToSymbol((call.high as ExtCard).value)} ${rankToName(
		call.call
	)}`;
}

function insurancesInDeck(deck: readonly ExtCard[]): number {
	return countInArray(deck, card => card.value === 15);
}

function jokersInDeck(deck: readonly ExtCard[]): number {
	return countInArray(deck, card => card.value === 1);
}

export function callInDeck(
	call: Call,
	deck: readonly ExtCard[],
	gInsurances?: number,
	gJokers?: number
) {
	if (call.call === HandRank.High)
		return deck.some(card => card.value === call.high.value);
	if (call.call === HandRank.Pair)
		return countInArray(deck, card => card.value === call.high.value) >= 2;
	if (call.call === HandRank.DoublePair)
		return (
			countInArray(deck, card => card.value === call.high[0]) >= 2 &&
			countInArray(deck, card => card.value === call.high[1]) >= 2
		);
	if (call.call === HandRank.TriplePair)
		return (
			countInArray(deck, card => card.value === call.high[0]) >= 2 &&
			countInArray(deck, card => card.value === call.high[1]) >= 2 &&
			countInArray(deck, card => card.value === call.high[2]) >= 2
		);
	if (call.call === HandRank.Triple)
		return countInArray(deck, card => card.value === call.high.value) >= 3;
	if (call.call === HandRank.Straight) {
		const straightCards = straightCardsTable[call.high.value];
		return straightCards.every(value =>
			deck.some(card => card.value === value)
		);
	}
	if (call.call === HandRank.FullHouse)
		return (
			countInArray(deck, card => card.value === call.high[0]) >= 3 &&
			countInArray(deck, card => card.value === call.high[1]) >= 2
		);
	if (call.call === HandRank.DoubleTriple)
		return (
			countInArray(deck, card => card.value === call.high[0]) >= 3 &&
			countInArray(deck, card => card.value === call.high[1]) >= 3
		);
	if (call.call === HandRank.Quad)
		return countInArray(deck, card => card.value === call.high.value) >= 4;
	if (call.call === HandRank.Flush) {
		if (
			!deck.some(
				card =>
					(card.suit === call.high.suit || card.suit === "i") &&
					card.value === call.high.value
			)
		)
			return false;

		return (
			countInArray(
				deck,
				card =>
					(card.suit === call.high.suit || card.value === 1) &&
					card.value < call.high.value
			) >= 4
		);
	}
	if (call.call === HandRank.DoubleFlush) {
		const flushCall = call as DoubleFlushCall;
		const insurances = gInsurances ?? insurancesInDeck(deck);
		const [flush1, flush2] = flushCall.high;

		if (
			!deck.some(
				card =>
					(card.suit === flush1.suit || card.suit === "i") &&
					card.value === flush1.value
			) ||
			!deck.some(
				card =>
					(card.suit === flush2.suit || card.suit === "i") &&
					card.value === flush2.value
			)
		)
			return false;

		if (flush1.value === 15 && flush2.value === 15) {
			if (insurances < 2) return false; // need 2 insurances

			return flushCall.high.every(card => {
				return (
					countInArray(
						deck,
						c => c.suit === card.suit && c.value < card.value
					) >= 3
				);
			});
		}

		const jokerLength = gJokers ?? jokersInDeck(deck);
		let jokersUsed = 0;
		return flushCall.high.every(card => {
			const length = countInArray(
				deck,
				c => (c.suit === card.suit || c.suit === "i") && c.value <= card.value
			);

			if (length < 4) {
				jokersUsed += 4 - length;
				if (jokersUsed > jokerLength) return false;
			}

			return true;
		});
	}
	if (call.call === HandRank.StraightFlush) {
		const straightCards = straightCardsTable[call.high.value];
		return straightCards.every(value =>
			deck.some(card => card.value === value && card.suit === call.high.suit)
		);
	}
}

const straightCardsTable = {
	15: [15, 14, 13, 12, 11],
	14: [14, 13, 12, 11, 10],
	13: [13, 12, 11, 10, 9],
	12: [12, 11, 10, 9, 8],
	11: [11, 10, 9, 8, 7],
	10: [10, 9, 8, 7, 6],
	9: [9, 8, 7, 6, 5],
	8: [8, 7, 6, 5, 4],
	7: [7, 6, 5, 4, 3],
	6: [6, 5, 4, 3, 2],
	5: [5, 4, 3, 2, 14],
	4: [4, 3, 2, 14, 13],
	3: [3, 2, 14, 13, 12],
	2: [2, 14, 13, 12, 11],
	1: [1, 14, 13, 12, 11],
} satisfies Record<
	ExtValue,
	readonly [ExtValue, ExtValue, ExtValue, ExtValue, ExtValue]
>;

// Object.groupBy turns [1, 2, 2, 3, 3, 3, 4, 4] -> {1: [1], 2: [2, 2], 3: [3, 3, 3], 4: [4, 4]}

export async function highestCallInDeck(
	deck: readonly ExtCard[],
	nonStandard: boolean,
	insuranceCount: number
): Promise<Call> {
	const groupsObj = Object.groupBy(deck, card => card.value);
	const groups = Object.values(groupsObj);
	// Straight Flush
	if (deck.length >= 5) {
		const startingValue: ExtValue = insuranceCount === 1 ? 15 : 14;
		for (let value = startingValue; value >= 1; value--) {
			for (const suit of suits) {
				const straight = straightCardsTable[value as ExtValue];
				if (
					straight.every(value =>
						groupsObj[value]?.some(card => card.suit === suit)
					)
				) {
					return {
						high: { value: value as ExtValue, suit },
						call: HandRank.StraightFlush,
					};
				}
			}
		}
	}

	// Quad
	if (deck.length >= 4) {
		const quad = groups.findLast(group => group.length >= 4);
		if (quad) {
			return {
				high: { value: quad[0].value, suit: null },
				call: HandRank.Quad,
			};
		}
	}

	const triples = groups.filter(group => group.length >= 3);
	const pairs = groups.filter(group => group.length >= 2);

	// Double Triple
	if (nonStandard && triples.length >= 2) {
		const high = triples.slice(-2).map(group => group[0].value);
		return {
			high: [high[0], high[1]],
			call: HandRank.DoubleTriple,
		};
	}

	// Full House
	if (triples.length >= 1 && pairs.length >= 1) {
		const tripleVal = triples.at(-1)[0].value;
		let pairVal = pairs.at(-1)[0].value;
		let hasFullHouse = true;
		if (tripleVal === pairVal) {
			if (pairs.length >= 2) {
				pairVal = pairs.at(-2)[0].value;
			} else {
				hasFullHouse = false;
			}
		}
		if (hasFullHouse) {
			return {
				high: [tripleVal, pairVal],
				call: HandRank.FullHouse,
			};
		}
	}

	const insurances = insurancesInDeck(deck);
	const jokers = jokersInDeck(deck);

	// Double Flush
	// if there are 2 flushes of 4 or more cards, return those flushes
	// find the lowest two flushes in the deck
	if (nonStandard && deck.length >= 8) {
		for (let i = 2; i <= 15; i++) {
			for (const suit1 of suits) {
				for (let j = 2; j <= 15; j++) {
					for (const suit2 of suits) {
						if (suit1 === suit2) continue;
						const dfCall: DoubleFlushCall = {
							high: [
								{
									value: i as ExtValue,
									suit: suit1,
								},
								{
									value: j as ExtValue,
									suit: suit2,
								},
							],
							call: <const>HandRank.DoubleFlush,
						};
						if (callInDeck(dfCall, deck, insurances, jokers)) return dfCall;
					}
				}
			}
		}
	}

	if (deck.length >= 5) {
		for (let i = 6; i <= 15; i++) {
			for (const suit of suits) {
				const call_flush = {
					call: <const>HandRank.Flush,
					high: { value: i as ExtValue, suit },
				};
				if (callInDeck(call_flush, deck, insurances, jokers)) {
					return call_flush;
				}
			}
		}

		// Straight
		for (let i = 15; i >= 1; i--) {
			const straight = straightCardsTable[i as ExtValue];
			if (straight.every(value => groupsObj[value])) {
				return {
					high: { value: i as ExtValue, suit: null },
					call: HandRank.Straight,
				};
			}
		}
	}

	// Triple
	if (triples.length >= 1) {
		return {
			high: { value: triples.at(-1)[0].value, suit: null },
			call: HandRank.Triple,
		};
	}

	// Triple Pair
	if (nonStandard && pairs.length >= 3) {
		const high = pairs.slice(-3).map(group => group[0].value);
		return {
			high: [high[0], high[1], high[2]],
			call: HandRank.TriplePair,
		};
	}

	// Double Pair
	if (pairs.length >= 2) {
		const high = pairs.slice(-2).map(group => group[0].value);
		return {
			high: [high[0], high[1]],
			call: HandRank.DoublePair,
		};
	}

	// Pair
	if (pairs.length >= 1) {
		return {
			high: { value: pairs.at(-1)[0].value, suit: null },
			call: HandRank.Pair,
		};
	}

	// High
	const highValue = groups.at(-1)[0].value;
	return { high: { value: highValue, suit: null }, call: HandRank.High };
}
