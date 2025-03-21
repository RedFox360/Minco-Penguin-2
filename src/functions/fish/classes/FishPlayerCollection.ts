import { Collection, Snowflake, User } from "discord.js";
import FishPlayer from "./FishPlayer.js";
import { JICard } from "../../cards/basic_card_types.js";
import {
	CardsPerHalfSuit,
	HalfSuit,
	HalfSuitCall,
	HalfSuitCallCollection,
	SignificantCardPerHalfSuit,
} from "../fish_types.js";
import { formatDeck } from "../../cards/basic_card_functions.js";
import { deckHasCard } from "../fish_functions.js";

export class TeamsAreDisjointError extends Error {
	constructor() {
		super("Teams are disjoint.");
	}
}

export default class FishPlayerCollection extends Collection<
	Snowflake,
	FishPlayer
> {
	public currentPlayerId: Snowflake | null = null;
	public team0Score = 0;
	public team1Score = 1;
	public team0Table: HalfSuit[] = [];
	public team1Table: HalfSuit[] = [];

	public get currentPlayer() {
		return this.get(this.currentPlayerId);
	}

	public formatTeamsAndHandLengths() {
		const team0for = this.team0.map(p => p.formatHandLength()).join("\n");
		const team1for = this.team1.map(p => p.formatHandLength()).join("\n");
		return `**Team 1**:\n${team0for}\n**Team 2**:\n${team1for}`;
	}

	public formatTeamNamesOnly() {
		return `**Team 1**: ${this.team0Names}\n**Team 2**: ${this.team1Names}`;
	}

	public incrementScore(team: 0 | 1) {
		if (team === 0) {
			this.team0Score += 1;
		} else {
			this.team1Score += 1;
		}
	}

	public get team0() {
		return this.filter(p => p.team === 0);
	}

	public get team1() {
		return this.filter(p => p.team === 1);
	}

	private get team0Names() {
		return this.team0.map(p => p.toString()).join(" ");
	}

	private get team1Names() {
		return this.team1.map(p => p.toString()).join(" ");
	}

	public formatTeamTableCards(team: 0 | 1) {
		const table = team === 0 ? this.team0Table : this.team1Table;
		if (table.length === 0) return "No Half Suits";
		if (table.length === 1) return formatDeck(CardsPerHalfSuit[table[0]]);
		return formatDeck(table.map(x => SignificantCardPerHalfSuit[x]));
	}

	public opponents(id: Snowflake) {
		return this.get(id).team === 0 ? this.team1 : this.team0;
	}

	public static fromUsers(team0: readonly User[], team1: readonly User[]) {
		const collection = new FishPlayerCollection();
		for (const player of team0) {
			const playerN = new FishPlayer(player, 0);
			collection.set(player.id, playerN);
		}
		for (const player of team1) {
			const playerN = new FishPlayer(player, 1);
			collection.set(player.id, playerN);
		}
		return collection;
	}

	public verifyHalfSuitCall(call: HalfSuitCall): {
		trueCall: HalfSuitCallCollection | null;
		works: boolean;
	} {
		const trueCall = this.createTrueHalfSuitCallCollection(call.suit);
		const valid = trueCall.every((cards, k) => {
			const player = call.call.get(k);
			if (!player) return false;
			return player.every(c => deckHasCard(cards, c));
		});
		if (valid) {
			return { trueCall: null, works: true };
		} else {
			return { trueCall, works: false };
		}
	}

	public removeSuitFromPlayers(suit: HalfSuit) {
		const cards = CardsPerHalfSuit[suit];
		for (const player of this.values()) {
			player.hand = player.hand.filter(c => !deckHasCard(cards, c));
		}
	}

	public createTrueHalfSuitCallCollection(
		suit: HalfSuit
	): HalfSuitCallCollection {
		const cards = CardsPerHalfSuit[suit];
		const collection: HalfSuitCallCollection = new Collection();
		for (const player of this.values()) {
			collection.set(
				player.id,
				player.hand.filter(c => deckHasCard(cards, c))
			);
		}
		return collection;
	}

	public deal(deck: JICard[]) {
		for (const player of this.values()) {
			player.dealCards(deck);
		}
	}

	public setFirstPlayer() {
		this.currentPlayerId = this.findKey(p =>
			p.hand.some(x => x.suit === "S" && x.value === 14)
		);
	}

	public setFirstAvailablePlayer(team: 0 | 1) {
		const availablePlayers = this.filter(p => p.team === team && !p.out);
		if (availablePlayers.size) {
			this.currentPlayerId = availablePlayers.randomKey();
		} else {
			this.currentPlayerId = null;
			throw new TeamsAreDisjointError();
		}
	}
}
