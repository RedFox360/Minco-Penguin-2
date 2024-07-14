import { formatBool } from "../../util.js";
import { createBasicDeck } from "../../cards/basic_card_functions.js";
export class OptionCreationError extends Error {
}
export default class OptionManager {
    maxPlayerLimit() {
        const deckSize = 52 +
            this.jokerCount +
            this.insuranceCount +
            (this.useSpecialCards ? 2 : 0);
        const maxCommonCards = this.commonCards === -1 ? this.cardsToOut - 1 : this.commonCards;
        const maxPlayerLimit = Math.floor((deckSize - maxCommonCards) / (this.cardsToOut - 1));
        return maxPlayerLimit;
    }
    constructor(interaction) {
        // Retrieving Options
        this.cardsToOut = interaction.options.getInteger("cards_to_out");
        this.commonCards = interaction.options.getInteger("common_cards") ?? -1;
        this.startingBet = interaction.options.getInteger("bet") ?? 0;
        this.jokerCount = interaction.options.getInteger("joker_count") ?? 2;
        this.insuranceCount =
            interaction.options.getInteger("insurance_count") ?? 1;
        this.useSpecialCards =
            interaction.options.getBoolean("use_special_cards") ?? false;
        this.beginCards = interaction.options.getInteger("begin_cards") ?? 1;
        this.allowJoinMidGame =
            interaction.options.getBoolean("allow_join_mid_game") ?? true;
        this.useCurses = interaction.options.getBoolean("use_curses") ?? false;
        this.nonStandard = interaction.options.getBoolean("nonstandard") ?? true;
        this.useBloodJoker = interaction.options.getBoolean("blood_joker") ?? false;
        this.useClown = interaction.options.getBoolean("clown") ?? false;
        const maxPlayerLimit = this.maxPlayerLimit();
        this.playerLimit =
            interaction.options.getInteger("player_limit") ?? maxPlayerLimit;
        if (this.beginCards >= this.cardsToOut) {
            throw new OptionCreationError("`begin_cards` must be less than `cards_to_out`.");
        }
        if (this.playerLimit > maxPlayerLimit) {
            throw new OptionCreationError(`The maximum number of cards to be dealt is greater than the size of the deck.
Please decrease the player limit to a value less than or equal to ${maxPlayerLimit}.`);
        }
        if (this.useClown) {
            this.useSpecialCards = true;
            this.useBloodJoker = false;
        }
        else if (this.useBloodJoker) {
            this.useSpecialCards = true;
            this.useCurses = true;
            this.useClown = false;
        }
    }
    display() {
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
Use Clown Joker: ${formatBool(this.useClown)}`;
    }
    createDeck() {
        const deck = createBasicDeck();
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
//# sourceMappingURL=OptionManager.js.map