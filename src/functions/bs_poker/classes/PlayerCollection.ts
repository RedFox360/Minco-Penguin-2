import { Collection, Snowflake, userMention } from "discord.js";
import Player from "./Player.js";
import { bsPokerTeams, prisma } from "../../../main.js";
import { countInArray } from "../../util.js";
import { updateProfile } from "../../../prisma/models.js";
import OptionManager from "./OptionManager.js";
import { ExtCard } from "../bs_poker_types.js";

type ArrayForm = Iterable<readonly [Snowflake, Player]>;

export default class PlayerCollection extends Collection<Snowflake, Player> {
	public out: Snowflake[] = [];

	public static fromIds(
		playerIds: Snowflake[],
		channelId: Snowflake,
		options: OptionManager
	) {
		const players: ArrayForm = playerIds.map(id => [
			id,
			new Player(id, channelId),
		]);
		return new PlayerCollection(players, channelId, options);
	}

	public constructor(
		iterable: ArrayForm,
		private readonly channelId: Snowflake,
		private readonly options: OptionManager
	) {
		super(iterable);
	}

	public get originalPlayersLen(): number {
		return countInArray(this.values(), p => !p.joinedMidGame);
	}

	public get everPlayersLen(): number {
		return this.size + this.out.length;
	}

	public get ids(): Snowflake[] {
		return Array.from(this.keys());
	}

	public get cardsEntitled(): number[] {
		return this.map(p => p.cardsEntitled);
	}

	public get hands(): ExtCard[][] {
		return this.map(p => p.hand);
	}

	public displayEntitled() {
		return this.map(p => p.displayEntitled()).join("\n");
	}

	private updatePlayerRating(playerIds: Snowflake[]) {
		if (this.originalPlayersLen === 2) return;
		const avgRankOut = this.out.length - (1 + playerIds.length) / 2;
		const rating = avgRankOut * (1 / (this.everPlayersLen - 1));

		return prisma.profile.updateMany({
			where: {
				userId: {
					in: playerIds,
				},
			},
			data: {
				bsPokerRating: {
					increment: rating,
				},
			},
		});
	}

	public removePlayers(...playerIds: Snowflake[]) {
		for (const id of playerIds) this.delete(id);
		this.out.push(...playerIds);
		this.removePlayerFromTeams(...playerIds);
		this.updatePlayerRating(playerIds);
	}

	public removePlayerFromTeams(...playerIds: Snowflake[]) {
		bsPokerTeams.set(
			this.channelId,
			bsPokerTeams
				.get(this.channelId)
				.map(t => {
					if (playerIds.includes(t[0])) return null;
					return t.filter(p => !playerIds.includes(p));
				})
				.filter(t => t?.length)
		);
	}

	public async addPlayerMidGame(playerId: Snowflake, cards: number) {
		this.set(playerId, new Player(playerId, this.channelId, cards, true));
		this.removePlayerFromTeams(playerId);
		bsPokerTeams.get(this.channelId).push([playerId]);
		await updateProfile(playerId, {
			mincoDollars: {
				decrement: this.options.startingBet,
			},
		});
	}

	public formatPWSC() {
		if (!this.options.useSpecialCards) return "";
		if (this.size === 0) return "";
		const pwsc = this.filter(player =>
			player.hand.some(c => c.suit === "bj" || c.suit === "rj")
		).map((_, id) => userMention(id));

		return `Players with special cards: ${
			pwsc.length === 0 ? "None" : pwsc.join(" ")
		}`;
	}

	public deal(deck: ExtCard[]) {
		for (const p of this.values()) {
			p.dealCards(deck);
		}
	}
}
