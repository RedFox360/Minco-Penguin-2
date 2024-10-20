import { Snowflake } from "discord.js";
import { JICard } from "../../cards/basic_card_types";
import Player from "../../cards/Player";

export default class FishPlayer extends Player<JICard> {
	public hand: JICard[] = [];
	public cardsEntitled = 6;

	public constructor(id: Snowflake, public readonly username: string) {
		super(id);
	}
}
