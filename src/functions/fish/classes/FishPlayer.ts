import { User, type Snowflake } from "discord.js";
import { JICard } from "../../cards/basic_card_types.js";
import Player from "../../cards/Player.js";
import { spliceRandom } from "../../util.js";
import { isEJI } from "../fish_functions.js";
import { cardToHalfSuit } from "../fish_types.js";

export default class FishPlayer extends Player<JICard> {
	public hand: JICard[] = [];
	public cardsEntitled = 9;
	public disjoint: Snowflake[] = [];

	public get out() {
		return this.disjoint.length === 3 || this.hand.length === 0;
	}

	public constructor(public user: User, public readonly team: 0 | 1) {
		super(user.id);
	}
	public formatHandLength() {
		if (this.hand.length === 1) return `${this.toString()}: 1 card`;
		return `${this.toString()}: ${this.hand.length} cards`;
	}

	public insertCard(card: JICard) {
		for (let i = 0; i < this.hand.length; i++) {
			if (cardToHalfSuit(card) === cardToHalfSuit(this.hand[i])) {
				for (let j = i; j < this.hand.length; j++) {
					if (card.value <= this.hand[j].value) {
						this.hand.splice(j, 0, card);
						return;
					}
				}
				break;
			}
		}
		this.hand.push(card);
	}

	public sortHand() {
		this.hand.sort((a, b) => {
			if (isEJI(a.value)) {
				if (!isEJI(b.value)) return 1;
				return a.suit.localeCompare(b.suit);
			}
			const stringComp = a.suit.localeCompare(b.suit);
			if (stringComp !== 0) return stringComp;
			return a.value - b.value;
		});
	}

	public dealCards(deck: JICard[]) {
		this.hand = spliceRandom(deck, this.cardsEntitled);
		this.sortHand();
	}
}
