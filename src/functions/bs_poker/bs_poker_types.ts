import { type Snowflake } from "discord.js";
import { type Suit, type Value } from "../cards/basic_card_types.js";
import type Player from "./classes/Player.js";
import type PlayerCollection from "./classes/PlayerCollection.js";

export type ExtSuit = Suit | "j" | "i" | "bj" | "rj" | null;
// Hearts, Diamonds, Clubs, Spades, Joker, Insurance, Black Joker, Red Joker, [No Suit/Unprovided]

// bj = black joker (take a common card)
// rj = red joker (cross bs-ing = -1 card)

export type ExtValue =
	| 1 // joker
	| Value
	| 15; // insurance

export interface ExtCard {
	suit: ExtSuit;
	value: ExtValue;
}

export enum HandRank {
	High = 0,
	Pair = 1,
	DoublePair = 2,
	TriplePair = 3,
	Triple = 4,
	Straight = 5,
	Flush = 6,
	FlushMax = Flush + 3, // 9
	DoubleFlush = 10,
	FullHouse = 11,
	DoubleTriple = 12,
	Quad = 13,
	StraightFlush = 14,
	StraightFlushMax = StraightFlush + 3, // 17
}

// rank to name index
export const RNI = {
	[HandRank.High]: 0,
	[HandRank.Pair]: 1,
	[HandRank.Triple]: 2,
	[HandRank.Straight]: 3,
	[HandRank.Flush]: 4, // Hearts
	[HandRank.Flush + 1]: 5, // Diamonds
	[HandRank.Flush + 2]: 6, // Clubs
	[HandRank.FlushMax]: 7, // Spades
	[HandRank.Quad]: 8,
	[HandRank.StraightFlush]: 9, // Hearts
	[HandRank.StraightFlush + 1]: 10, // Diamonds
	[HandRank.StraightFlush + 2]: 11, // Clubs
	[HandRank.StraightFlushMax]: 12, // Spades
} as const;

export const RNIKeys = Object.keys(RNI).map(n => parseInt(n));

export type Call = Readonly<OneCall | TwoCall | ThreeCall | DoubleFlushCall>;

interface OneCall {
	high: ExtCard;
	call: Exclude<
		HandRank,
		| HandRank.DoublePair
		| HandRank.FullHouse
		| HandRank.DoubleTriple
		| HandRank.TriplePair
		| HandRank.DoubleFlush
	>;
}
interface TwoCall {
	high: [ExtValue, ExtValue];
	call: HandRank.DoublePair | HandRank.FullHouse | HandRank.DoubleTriple;
}
interface ThreeCall {
	high: [ExtValue, ExtValue, ExtValue];
	call: HandRank.TriplePair;
}
export interface DoubleFlushCall {
	high: [ExtCard, ExtCard];
	call: HandRank.DoubleFlush;
}

const callInvis = "\u200C";
const rankInvis = "\u2063";
export const names: readonly string[][] = [
	["high", "h", "haut", callInvis.repeat(1)],
	["pair", "double", "p", "d", "paire", "drunk", callInvis.repeat(2)],
	["triple", "t", "brelan", "hungover", callInvis.repeat(3)],
	["high straight", "straight", "s", "suite", callInvis.repeat(4)],
	[
		"flush hearts",
		"hearts flush",
		"high hearts flush",
		"high flush hearts",
		"fh",
		"hf",
		"couleur cœur",
		callInvis.repeat(5),
	],
	[
		"flush diamonds",
		"diamonds flush",
		"high diamonds flush",
		"high flush diamonds",
		"fd",
		"df",
		"couleur carreau",
		callInvis.repeat(6),
	],
	[
		"flush clubs",
		"clubs flush",
		"high clubs flush",
		"high flush clubs",
		"fc",
		"cf",
		"couleur trèfle",
		callInvis.repeat(7),
	],
	[
		"flush spades",
		"spades flush",
		"high spades flush",
		"high flush spades",
		"fs",
		"sf",
		"couleur pique",
		callInvis.repeat(8),
	],
	["quad", "q", "quadruple", "carré", "overdose", callInvis.repeat(9)],
	[
		"straight flush hearts",
		"hearts straight flush",
		"high hearts straight flush",
		"high straight flush hearts",
		"sfh",
		"hsf",
		"quinte flush cœur",
		callInvis.repeat(10),
	],
	[
		"straight flush diamonds",
		"diamonds straight flush",
		"high diamonds straight flush",
		"high straight flush diamonds",
		"sfd",
		"dsf",
		"quinte flush carreau",
		callInvis.repeat(11),
	],
	[
		"straight flush clubs",
		"clubs straight flush",
		"high clubs straight flush",
		"high straight flush clubs",
		"sfc",
		"csf",
		"quinte flush trèfle",
		callInvis.repeat(12),
	],
	[
		"straight flush spades",
		"spades straight flush",
		"high spades straight flush",
		"high straight flush spades",
		"sfs",
		"ssf",
		"quinte flush pique",
		callInvis.repeat(13),
	],
];

export interface PlayerCall {
	call: Call;
	player: Player;
}

export const royalFlushes = [
	[
		"hearts royal flush",
		"royal flush hearts",
		"royal hearts flush",
		"rfh",
		"rhf",
		"hrf",
		"quinte flush royale de cœur",
		callInvis.repeat(14),
	],
	[
		"diamonds royal flush",
		"royal flush diamonds",
		"royal diamonds flush",
		"rfd",
		"rdf",
		"drf",
		"quinte flush royale de carreau",
		callInvis.repeat(15),
	],
	[
		"clubs royal flush",
		"royal flush clubs",
		"royal clubs flush",
		"rfc",
		"rcf",
		"crf",
		"quinte flush royale de trèfle",
		callInvis.repeat(16),
	],
	[
		"spades royal flush",
		"royal flush spades",
		"royal spades flush",
		"rfs",
		"rsf",
		"srf",
		"quinte flush royale de pique",
		callInvis.repeat(17),
	],
];

function getSymbolToValueObj() {
	const obj: Record<string, ExtValue> = {
		joker: 1,
		x: 1,

		two: 2,
		deuce: 2,
		deux: 2,

		three: 3,
		trois: 3,

		four: 4,
		quatre: 4,

		five: 5,
		cinq: 5,

		six: 6,

		seven: 7,
		sept: 7,

		eight: 8,
		huit: 8,

		nine: 9,
		neuf: 9,

		ten: 10,
		t: 10,
		dix: 10,

		jack: 11,
		j: 11,
		knave: 11,
		valet: 11,

		queen: 12,
		q: 12,
		dame: 12,
		reine: 12,

		king: 13,
		k: 13,
		roi: 13,

		ace: 14,
		a: 14,
		as: 14,

		insurance: 15,
		i: 15,
		assurance: 15,
	};
	for (let i = 1; i <= 15; i++) {
		obj[rankInvis.repeat(i)] = i as ExtValue;
	}
	return obj;
}

export const symbolToValueObj = Object.freeze(getSymbolToValueObj());

export enum ClownState {
	NotClowned,
	Clowned,
	ClownedAndCalled,
}

export const customIds = {
	joinMidGame: "join_mid_game_bspoker",
	leaveMidGame: "leave_mid_game_bspoker",
	viewCards: "view_cards_bspoker",
	viewGameInfo: "view_game_info_bspoker",
	bs: "bs_bspoker",
	clown: "clown_bspoker",
};

export const customIdValues = Object.values(customIds);
