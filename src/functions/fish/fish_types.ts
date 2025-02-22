import { Collection, Snowflake } from "discord.js";
import { JICard, Suit } from "../cards/basic_card_types.js";

export const customIds = {
	call: "call_fish",
	callFishSelect: "half_suit_select_menu_fish",
	viewCards: "view_cards_fish",
	abortCall: "abort_call_fish",
	abortDJ: "abort_dj_fish",
	disjoint: "disjoint_fish",
	viewTable: "view_table_fish",
} as const;
export const customIdValues: string[] = Object.values(customIds);
export const gameLength = 3_600_000;
export const timeToMakeCall = 20_000;

export enum HalfSuit {
	HighHearts = "Hh",
	LowHearts = "Hl",
	HighDiamonds = "Dh",
	LowDiamonds = "Dl",
	HighClubs = "Ch",
	LowClubs = "Cl",
	HighSpades = "Sh",
	LowSpades = "Sl",
	EJI = "XX",
}

// high hearts: 9 through A of hearts
// low hearts 2 through 7 of hearts
// repeat for other suits
// eji: all 8s, the joker, and the insurance

function generateHigh(suit: Suit): JICard[] {
	const cards = [];
	for (let i = 9; i <= 14; i++) {
		cards.push({ suit, value: i });
	}
	return cards;
}

function generateLow(suit: Suit): JICard[] {
	const cards = [];
	for (let i = 2; i <= 7; i++) {
		cards.push({ suit, value: i });
	}
	return cards;
}

export const CardsPerHalfSuit: Record<HalfSuit, JICard[]> = Object.freeze({
	[HalfSuit.HighHearts]: generateHigh("H"),
	[HalfSuit.LowHearts]: generateLow("H"),
	[HalfSuit.HighDiamonds]: generateHigh("D"),
	[HalfSuit.LowDiamonds]: generateLow("D"),
	[HalfSuit.HighClubs]: generateHigh("C"),
	[HalfSuit.LowClubs]: generateLow("C"),
	[HalfSuit.HighSpades]: generateHigh("S"),
	[HalfSuit.LowSpades]: generateLow("S"),
	[HalfSuit.EJI]: [
		{ suit: "H", value: 8 },
		{ suit: "D", value: 8 },
		{ suit: "C", value: 8 },
		{ suit: "S", value: 8 },
		{ suit: "j", value: 1 },
		{ suit: "i", value: 15 },
	],
});

export function cardToHalfSuit(card: JICard): HalfSuit {
	if (card.value === 8 || card.value === 1 || card.value === 15)
		return HalfSuit.EJI;
	if (card.value > 8) {
		return (card.suit + "h") as HalfSuit;
	} else {
		return (card.suit + "l") as HalfSuit;
	}
}

export const SignificantCardPerHalfSuit: Record<HalfSuit, JICard> =
	Object.freeze({
		// high suits will be the ace of that suit, low suits are the 2 of that suit
		[HalfSuit.HighHearts]: { suit: "H", value: 14 },
		[HalfSuit.LowHearts]: { suit: "H", value: 2 },
		[HalfSuit.HighDiamonds]: { suit: "D", value: 14 },
		[HalfSuit.LowDiamonds]: { suit: "D", value: 2 },
		[HalfSuit.HighClubs]: { suit: "C", value: 14 },
		[HalfSuit.LowClubs]: { suit: "C", value: 2 },
		[HalfSuit.HighSpades]: { suit: "S", value: 14 },
		[HalfSuit.LowSpades]: { suit: "S", value: 2 },
		[HalfSuit.EJI]: { suit: "j", value: 1 },
	});

export interface HalfSuitCall {
	suit: HalfSuit;
	call: HalfSuitCallCollection;
}

export type HalfSuitCallCollection = Collection<Snowflake, JICard[]>;
export type FakeUser = {
	id: Snowflake;
	username: string;
};
