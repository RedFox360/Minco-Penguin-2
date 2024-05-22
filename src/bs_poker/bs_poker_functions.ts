import { MessageCollector } from "discord.js";
import {
	type Suit,
	type Value,
	type Deck,
	HandRank,
	type Call,
	names,
	Card,
	RNI,
	RNIKeys,
	emoji,
	FlushCall,
} from "./bs_poker_types.js";

function suitToEmoji(suit: string) {
	switch (suit) {
		case "H":
			return emoji.hearts;
		case "D":
			return emoji.diamonds;
		case "C":
			return emoji.clubs;
		case "S":
			return emoji.spades;
		default:
			return "";
	}
}

function valueToSymbol(value: number, short = false) {
	if (value == null) return null;
	switch (value) {
		case 0:
			return short ? ":black_joker:" : "Joker";
		case 11:
			return short ? "J" : "Jack";
		case 12:
			return short ? "Q" : "Queen";
		case 13:
			return short ? "K" : "King";
		case 14:
			return short ? "A" : "Ace";
		case 15:
			return short ? ":information_source:" : "Insurance";
		default:
			return value.toString();
	}
}

function deckToStringArray(deck: Deck, short = false) {
	return deck.map(card => {
		return `${valueToSymbol(card.value, short)}${suitToEmoji(card.suit)}`;
	});
}

export function formatDeck(deck: Deck, short = false) {
	return deckToStringArray(deck, short).join("  ");
}

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

const royalFlushes = [
	[
		"hearts royal flush",
		"royal flush hearts",
		"royal hearts flush",
		"rfh",
		"rhf",
		"hrf",
	],
	[
		"diamonds royal flush",
		"royal flush diamonds",
		"royal diamonds flush",
		"rfd",
		"rdf",
		"drf",
	],
	[
		"clubs royal flush",
		"royal flush clubs",
		"royal clubs flush",
		"rfc",
		"rcf",
		"crf",
	],
	[
		"spades royal flush",
		"royal flush spades",
		"royal spades flush",
		"rfs",
		"rsf",
		"srf",
	],
];
function invalidNumber(x: any) {
	return Number.isNaN(x) || x == null;
}

