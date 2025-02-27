import { type JISuit, type ExtValue } from "../cards/basic_card_types.js";
import type Player from "./classes/Player.js";

export type ExtSuit = JISuit | "bj" | "rj" | null;
// Hearts, Diamonds, Clubs, Spades, Joker, Insurance, Black Joker, Red Joker, [No Suit/Unprovided]

// bj = black joker (take a common card)
// rj = red joker (cross bs-ing = -1 card)

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

export const names: readonly string[][] = [
	["high", "h", "haut"],
	["pair", "double", "p", "d", "paire", "drunk"],
	["triple", "t", "brelan", "hungover"],
	["high straight", "straight", "s", "suite"],
	[
		"flush hearts",
		"hearts flush",
		"high hearts flush",
		"high flush hearts",
		"fh",
		"hf",
		"couleur cœur",
	],
	[
		"flush diamonds",
		"diamonds flush",
		"high diamonds flush",
		"high flush diamonds",
		"fd",
		"df",
		"couleur carreau",
	],
	[
		"flush clubs",
		"clubs flush",
		"high clubs flush",
		"high flush clubs",
		"fc",
		"cf",
		"couleur trèfle",
	],
	[
		"flush spades",
		"spades flush",
		"high spades flush",
		"high flush spades",
		"fs",
		"sf",
		"couleur pique",
	],
	["quad", "q", "quadruple", "carré", "overdose"],
	[
		"straight flush hearts",
		"hearts straight flush",
		"high hearts straight flush",
		"high straight flush hearts",
		"sfh",
		"hsf",
		"quinte flush cœur",
	],
	[
		"straight flush diamonds",
		"diamonds straight flush",
		"high diamonds straight flush",
		"high straight flush diamonds",
		"sfd",
		"dsf",
		"quinte flush carreau",
	],
	[
		"straight flush clubs",
		"clubs straight flush",
		"high clubs straight flush",
		"high straight flush clubs",
		"sfc",
		"csf",
		"quinte flush trèfle",
	],
	[
		"straight flush spades",
		"spades straight flush",
		"high spades straight flush",
		"high straight flush spades",
		"sfs",
		"ssf",
		"quinte flush pique",
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
	],
	[
		"diamonds royal flush",
		"royal flush diamonds",
		"royal diamonds flush",
		"rfd",
		"rdf",
		"drf",
		"quinte flush royale de carreau",
	],
	[
		"clubs royal flush",
		"royal flush clubs",
		"royal clubs flush",
		"rfc",
		"rcf",
		"crf",
		"quinte flush royale de trèfle",
	],
	[
		"spades royal flush",
		"royal flush spades",
		"royal spades flush",
		"rfs",
		"rsf",
		"srf",
		"quinte flush royale de pique",
	],
];

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
