import { type Snowflake, userMention } from "discord.js";
import { type ExtCard } from "../bs_poker_types.js";
import { bsPokerTeams } from "../../../main.js";
import Player from "../../cards/Player.js";

export default class BSPokerPlayer extends Player<ExtCard> {
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

	public displayTeammates(): `(Team: ${string})` | "" {
		const teammates = this.getTeammates();
		if (teammates?.length > 0)
			return `(Team: ${teammates.map(userMention).join(" ")})`;
		return "";
	}
}
