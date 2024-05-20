import { Collection, Snowflake } from "discord.js";

export type Suit = "H" | "D" | "C" | "S" | "j" | "i";
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

export type Deck = {
	suit: Suit;
	value: Value;
}[];

export enum HandRank {
	High = 0,
	Pair = 1,
	DoublePair = 2,
	Triple = 3,
	Straight = 4,
	Flush = 5,
	FlushHearts = 5,
	FlushDiamonds = 6,
	FlushClubs = 7,
	FlushSpades = 8,
	FullHouse = 9,
	Quad = 10,
	StraightFlush = 11,
	StraightFlushHearts = 11,
	StraightFlushDiamonds = 12,
	StraightFlushClubs = 13,
	StraightFlushSpades = 14,
}

export type Call =
	| {
			high: Value;
			call: HandRank;
	  }
	| { high: [Value, Value]; call: HandRank.DoublePair | HandRank.FullHouse };

export type PlayerHands = Collection<Snowflake, Deck>;

export const names = [
	["high", "high card", "h"],
	["pair", "double", "p", "d"],
	["double pair", "two pair", "dp", "tp"],
	["triple", "t"],
	["straight", "s", "high straight"],
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
	["full house", "house"],
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
