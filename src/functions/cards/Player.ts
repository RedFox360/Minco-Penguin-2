import { type Snowflake, userMention } from "discord.js";
import { spliceRandom } from "../util.js";
import { formatDeck } from "../cards/basic_card_functions.js";
import { AnyCard } from "./basic_card_types.js";

export default abstract class Player<T extends AnyCard> {
	public abstract hand: T[];
	public abstract cardsEntitled: number;

	public constructor(public readonly id: Snowflake) {}

	public dealCards(deck: T[]) {
		this.hand = spliceRandom(deck, this.cardsEntitled);
		this.hand.sort((a, b) => a.value - b.value);
	}

	public formatHand() {
		if (this.hand?.length) return formatDeck(this.hand);
		else return "*No cards*";
	}

	public toString() {
		return userMention(this.id);
	}
}
