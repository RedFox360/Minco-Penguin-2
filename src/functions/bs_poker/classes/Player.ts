import { type Snowflake, userMention } from "discord.js";
import { type ExtCard } from "../bs_poker_types.js";
import { spliceRandom } from "../../util.js";
import { bsPokerTeams } from "../../../main.js";
import { formatDeck } from "../../cards/basic_card_functions.js";

abstract class Player {
	public abstract hand: ExtCard[];
	public abstract cardsEntitled: number;

	public constructor(public readonly id: Snowflake) {}

	public dealCards(deck: ExtCard[]) {
		this.hand = spliceRandom(deck, this.cardsEntitled);
		this.hand.sort((a, b) => a.value - b.value);
	}

	public formatHand() {
		if (this.hand?.length) return formatDeck(this.hand);
		else return "*No cards*";
	}

	public displayEntitled() {
		if (this.cardsEntitled === 1) return `${this.toString()}: 1 card`;
		return `${this.toString()}: ${this.cardsEntitled} cards`;
	}

	public toString() {
		return userMention(this.id);
	}
}

export default class BSPokerPlayer extends Player {
	public hand: ExtCard[] = [];

	public constructor(
		id: Snowflake,
		private readonly channelId: Snowflake,
		public cardsEntitled = 0,
		public readonly joinedMidGame = false
	) {
		super(id);
	}

	public getTeammates() {
		return bsPokerTeams
			.get(this.channelId)
			.find(t => t.includes(this.id))
			?.filter(t => t !== this.id);
	}

	public displayTeammates(): ` (Team: ${string})` | "" {
		const teammates = this.getTeammates();
		if (teammates?.length > 0)
			return ` (Team: ${teammates.map(userMention).join(" ")})`;
		return "";
	}
}
