import { Collection, Snowflake } from "discord.js";

export type Suit = "H" | "D" | "C" | "S" | "j" | "i" | "n";
export type Value =
	| 0
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| 13
	| 14
	| 15;

export interface Card {
	suit: Suit;
	value: Value;
}

export type Deck = Card[];

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
	Quad = 12,
	DoubleTriple = 13,
	StraightFlush = 14,
	StraightFlushMax = StraightFlush + 3, // 17
}

export const RNI = {
	[HandRank.High]: 0,
	[HandRank.Pair]: 1,
	[HandRank.Triple]: 2,
	[HandRank.Straight]: 3,
	[HandRank.Flush]: 4,
	[HandRank.Flush + 1]: 5,
	[HandRank.Flush + 2]: 6,
	[HandRank.FlushMax]: 7,
	[HandRank.Quad]: 8,
	[HandRank.StraightFlush]: 9,
	[HandRank.StraightFlush + 1]: 10,
	[HandRank.StraightFlush + 2]: 11,
	[HandRank.StraightFlushMax]: 12,
};

export const RNIKeys = Object.keys(RNI).map(n => parseInt(n));

export type Call = OneCall | TwoCall | ThreeCall | FlushCall;

interface OneCall {
	high: Card;
	call: HandRank;
}
interface TwoCall {
	high: [Value, Value];
	call: HandRank.DoublePair | HandRank.FullHouse | HandRank.DoubleTriple;
}
interface ThreeCall {
	high: [Value, Value, Value];
	call: HandRank.TriplePair;
}
export interface FlushCall {
	high: [Card, Card];
	call: HandRank.DoubleFlush;
}

export type PlayerHands = Collection<Snowflake, Deck>;

export const names = [
	["high", "high card", "h"],
	["pair", "double", "p", "d"],
	["triple", "t"],
	["high straight", "straight", "s"],
	[
		"high flush:hearts:",
		"flush:hearts:",
		"flush hearts",
		"hearts flush",
		"high hearts flush",
		"high flush hearts",
		"fh",
		"hf",
	],
	[
		"high flush:diamonds:",
		"flush:diamonds:",
		"flush diamonds",
		"diamonds flush",
		"high diamonds flush",
		"high flush diamonds",
		"fd",
		"df",
	],
	[
		"high flush<:clubst:1241960807005425768>",
		"flush<:clubst:1241960807005425768>",
		"flush clubs",
		"clubs flush",
		"high clubs flush",
		"high flush clubs",
		"fc",
		"cf",
	],
	[
		"high flush<:spadest:1241960808305659975>",
		"flush<:spadest:1241960808305659975>",
		"flush spades",
		"spades flush",
		"high spades flush",
		"high flush spades",
		"fs",
		"sf",
	],
	["quad", "q"],
	[
		"high straight flush:hearts:",
		"straight flush:hearts:",
		"straight flush hearts",
		"hearts straight flush",
		"high hearts straight flush",
		"high straight flush hearts",
		"sfh",
		"hsf",
	],
	[
		"high straight flush:diamonds:",
		"straight flush:diamonds:",
		"straight flush diamonds",
		"diamonds straight flush",
		"high diamonds straight flush",
		"high straight flush diamonds",
		"sfd",
		"dsf",
	],
	[
		"high straight flush<:clubst:1241960807005425768>",
		"straight flush<:clubst:1241960807005425768>",
		"straight flush clubs",
		"clubs straight flush",
		"high clubs straight flush",
		"high straight flush clubs",
		"sfc",
		"csf",
	],
	[
		"high straight flush<:spadest:1241960808305659975>",
		"straight flush<:spadest:1241960808305659975>",
		"straight flush spades",
		"spades straight flush",
		"high spades straight flush",
		"high straight flush spades",
		"sfs",
		"ssf",
	],
];

export type PlayerCall = {
	call: Call;
	player: Snowflake;
};

export const emoji = {
	hearts: ":hearts:",
	diamonds: ":diamonds:",
	clubs: "<:clubst:1241960807005425768>",
	spades: "<:spadest:1241960808305659975>",
};

export const emojiRaw = {
	hearts: "❤️",
	diamonds: "♦️",
	clubs: "1241960807005425768",
	spades: "1241960808305659975",
};
