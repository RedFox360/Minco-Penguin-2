import { formatBool } from "../../util.js";
import { createBasicDeck } from "../../cards/basic_card_functions.js";
import { optionNames } from "../../../slash_commands/bs_poker_command.js";
export class OptionCreationError extends Error {
}
export const Preset1 = {
    getInteger(name) {
        switch (name) {
            case optionNames.cardsToOut:
                return 6;
            case optionNames.beginCards:
                return 2;
            case optionNames.insuranceCount:
                return 2;
            default:
                return null;
        }
    },
    getBoolean(name) {
        switch (name) {
            case optionNames.clownJoker:
                return true;
            case optionNames.bloodJoker:
                return true;
            case optionNames.bleedJoker:
                return true;
            case optionNames.useSpecials:
                return true;
            case optionNames.curses:
                return true;
            default:
                return null;
        }
    },
};
export default class OptionManager {
    maxPlayerLimit() {
        const deckSize = 52 +
            this.jokerCount +
            this.trueInsuranceCount +
            (this.useSpecialCards ? 2 : 0);
        const maxCommonCards = this.commonCardsAmt === -1 ? this.cardsToOut - 1 : this.commonCardsAmt;
        const maxPlayerLimit = Math.floor((deckSize - maxCommonCards) / (this.cardsToOut - 1));
        return maxPlayerLimit;
    }
    constructor(options) {
        this.redJokerAbilities = "";
        // Retrieving Options
        this.cardsToOut = options.getInteger(optionNames.cardsToOut);
        this.commonCardsAmt = options.getInteger(optionNames.commonCards) ?? -1;
        this.startingBet = options.getInteger(optionNames.bet) ?? 0;
        this.jokerCount = options.getInteger(optionNames.jokerCount) ?? 2;
        this.insuranceCount = options.getInteger(optionNames.insuranceCount) ?? 1;
        this.beginCards = options.getInteger(optionNames.beginCards) ?? 1;
        this.allowJoinMidGame = options.getBoolean(optionNames.joinMidGame) ?? true;
        this.nonStandard = options.getBoolean(optionNames.nonstandard) ?? true;
        this.useClown = options.getBoolean(optionNames.clownJoker) ?? false;
        this.useBloodJoker = options.getBoolean(optionNames.bloodJoker) ?? false;
        this.useBleedJoker = options.getBoolean(optionNames.bleedJoker) ?? false;
        this.insuranceSpecials =
            options.getBoolean(optionNames.insuranceSpecials) ?? false;
        this.useSpecialCards =
            (options.getBoolean(optionNames.useSpecials) ?? false) ||
                ((this.useClown || this.useBloodJoker || this.useBleedJoker) &&
                    !this.insuranceSpecials);
        this.useCurses =
            options.getBoolean(optionNames.curses) || this.useBloodJoker;
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
        if (this.trueInsuranceCount > 4) {
            throw new OptionCreationError(`The number of insurance cards in the deck is greater than 4. (Enabling insurance specials adds 2 insurance cards.)`);
        }
        if (this.useSpecialCards && this.jokerCount > 2) {
            throw new OptionCreationError(`The number of jokers in the deck is greater than 4. (Enabling special cards adds 2 jokers.)`);
        }
        if (this.useSpecialCards) {
            const abilities = ["Red"];
            if (this.useClown)
                abilities.push("Clown");
            if (this.useBloodJoker)
                abilities.push("Blood");
            if (this.useBleedJoker)
                abilities.push("Bleed");
            this.redJokerAbilities = `Red Joker Abilities: **${abilities.join(" + ")}**`;
        }
    }
    display() {
        return `Cards to get out: **${this.cardsToOut}**
Jokers in deck: **${this.jokerCount}**
Insurances in deck: **${this.insuranceCount}**
Starting cards: **${this.beginCards}**
Common cards: **${this.commonCardsAmt === -1 ? "Median" : this.commonCardsAmt}**
Allow join mid-game: ${formatBool(this.allowJoinMidGame)}
Special cards: ${formatBool(this.useSpecialCards)}
Insurance specials: ${formatBool(this.insuranceSpecials)}
Curses: ${formatBool(this.useCurses)}
Allow nonstandard calls: ${formatBool(this.nonStandard)}
${this.redJokerAbilities}`;
    }
    createDeck() {
        const deck = createBasicDeck();
        for (let i = 0; i < this.jokerCount; i++) {
            deck.push({ suit: "j", value: 1 });
        }
        if (this.useSpecialCards) {
            deck.push({ suit: "bj", value: 1 }, { suit: "rj", value: 1 });
        }
        if (this.insuranceSpecials) {
            deck.push({ suit: "bj", value: 15 }, { suit: "rj", value: 15 });
        }
        for (let i = 0; i < this.insuranceCount; i++) {
            deck.push({ suit: "i", value: 15 });
        }
        return deck;
    }
}
//# sourceMappingURL=OptionManager.js.map