export function parseCall(call: string): Call | null {
	try {
		call = call.toLowerCase().trim();
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
		const tripleIndex = split.findIndex(x =>
			names[RNI[HandRank.Triple]].includes(x)
		);
		const pairIndex = split.findIndex(x =>
			names[RNI[HandRank.Pair]].includes(x)
		);
		if (tripleIndex !== -1 && pairIndex !== -1) {
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
					.map((x): Suit => {
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

			let suit: Suit;
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
					suit = "n";
					break;
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
			let suit: Suit;
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
					suit = "n";
					break;
			}
			return {
				high: { value: high, suit },
				call: HandRank.StraightFlush,
			};
		}
		return {
			high: { value: high, suit: "n" },
			call: RNIKeys.find(key => RNI[key] === callIndex),
		};
	} catch (e) {
		return null;
	}
}

// convert text to value, e.g. "2" -> 2, "Joker" -> 0, "K" or "King" -> 13
function symbolToValue(textGiven: string): Value | null {
	const text = textGiven.toLowerCase();
	if (text === "joker" || text === "x") return 0;
	if (text === "insurance" || text === "i") return 15;
	if (text === "k" || text === "king") return 13;
	if (text === "q" || text === "queen") return 12;
	if (text === "j" || text === "jack") return 11;
	if (text === "a" || text === "ace") return 14;
	const value = parseInt(text);
	if (value < 0 || value === 1 || value > 15) return null;
	if (Number.isNaN(value)) return null;
	if (<Value>value === undefined) return null;
	return value as Value;
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

function isHigherArray(arr1: number[], arr2: number[]) {
	for (let i = arr1.length - 1; i >= 0; i--) {
		if (arr1[i] > arr2[i]) return true;
		if (arr1[i] < arr2[i]) return false;
	}
	return false;
}

function isLowerArray(arr1: number[], arr2: number[]) {
	if (arr1.join(" ") === arr2.join(" ")) return false;
	return !isHigherArray(arr1, arr2);
}

// returns whether call1 is a higher call than call2
export function isHigher(call1: Call, call2: Call) {
	const call_call1 = call1.call;
	const call_call2 = call2.call;
	if (call_call1 > call_call2) return true;
	if (call_call1 < call_call2) return false;
	if (
		call_call1 === HandRank.DoublePair ||
		call_call1 === HandRank.FullHouse ||
		call_call1 === HandRank.DoubleTriple ||
		call_call1 === HandRank.TriplePair
	) {
		const arr1 = (call1.high as Value[]).sort((a, b) => a - b);
		const arr2 = (call2.high as Value[]).sort((a, b) => a - b);
		return isHigherArray(arr1, arr2);
	}
	if (call_call1 === HandRank.DoubleFlush) {
		const arr1 = (call1.high as [Card, Card])
			.map(card => card.value)
			.sort((a, b) => a - b);
		const arr2 = (call2.high as [Card, Card])
			.map(card => card.value)
			.sort((a, b) => a - b);
		return isLowerArray(arr1, arr2);
	}
	const call1_high = (call1.high as Card).value;
	const call2_high = (call2.high as Card).value;
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
				return "Royal Flush (Unknown Suit)";
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
		return `${valueToSymbol(call.high.value)} Flush${suitToEmoji(
			call.high.suit
		)}`;
	}
	if (call.call === HandRank.StraightFlush) {
		return `${valueToSymbol(call.high.value)} Straight Flush${suitToEmoji(
			call.high.suit
		)}`;
	}
	if (call.call === HandRank.DoubleFlush) {
		return `${valueToSymbol(
			(call.high as [Card, Card])[0].value
		)} Flush${suitToEmoji((call.high as [Card, Card])[0].suit)} ${valueToSymbol(
			(call.high as [Card, Card])[1].value
		)} Flush${suitToEmoji((call.high as [Card, Card])[1].suit)}`;
	}

	return `${valueToSymbol((call.high as Card).value)} ${callNumberToName(
		call.call
	)}`;
}

export function callInDeck(call: Call, deck: Deck) {
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
		if (call.high.value === 15) {
			return (
				deck.some(card => card.value === 15) &&
				deck.filter(card => card.suit === call.high.suit || card.suit === "j")
					.length >= 4
			);
		}
		return (
			deck.filter(
				card =>
					(card.suit === call.high.suit || card.suit === "j") &&
					card.value <= call.high.value
			).length >= 5
		);
	}
	if (call.call === HandRank.DoubleFlush) {
		const flushCall = call as FlushCall;
		const insurances = deck.filter(card => card.value === 15).length;
		const [flush1, flush2] = flushCall.high;
		if (flush1.value === 15 && flush2.value === 15) {
			if (insurances < 2) return false; // need 2 insurances
			return flushCall.high.every(card => {
				return (
					deck.filter(c => c.suit === card.suit && c.value <= card.value)
						.length >= 4
				);
			});
		}

		const jokers = deck.filter(card => card.value === 0).length;
		if (jokers >= 2) {
			return flushCall.high.every(card => {
				return (
					deck.filter(
						c =>
							(c.suit === card.suit || c.suit === "i") && c.value <= card.value
					).length >= 3
				);
			});
		}
		if (jokers === 1) {
			const countsForEachFlush = flushCall.high.map(
				card =>
					deck.filter(
						c =>
							(c.suit === card.suit || c.suit === "i") && c.value <= card.value
					).length
			);
			const count1 = countsForEachFlush[0];
			const count2 = countsForEachFlush[1];
			return (count1 >= 4 && count2 >= 3) || (count1 >= 3 && count2 >= 4);
		}
		if (jokers === 0) {
			return flushCall.high.every(card => {
				return (
					deck.filter(
						c =>
							(c.suit === card.suit || c.suit === "i") && c.value <= card.value
					).length >= 4
				);
			});
		}
		return false;
	}
	if (call.call === HandRank.StraightFlush) {
		const straightCards = straightHighToCards(call.high.value);
		return straightCards.every(value =>
			deck.some(
				card =>
					card.value === value &&
					card.suit === (value === 15 ? "i" : call.high.suit)
			)
		);
	}
}

// create a function to convert the high card of a straight to a list of 5 cards for the straight
// e.g. if the top value is 14, it should return 14, 13, 12, 11, 10
// if the top value is 2, it will return 2, 14, 13, 12, 11 (wrap-around)
function straightHighToCards(high: Value): Value[] {
	if (high === 15) return [15, 14, 13, 12, 11];
	if (high === 0) return [0, 14, 13, 12, 11];
	const cards: Value[] = [];
	for (let i = 0; i < 5; i++) {
		cards.push(<Value>(((high - 1 - i + 13) % 13 || 13) + 1));
	}
	return cards;
}
