import { Collection, Snowflake, userMention } from "discord.js";
import Player from "./Player.js";
import { bsPokerTeams, prisma } from "../../../main.js";
import { updateProfile } from "../../../prisma/models.js";
import OptionManager from "./OptionManager.js";
import { ExtCard } from "../bs_poker_types.js";

type ArrayForm = Iterable<readonly [Snowflake, Player]>;

export default class PlayerCollection extends Collection<Snowflake, Player> {
	public out: Snowflake[] = [];
	public originalPlayers: number;

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
		this.originalPlayers = this.size;
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

	private updatePlayerData(players: Player[]) {
		if (this.originalPlayers === 2) return;
		const avgRankOut = this.out.length - (1 + players.length) / 2;
		const rating = avgRankOut * (1 / (this.everPlayersLen - 1));
		const joinedMidGame = players.filter(p => p.joinedMidGame).map(p => p.id);
		const didNotJoinMidgame = players
			.filter(p => !p.joinedMidGame)
			.map(p => p.id);
		const promises: Promise<unknown>[] = [];
		if (joinedMidGame.length) {
			if (this.options.startingBet) {
				promises.push(
					prisma.profile.updateMany({
						where: {
							userId: {
								in: joinedMidGame,
							},
						},
						data: {
							mincoDollars: {
								decrement: this.options.startingBet,
							},
						},
					})
				);
			}
		} else if (didNotJoinMidgame.length) {
			promises.push(
				prisma.profile.updateMany({
					where: {
						userId: {
							in: didNotJoinMidgame,
						},
					},
					data: {
						bsPokerRating: {
							increment: rating,
						},
						bsPokerGamesPlayed: {
							increment: 1,
						},
						mincoDollars: {
							decrement: this.options.startingBet,
						},
					},
				})
			);
		}
		return Promise.all(promises);
	}

	public async removePlayers(...players: Player[]) {
		const playerIds = players.map(p => p.id);
		for (const id of playerIds) this.delete(id);
		this.out.push(...playerIds);
		this.removePlayerFromTeams(...playerIds);
		await this.updatePlayerData(players);
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
