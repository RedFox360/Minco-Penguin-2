import { type Snowflake, userMention } from "discord.js";
import { type ExtCard } from "../bs_poker_types.js";
import { bsPokerTeams } from "../../../main.js";
import Player from "../../cards/Player.js";

export default class BSPokerPlayer extends Player<ExtCard> {
	public hand: ExtCard[] = [];
	private _bses = 0;
	private _bsSuccesses = 0;

	public constructor(
		id: Snowflake,
		private readonly channelId: Snowflake,
		public cardsEntitled = 0,
		public readonly joinedMidGame = false
	) {
		super(id);
	}

	public get bses() {
		return this._bses;
	}

	public get bsSuccesses() {
		return this._bsSuccesses;
	}

	public incrementBses() {
		this._bses += 1;
	}

	public incrementBsSuccesses() {
		this._bsSuccesses += 1;
	}

	public getTeammates() {
		return bsPokerTeams
			.get(this.channelId)
			.find(t => t.includes(this.id))
			?.filter(t => t !== this.id);
	}

	public displayEntitled() {
		if (this.cardsEntitled === 1) return `${this.toString()}: 1 card`;
		return `${this.toString()}: ${this.cardsEntitled} cards`;
	}

	public displayTeammates(): `(Team: ${string})` | "" {
		const teammates = this.getTeammates();
		if (teammates?.length > 0)
			return `(Team: ${teammates.map(userMention).join(" ")})`;
		return "";
	}
}
