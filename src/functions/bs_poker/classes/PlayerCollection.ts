import {
	type Snowflake,
	type UserMention,
	Collection,
	userMention,
} from "discord.js";
import Player from "./Player.js";
import { bsPokerTeams, prisma } from "../../../main.js";
import type OptionManager from "./OptionManager.js";
import { type ExtCard } from "../bs_poker_types.js";
import { formatDeck } from "../../cards/basic_card_functions.js";

type ArrayForm = Iterable<readonly [Snowflake, Player]>;

export default class PlayerCollection extends Collection<Snowflake, Player> {
	public out: Snowflake[] = [];
	public originalPlayers: number;
	private pwsc: UserMention[];
	private _currPlayerIdx = 0;
	public highestCard: ExtCard;

	public static fromIds(
		playerIds: readonly Snowflake[],
		channelId: Snowflake,
		options: OptionManager,
		beginCards = 1
	) {
		const players: ArrayForm = playerIds.map(id => [
			id,
			new Player(id, channelId, beginCards),
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

	public get cardsEntitled(): number[] {
		return this.map(p => p.cardsEntitled);
	}

	public get hands(): ExtCard[][] {
		return this.map(p => p.hand);
	}

	public displayEntitled() {
		return this.map(p => p.displayEntitled()).join("\n");
	}

	private updatePlayerData(players: readonly Player[]) {
		if (this.originalPlayers === 2) return;
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
			const avgRankOut = this.out.length - (1 + players.length) / 2;
			const rating = avgRankOut * (1 / (this.everPlayersLen - 1));

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

	public async removePlayers(...players: readonly Player[]) {
		const playerIds = players.map(p => p.id);
		for (const id of playerIds) this.delete(id);
		this.out.push(...playerIds);
		this.removePlayerFromTeams(...playerIds);
		await this.updatePlayerData(players);
	}

	public removePlayerFromTeams(...playerIds: readonly Snowflake[]) {
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

	public addPlayer(playerId: Snowflake, cards: number) {
		this.set(playerId, new Player(playerId, this.channelId, cards, true));
		this.removePlayerFromTeams(playerId);
		bsPokerTeams.get(this.channelId).push([playerId]);
	}

	private loadPWSC() {
		if (!this.options.useSpecialCards) return;
		this.pwsc = [];
		for (const player of this.values()) {
			const hasBJ = player.hand.some(c => c.suit === "bj");
			const hasRJ = player.hand.some(c => c.suit === "rj");
			if (hasBJ) this.pwsc.push(userMention(player.id));
			if (hasRJ) this.pwsc.push(userMention(player.id));
		}
	}

	public formatPWSC(): `Players with special cards: ${string}` | "" {
		if (this.size && this.pwsc) {
			const pwscDisplay = this.pwsc.length === 0 ? "None" : this.pwsc.join(" ");
			return `Players with special cards: ${pwscDisplay}`;
		}
		return "";
	}

	public dealCards(deck: ExtCard[]) {
		for (const p of this.values()) {
			p.dealCards(deck);
		}
		this.loadPWSC();
		this.setHighestCard();
	}

	public afterKick() {
		this.loadPWSC();
		this.setHighestCard();
	}

	public formatTeammateHand(
		userId: Snowflake
	): { content: string; hand: ExtCard[] } | null {
		const channelTeams = bsPokerTeams.get(this.channelId);
		if (!channelTeams?.length) return null;
		const team = channelTeams.find(t => t.includes(userId));
		if (!team) return null;
		const teamPlayerInGameId = team[0];
		if (!this.has(teamPlayerInGameId)) return null;
		const teammateHand = this.get(teamPlayerInGameId)?.hand;
		if (!teammateHand) return null;
		return {
			content: `*<@${teamPlayerInGameId}> is your teammate. Here are their cards.*\n${formatDeck(
				teammateHand
			)}`,
			hand: teammateHand,
		};
	}

	private get currentPlayerIndex(): number {
		if (this._currPlayerIdx < 0 || this._currPlayerIdx >= this.size) {
			return 0;
		} else {
			return this._currPlayerIdx;
		}
	}

	private set currentPlayerIndex(newIdx: number) {
		if (newIdx < 0 || newIdx >= this.size) {
			this._currPlayerIdx = 0;
		} else {
			this._currPlayerIdx = newIdx;
		}
	}

	public get currentPlayer(): Player {
		return this.at(this.currentPlayerIndex);
	}

	public forward() {
		this.currentPlayerIndex += 1;
	}

	public setIdxToIdxOf(playerId: Snowflake) {
		this.currentPlayerIndex = Array.from(this.keys()).indexOf(playerId);
	}

	public reverseAll() {
		this.reverse();
		this.currentPlayerIndex = this.size - this.currentPlayerIndex - 1;
	}

	private setHighestCard() {
		if (this.options.useBleedJoker)
			this.highestCard = this.map(p => p.hand.at(-1)).reduce((prev, curr) => {
				return prev.value > curr.value ? prev : curr;
			});
	}
}
