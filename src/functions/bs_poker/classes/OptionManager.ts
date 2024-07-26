import { type ChatInputCommandInteraction } from "discord.js";
import { formatBool } from "../../util.js";
import { createBasicDeck } from "../../cards/basic_card_functions.js";
import { type ExtCard } from "./../bs_poker_types.js";
import { optionNames } from "../../../slash_commands/bs_poker_command.js";

export class OptionCreationError extends Error {}

export default class OptionManager {
	public readonly cardsToOut: number;
	public readonly commonCards: number;
	public readonly startingBet: number;
	public readonly jokerCount: number;
	public readonly insuranceCount: number;
	public readonly useSpecialCards: boolean;
	public readonly beginCards: number;
	public readonly maxCommonCards: number;
	public readonly playerLimit: number;
	public readonly allowJoinMidGame: boolean;
	public readonly useCurses: boolean;
	public readonly nonStandard: boolean;
	public readonly useBloodJoker: boolean;
	public readonly useClown: boolean;
	public readonly bleed: boolean;

	public maxPlayerLimit() {
		const deckSize =
			52 +
			this.jokerCount +
			this.insuranceCount +
			(this.useSpecialCards ? 2 : 0);
		const maxCommonCards =
			this.commonCards === -1 ? this.cardsToOut - 1 : this.commonCards;
		const maxPlayerLimit = Math.floor(
			(deckSize - maxCommonCards) / (this.cardsToOut - 1)
		);
		return maxPlayerLimit;
	}

	public constructor({ options }: ChatInputCommandInteraction<"cached">) {
		// Retrieving Options
		this.cardsToOut = options.getInteger(optionNames.cardsToOut);
		this.commonCards = options.getInteger(optionNames.commonCards) ?? -1;
		this.startingBet = options.getInteger(optionNames.bet) ?? 0;
		this.jokerCount = options.getInteger(optionNames.jokerCount) ?? 2;
		this.insuranceCount = options.getInteger(optionNames.insuranceCount) ?? 1;
		this.useSpecialCards =
			options.getBoolean(optionNames.specialCards) ?? false;
		this.beginCards = options.getInteger(optionNames.beginCards) ?? 1;
		this.allowJoinMidGame = options.getBoolean(optionNames.joinMidGame) ?? true;
		this.useCurses = options.getBoolean(optionNames.curses) ?? false;
		this.nonStandard = options.getBoolean(optionNames.nonstandard) ?? true;
		this.useBloodJoker = options.getBoolean(optionNames.bloodJoker) ?? false;
		this.useClown = options.getBoolean(optionNames.clown) ?? false;
		this.bleed = options.getBoolean(optionNames.bleed) ?? false;

		const maxPlayerLimit = this.maxPlayerLimit();
		this.playerLimit =
			options.getInteger(optionNames.playerLimit) ?? maxPlayerLimit;

		if (this.beginCards >= this.cardsToOut) {
			throw new OptionCreationError(
				"`begin_cards` must be less than `cards_to_out`."
			);
		}

		if (this.playerLimit > maxPlayerLimit) {
			throw new OptionCreationError(
				`The maximum number of cards to be dealt is greater than the size of the deck.
Please decrease the player limit to a value less than or equal to ${maxPlayerLimit}.`
			);
		}

		if (this.useClown) {
			this.useSpecialCards = true;
			this.useBloodJoker = false;
		} else if (this.useBloodJoker) {
			this.useSpecialCards = true;
			this.useCurses = true;
			this.useClown = false;
		}
	}

	public display() {
		return `Cards to get out: **${this.cardsToOut}**
Jokers in deck: **${this.jokerCount}**
Insurance cards in deck: **${this.insuranceCount}**
Starting cards: **${this.beginCards}**
Common cards: **${this.commonCards === -1 ? "Median" : this.commonCards}**
Allow join mid-game: ${formatBool(this.allowJoinMidGame)}
Use special cards: ${formatBool(this.useSpecialCards)}
Use curses: ${formatBool(this.useCurses)}
Allow nonstandard calls: ${formatBool(this.nonStandard)}
Use Blood Joker: ${formatBool(this.useBloodJoker)}
Use Clown Joker: ${formatBool(this.useClown)}
Bleed Cards: ${formatBool(this.bleed)}`;
	}

	public createDeck(): ExtCard[] {
		const deck: ExtCard[] = createBasicDeck();
		for (let i = 0; i < this.jokerCount; i++) {
			deck.push({ suit: "j", value: 1 });
		}
		if (this.useSpecialCards) {
			deck.push({ suit: "bj", value: 1 }, { suit: "rj", value: 1 });
		}
		for (let i = 0; i < this.insuranceCount; i++) {
			deck.push({ suit: "i", value: 15 });
		}
		return deck;
	}
}
