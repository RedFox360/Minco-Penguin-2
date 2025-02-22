import { type Snowflake } from "discord.js";
import { JICard } from "../../cards/basic_card_types.js";
import Player from "../../cards/Player.js";

export default class FishPlayer extends Player<JICard> {
	public hand: JICard[] = [];
	public cardsEntitled = 9;
	public disjoint: Snowflake[] = [];

	public get out() {
		return this.disjoint.length === 3 || this.hand.length === 0;
	}

	public constructor(
		id: Snowflake,
		public readonly username: string,
		public readonly team: 0 | 1
	) {
		super(id);
	}
	public formatHandLength() {
		if (this.hand.length === 1) return `${this.toString()}: 1 card`;
		return `${this.toString()}: ${this.hand.length} cards`;
	}
}
