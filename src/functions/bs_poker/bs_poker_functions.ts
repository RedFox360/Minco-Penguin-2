import { MessageCollector } from "discord.js";
import {
	type ExtSuit,
	type ExtValue,
	HandRank,
	type Call,
	names,
	type ExtCard,
	RNI,
	RNIKeys,
	DoubleFlushCall,
	royalFlushes,
} from "./bs_poker_types.js";
import { emoji, suits } from "../basic_card_types.js";
import { suitToBasicEmoji, valueToSymbol } from "../basic_card_functions.js";

export function median(x: number[]) {
	const sorted = x.sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0
		? sorted[mid]
		: (sorted[mid - 1] + sorted[mid]) / 2;
}

export function collectorEnd(collector: MessageCollector) {
	return new Promise<void>(resolve =>
		collector.on("end", () => {
			resolve();
		})
	);
}

export function invalidNumber(x: any) {
	return Number.isNaN(x) || x == null;
}

export function parseCall(givenCall: string): Call | null {
	try {
		const call = givenCall.toLowerCase().trim();
		const royalIndex = royalFlushes.findIndex(x => x.includes(call));
		if (royalIndex !== -1) {
			switch (royalIndex) {
				case 0:
					return {
						high: { value: 14, suit: "H" },
						call: HandRank.StraightFlush,
					};
				case 1:
					return {
						high: { value: 14, suit: "D" },
						call: HandRank.StraightFlush,
					};
				case 2:
					return {
						high: { value: 14, suit: "C" },
						call: HandRank.StraightFlush,
					};
				case 3:
					return {
						high: { value: 14, suit: "S" },
						call: HandRank.StraightFlush,
					};
			}
		}
		const split = call.split(" ");

		const pairAppearances = split.filter(x =>
			names[RNI[HandRank.Pair]].includes(x)
		).length;

		if (pairAppearances === 2) {
			// double pair case
			// double pairs are asked like this: 2 pair 4 pair
			const high1 = symbolToValue(split[0]);
			if (invalidNumber(high1)) return null;
			const high2 = symbolToValue(split[2]);
			if (invalidNumber(high2)) return null;
			return {
				high: [high1, high2],
				call: HandRank.DoublePair,
			};
		}

		if (pairAppearances === 3) {
			// triple pair case
			// triple pairs are asked like this: 2 pair 4 pair 6 pair
			const high1 = symbolToValue(split[0]);
			if (invalidNumber(high1)) return null;
			const high2 = symbolToValue(split[2]);
			if (invalidNumber(high2)) return null;
			const high3 = symbolToValue(split[4]);
			if (invalidNumber(high3)) return null;
			return {
				high: [high1, high2, high3],
				call: HandRank.TriplePair,
			};
		}

		const tripleAppearances = split.filter(x =>
			names[RNI[HandRank.Triple]].includes(x)
		).length;
		if (tripleAppearances === 2) {
			// double triple case
			// double triples are asked like this: 2 triple 4 triple
			const high1 = symbolToValue(split[0]);
			if (invalidNumber(high1)) return null;
			const high2 = symbolToValue(split[2]);
			if (invalidNumber(high2)) return null;
			return {
				high: [high1, high2],
				call: HandRank.DoubleTriple,
			};
		}

		// Full Houses
		if (pairAppearances === 1 && tripleAppearances === 1) {
			const tripleIndex = split.findIndex(x =>
				names[RNI[HandRank.Triple]].includes(x)
			);
			const pairIndex = split.findIndex(x =>
				names[RNI[HandRank.Pair]].includes(x)
			);
			const indices = tripleIndex < pairIndex ? [0, 2] : [2, 0];
			const high1 = symbolToValue(split[indices[0]]);
			if (invalidNumber(high1)) return null;
			const high2 = symbolToValue(split[indices[1]]);
			if (invalidNumber(high2)) return null;
			return {
				high: [high1, high2],
				call: HandRank.FullHouse,
			};
		}

		const high = symbolToValue(split[0]);
		if (high === null) return null;
		const callName = split.slice(1).join(" ");
		const callIndex = names.findIndex(name => name.includes(callName));

		const call1 = split.findIndex(x => symbolToValue(x) !== null);
		const call2 = split.findLastIndex(x => symbolToValue(x) !== null);
		const c1c2good = call1 !== -1 && call2 !== -1 && call1 !== call2;
		// Split the call into 4 sections
		// Example call: A flush hearts K flush clubs -> ["A", "flush hearts", "K", "flush clubs"]
		// the indexes of the A and K are given in call1 and call2
		const newSplit = c1c2good
			? [
					split
						.slice(0, call1 + 1)
						.join(" ")
						.trim(),
					split
						.slice(call1 + 1, call2)
						.join(" ")
						.trim(),
					split
						.slice(call2, call2 + 1)
						.join(" ")
						.trim(),
					split
						.slice(call2 + 1)
						.join(" ")
						.trim(),
			  ]
			: null;
		const has = (index: number, x: string) =>
			names[index].some(y => x.startsWith(y));

		const flushAppearances = newSplit
			? newSplit
					.map((x): ExtSuit => {
						if (has(RNI[HandRank.Flush], x)) return "H";
						if (has(RNI[HandRank.Flush + 1], x)) return "D";
						if (has(RNI[HandRank.Flush + 2], x)) return "C";
						if (has(RNI[HandRank.Flush + 3], x)) return "S";
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
				if (invalidNumber(high1)) return null;
				const high2 = symbolToValue(newSplit[2]);
				if (invalidNumber(high2)) return null;

				return {
					high: [
						{ value: high1, suit: suit1 },
						{ value: high2, suit: suit2 },
					],
					call: HandRank.DoubleFlush,
				};
			}

			let suit: ExtSuit;
			switch (callIndex - RNI[HandRank.Flush]) {
				case 0:
					suit = "H";
					break;
				case 1:
					suit = "D";
					break;
				case 2:
					suit = "C";
					break;
				case 3:
					suit = "S";
					break;
				default:
					return null;
			}
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
			let suit: ExtSuit;
			switch (callIndex - RNI[HandRank.StraightFlush]) {
				case 0:
					suit = "H";
					break;
				case 1:
					suit = "D";
					break;
				case 2:
					suit = "C";
					break;
				case 3:
					suit = "S";
					break;
				default:
					suit = null;
					break;
			}
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

// convert text to value, e.g. "2" -> 2, "Joker" -> 0, "K" or "King" -> 13
function symbolToValue(textGiven: string): ExtValue | null {
	const text = textGiven.toLowerCase().trim();
	if (text === "joker" || text === "x") return 1;
	if (text === "insurance" || text === "i") return 15;
	if (text === "k" || text === "king") return 13;
	if (text === "q" || text === "queen") return 12;
	if (text === "j" || text === "jack" || text === "knave") return 11;
	if (text === "a" || text === "ace") return 14;
	if (text === "deuce") return 2;
	const value = parseInt(text);
	if (value < 1 || value > 15) return null;
	if (invalidNumber(value)) return null;
	return value as ExtValue;
}

// make every word in a string start with a capital
function capitalize(text: string) {
	return text
		.split(" ")
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
function callNumberToName(call: HandRank) {
	return capitalize(names[RNI[call]][0]);
}

// returns whether call1 is a higher call than call2
export function isHigher(call1: Call, call2: Call) {
	const call_call1 = call1.call;
	const call_call2 = call2.call;
	if (call_call1 > call_call2) return true;
	if (call_call1 < call_call2) return false;
	if (
		call_call1 === HandRank.DoublePair ||
		call_call1 === HandRank.DoubleTriple ||
		call_call1 === HandRank.TriplePair
	) {
		const arr1 = (call1.high as ExtValue[]).sort((a, b) => a - b);
		const arr2 = (call2.high as ExtValue[]).sort((a, b) => a - b);
		return Math.max(...arr1) > Math.max(...arr2);
	}
	if (call_call1 === HandRank.FullHouse) {
		if (call1.high[0] > call2.high[0]) return true;
		if (call1.high[0] < call2.high[0]) return false;
		return call1.high[1] > call2.high[1];
	}
	if (call_call1 === HandRank.DoubleFlush) {
		const arr1 = (call1.high as [ExtCard, ExtCard])
			.map(card => card.value)
			.sort((a, b) => a - b);
		const arr2 = (call2.high as [ExtCard, ExtCard])
			.map(card => card.value)
			.sort((a, b) => a - b);
		return Math.min(...arr1) < Math.min(...arr2);
	}
	const call1_high = (call1.high as ExtCard).value;
	const call2_high = (call2.high as ExtCard).value;
	if (call_call1 !== HandRank.Flush) return call1_high > call2_high;
	return call1_high < call2_high;
}

export function formatCall(call: Call) {
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
		return `${valueToSymbol(
			(call.high as [ExtCard, ExtCard])[0].value
		)} Flush${suitToBasicEmoji(
			(call.high as [ExtCard, ExtCard])[0].suit
		)} ${valueToSymbol(
			(call.high as [ExtCard, ExtCard])[1].value
		)} Flush${suitToBasicEmoji((call.high as [ExtCard, ExtCard])[1].suit)}`;
	}

	return `${valueToSymbol((call.high as ExtCard).value)} ${callNumberToName(
		call.call
	)}`;
}

export function callInDeck(call: Call, deck: ExtCard[]) {
	if (call.call === HandRank.High)
		return deck.some(card => card.value === call.high.value);
	if (call.call === HandRank.Pair)
		return deck.filter(card => card.value === call.high.value).length >= 2;
	if (call.call === HandRank.DoublePair)
		return (
			deck.filter(card => card.value === call.high[0]).length >= 2 &&
			deck.filter(card => card.value === call.high[1]).length >= 2
		);
	if (call.call === HandRank.TriplePair)
		return (
			deck.filter(card => card.value === call.high[0]).length >= 2 &&
			deck.filter(card => card.value === call.high[1]).length >= 2 &&
			deck.filter(card => card.value === call.high[2]).length >= 2
		);
	if (call.call === HandRank.Triple)
		return deck.filter(card => card.value === call.high.value).length >= 3;
	if (call.call === HandRank.Straight) {
		const straightCards = straightHighToCards(call.high.value);
		return straightCards.every(value =>
			deck.some(card => card.value === value)
		);
	}
	if (call.call === HandRank.FullHouse)
		return (
			deck.filter(card => card.value === call.high[0]).length >= 3 &&
			deck.filter(card => card.value === call.high[1]).length >= 2
		);
	if (call.call === HandRank.DoubleTriple)
		return (
			deck.filter(card => card.value === call.high[0]).length >= 3 &&
			deck.filter(card => card.value === call.high[1]).length >= 3
		);
	if (call.call === HandRank.Quad)
		return deck.filter(card => card.value === call.high.value).length >= 4;
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
			deck.filter(
				card =>
					(card.suit === call.high.suit || card.value === 1) &&
					card.value < call.high.value
			).length >= 4
		);
	}
	if (call.call === HandRank.DoubleFlush) {
		const flushCall = call as DoubleFlushCall;
		const insurances = deck.filter(card => card.value === 15).length;
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
					deck.filter(c => c.suit === card.suit && c.value < card.value)
						.length >= 3
				);
			});
		}

		const jokerLength = deck.filter(card => card.value === 1).length;
		let jokersUsed = 0;
		return flushCall.high.every(card => {
			const length = deck.filter(
				c => (c.suit === card.suit || c.suit === "i") && c.value <= card.value
			).length;

			if (length < 4) {
				jokersUsed += 4 - length;
				if (jokersUsed > jokerLength) return false;
			}

			return true;
		});
	}
	if (call.call === HandRank.StraightFlush) {
		const straightCards = straightHighToCards(call.high.value);
		return straightCards.every(value =>
			deck.some(card => card.value === value && card.suit === call.high.suit)
		);
	}
}

