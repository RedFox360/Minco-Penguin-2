import { formatBool } from "../../util.js";
import { createBasicDeck } from "../../cards/basic_card_functions.js";
import { optionNames } from "../../../slash_commands/bs_poker_command.js";
import { emoji } from "../../cards/basic_card_types.js";
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
    constructor({ options }) {
        this.useSpecialCards = false;
        this.useRedJoker = false;
        this.useBloodJoker = false;
        this.useClown = false;
        this.insuranceSpecials = false;
        this.redJokerAbility = "";
        // Retrieving Options
        this.cardsToOut = options.getInteger(optionNames.cardsToOut);
        this.commonCards = options.getInteger(optionNames.commonCards) ?? -1;
        this.startingBet = options.getInteger(optionNames.bet) ?? 0;
        this.jokerCount = options.getInteger(optionNames.jokerCount) ?? 2;
        this.insuranceCount = options.getInteger(optionNames.insuranceCount) ?? 1;
        const useSpecialCardsOption = options.getString(optionNames.specialCards.name);
        this.beginCards = options.getInteger(optionNames.beginCards) ?? 1;
        this.allowJoinMidGame = options.getBoolean(optionNames.joinMidGame) ?? true;
        this.useCurses = options.getBoolean(optionNames.curses) ?? false;
        this.nonStandard = options.getBoolean(optionNames.nonstandard) ?? true;
        switch (useSpecialCardsOption) {
            case optionNames.specialCards.standard:
                this.useSpecialCards = true;
                this.useRedJoker = true;
                this.redJokerAbility = "Red Joker Ability: **Standard**";
                break;
            case optionNames.specialCards.blood:
                this.useSpecialCards = true;
                this.useBloodJoker = true;
                this.useRedJoker = true;
                this.redJokerAbility = "Red Joker Ability: **Blood Joker**";
                break;
            case optionNames.specialCards.clown:
                this.useSpecialCards = true;
                this.useClown = true;
                this.redJokerAbility = `Red Joker Ability: **Clown ${emoji.clown}**`;
                break;
            case optionNames.specialCards.allRedJoker:
                this.useSpecialCards = true;
                this.useBloodJoker = true;
                this.useClown = true;
                this.useRedJoker = true;
                this.redJokerAbility = "Red Joker Ability: **Blood + Clown + Red**";
                break;
        }
        if (this.useSpecialCards) {
            this.insuranceSpecials =
                options.getBoolean(optionNames.insuranceSpecials) ?? false;
        }
        this.trueInsuranceCount =
            this.insuranceCount + (this.insuranceSpecials ? 2 : 0);
        let maxPlayerLimit = this.maxPlayerLimit();
        if (maxPlayerLimit < 2) {
            throw new OptionCreationError(`With your current settings, the deck is not large enough to allow for a game of BS Poker.`);
        }
        if (maxPlayerLimit > 15)
            maxPlayerLimit = 15;
        this.playerLimit =
            options.getInteger(optionNames.playerLimit) ?? maxPlayerLimit;
        if (this.beginCards >= this.cardsToOut) {
            throw new OptionCreationError("`begin_cards` must be less than `cards_to_out`.");
        }
        if (this.playerLimit > maxPlayerLimit) {
            throw new OptionCreationError(`The maximum number of cards to be dealt is greater than the size of the deck.
Please decrease the player limit to a value less than or equal to ${maxPlayerLimit}.`);
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
${this.redJokerAbility}`;
    }
    createDeck() {
        const deck = createBasicDeck();
        for (let i = 0; i < this.jokerCount; i++) {
            deck.push({ suit: "j", value: 1 });
        }
        if (this.useSpecialCards) {
            deck.push({ suit: "bj", value: 1 }, { suit: "rj", value: 1 });
            if (this.insuranceSpecials) {
                deck.push({ suit: "bj", value: 15 }, { suit: "rj", value: 15 });
            }
        }
        for (let i = 0; i < this.insuranceCount; i++) {
            deck.push({ suit: "i", value: 15 });
        }
        return deck;
    }
}
//# sourceMappingURL=OptionManager.js.map