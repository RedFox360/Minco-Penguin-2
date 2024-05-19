import { Collection, Snowflake } from "discord.js";

export type Suit = "H" | "D" | "C" | "S" | "n";
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
	| { high: [Value, Value]; call: HandRank.DoublePair };

export type PlayerHands = Collection<Snowflake, Deck>;
