import { AnyCard, emoji, newEmoji, newEmojiSuits } from "./basic_card_types.js";
import { ExtValue } from "./bs_poker/bs_poker_types.js";

export function suitToBasicEmoji(suit: string) {
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

export function valueToSymbol(value: number, short = false) {
	if (value == null) return null;
	switch (value) {
		case 1:
			return short ? emoji.joker : "Joker";
		case 11:
			return short ? "J" : "Jack";
		case 12:
			return short ? "Q" : "Queen";
		case 13:
			return short ? "K" : "King";
		case 14:
			return short ? "A" : "Ace";
		case 15:
			return short ? emoji.insurance : "Insurance";
		default:
			return value.toString();
	}
}

export function emojiFromValue(value: ExtValue) {
	if (value < 2 || value > 14) return null;
	return newEmoji[value - 2];
}

export function cardToEmoji(card: AnyCard | null): [string, string] | null {
	if (card === null) {
		return [newEmojiSuits.blankTop, newEmojiSuits.blankBottom];
	}
	if (card.value === 1) {
		if (card.suit === "bj") return [newEmojiSuits.joker, newEmojiSuits.black];
		if (card.suit === "rj") return [newEmojiSuits.joker, newEmojiSuits.red];
		return [newEmojiSuits.joker, newEmojiSuits.blankBottom];
	}
	if (card.value === 15)
		return [newEmojiSuits.insurance, newEmojiSuits.blankBottom];

	const cardEmojis = emojiFromValue(card.value);
	if (!cardEmojis) return null;
	if (card.suit === "H") return [cardEmojis[1], newEmojiSuits.hearts];
	if (card.suit === "D") return [cardEmojis[1], newEmojiSuits.diamonds];
	if (card.suit === "C") return [cardEmojis[0], newEmojiSuits.clubs];
	if (card.suit === "S") return [cardEmojis[0], newEmojiSuits.spades];
	return null;
}

export function formatDeckLines(deck: AnyCard[]) {
	const line1: string[] = [];
	const line2: string[] = [];
	for (const card of deck) {
		const cardEmojis = cardToEmoji(card);
		line1.push(cardEmojis[0]);
		line2.push(cardEmojis[1]);
	}
	return [line1, line2];
}

export function formatDeck(deck: AnyCard[]) {
	const formatted = formatDeckLines(deck);
	return `${formatted[0].join(" ")}\n${formatted[1].join(" ")}`;
}

export function formatCardSideways(card: AnyCard, short = false) {
	if (card.value === 1 && card.suit === "bj")
		return short ? "BX" : "Black Joker";
	if (card.value === 1 && card.suit === "rj") return short ? "RX" : "Red Joker";
	return `${valueToSymbol(card.value, short)}${suitToBasicEmoji(card.suit)}`;
}

export function deckToStringArray(deck: AnyCard[], short = false) {
	return deck.map(card => formatCardSideways(card, short));
}

export function formatDeckSideways(deck: AnyCard[], short = false) {
	return deckToStringArray(deck, short).join("  ");
}

const basicDeck = [
	{ suit: "H", value: 2 },
	{ suit: "H", value: 3 },
	{ suit: "H", value: 4 },
	{ suit: "H", value: 5 },
	{ suit: "H", value: 6 },
	{ suit: "H", value: 7 },
	{ suit: "H", value: 8 },
	{ suit: "H", value: 9 },
	{ suit: "H", value: 10 },
	{ suit: "H", value: 11 },
	{ suit: "H", value: 12 },
	{ suit: "H", value: 13 },
	{ suit: "H", value: 14 },
	{ suit: "D", value: 2 },
	{ suit: "D", value: 3 },
	{ suit: "D", value: 4 },
	{ suit: "D", value: 5 },
	{ suit: "D", value: 6 },
	{ suit: "D", value: 7 },
	{ suit: "D", value: 8 },
	{ suit: "D", value: 9 },
	{ suit: "D", value: 10 },
	{ suit: "D", value: 11 },
	{ suit: "D", value: 12 },
	{ suit: "D", value: 13 },
	{ suit: "D", value: 14 },
	{ suit: "C", value: 2 },
	{ suit: "C", value: 3 },
	{ suit: "C", value: 4 },
	{ suit: "C", value: 5 },
	{ suit: "C", value: 6 },
	{ suit: "C", value: 7 },
	{ suit: "C", value: 8 },
	{ suit: "C", value: 9 },
	{ suit: "C", value: 10 },
	{ suit: "C", value: 11 },
	{ suit: "C", value: 12 },
	{ suit: "C", value: 13 },
	{ suit: "C", value: 14 },
	{ suit: "S", value: 2 },
	{ suit: "S", value: 3 },
	{ suit: "S", value: 4 },
	{ suit: "S", value: 5 },
	{ suit: "S", value: 6 },
	{ suit: "S", value: 7 },
	{ suit: "S", value: 8 },
	{ suit: "S", value: 9 },
	{ suit: "S", value: 10 },
	{ suit: "S", value: 11 },
	{ suit: "S", value: 12 },
	{ suit: "S", value: 13 },
	{ suit: "S", value: 14 },
] as const;

export function createBasicDeck() {
	return basicDeck.slice();
}

// array will be modified in place and spliced elements will be returned
export function spliceRandom<T>(arr: T[], count = 1): T[] {
	const spliced: T[] = [];
	for (let i = 0; i < count; i++) {
		const index = Math.floor(Math.random() * arr.length);
		spliced.push(arr.splice(index, 1)[0]);
	}
	return spliced;
}