// create a function to convert the high card of a straight to a list of 5 cards for the straight
// e.g. if the top value is 14, it should return 14, 13, 12, 11, 10
// if the top value is 2, it will return 2, 14, 13, 12, 11 (wrap-around)
function straightHighToCards(high: ExtValue): ExtValue[] {
	if (high === 15) return [15, 14, 13, 12, 11];
	if (high === 1) return [1, 14, 13, 12, 11];
	const cards: ExtValue[] = [];
	for (let i = 0; i < 5; i++) {
		cards.push(<ExtValue>(((high - 1 - i + 13) % 13 || 13) + 1));
	}
	return cards;
}

export async function highestCallInDeck(deck: ExtCard[]): Promise<Call> {
	// Straight Flush
	if (deck.length >= 5) {
		for (let value = 14; value >= 2; value--) {
			for (const suit of suits) {
				const straight = straightHighToCards(value as ExtValue);
				if (
					straight.every(value =>
						deck.some(card => card.value === value && card.suit === suit)
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
		for (let value = 15; value >= 1; value--) {
			if (deck.filter(card => card.value === value).length >= 4) {
				return {
					high: { value: value as ExtValue, suit: null },
					call: HandRank.Quad,
				};
			}
		}
	}

	// Double Triple
	if (deck.length >= 6) {
		for (let i = 15; i >= 1; i--) {
			if (deck.filter(card => card.value === i).length >= 3) {
				for (let j = i - 1; j >= 2; j--) {
					if (deck.filter(card => card.value === j).length >= 3) {
						return {
							high: [i as ExtValue, j as ExtValue],
							call: HandRank.DoubleTriple,
						};
					}
				}
			}
		}
	}

	// Full House
	if (deck.length >= 5) {
		for (let i = 15; i >= 1; i--) {
			if (deck.filter(card => card.value === i).length >= 3) {
				for (let j = 15; j >= 0; j--) {
					if (j === i) continue;
					if (deck.filter(card => card.value === j).length >= 2) {
						return {
							high: [i as ExtValue, j as ExtValue],
							call: HandRank.FullHouse,
						};
					}
				}
			}
		}
	}

	// Double Flush
	// if there are 2 flushes of 4 or more cards, return those flushes
	// find the lowest two flushes in teh deck
	if (deck.length >= 8) {
		for (let i = 2; i <= 15; i++) {
			for (const suit1 of suits) {
				for (let j = 2; j <= 15; j++) {
					if (j === i) continue;
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
							call: HandRank.DoubleFlush,
						};
						if (callInDeck(dfCall, deck)) return dfCall;
					}
				}
			}
		}
	}

	if (deck.length >= 5) {
		for (let i = 6; i <= 15; i++) {
			for (const suit of suits) {
				const call_flush = {
					call: HandRank.Flush,
					high: { value: i as ExtValue, suit },
				};
				if (callInDeck(call_flush, deck)) {
					return call_flush;
				}
			}
		}

		// Straight
		for (let i = 15; i >= 1; i--) {
			const straight = straightHighToCards(i as ExtValue);
			if (straight.every(value => deck.some(card => card.value === value))) {
				return {
					high: { value: i as ExtValue, suit: null },
					call: HandRank.Straight,
				};
			}
		}
	}

	// Triple
	if (deck.length >= 3) {
		for (let i = 15; i >= 1; i--) {
			if (deck.filter(card => card.value === i).length >= 3) {
				return {
					high: { value: i as ExtValue, suit: null },
					call: HandRank.Triple,
				};
			}
		}
	}

	// Triple Pair
	if (deck.length >= 6) {
		for (let i = 15; i >= 1; i--) {
			if (deck.filter(card => card.value === i).length >= 2) {
				for (let j = i - 1; j >= 1; j--) {
					if (j === i) continue;
					if (deck.filter(card => card.value === j).length >= 2) {
						for (let k = j - 1; k >= 1; k--) {
							if (k === j) continue;
							if (deck.filter(card => card.value === k).length >= 2) {
								return {
									high: [i as ExtValue, j as ExtValue, k as ExtValue],
									call: HandRank.TriplePair,
								};
							}
						}
					}
				}
			}
		}
	}

	// Double Pair
	if (deck.length >= 4) {
		for (let i = 15; i >= 1; i--) {
			if (deck.filter(card => card.value === i).length >= 2) {
				for (let j = i - 1; j >= 1; j--) {
					if (j === i) continue;
					if (deck.filter(card => card.value === j).length >= 2) {
						return {
							high: [i as ExtValue, j as ExtValue],
							call: HandRank.DoublePair,
						};
					}
				}
			}
		}
	}

	// Pair
	for (let i = 15; i >= 1; i--) {
		if (deck.filter(card => card.value === i).length >= 2) {
			return {
				high: { value: i as ExtValue, suit: null },
				call: HandRank.Pair,
			};
		}
	}

	// High
	const high = deck.reduce((high, card) => {
		if (card.value > high.value) return card;
		return high;
	});
	return { high, call: HandRank.High };
}
