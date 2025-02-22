import { userMention } from "discord.js";
import { spliceRandom } from "../util.js";
import { formatDeck } from "../cards/basic_card_functions.js";
export default class Player {
    constructor(id) {
        this.id = id;
    }
    dealCards(deck) {
        this.hand = spliceRandom(deck, this.cardsEntitled);
        this.hand.sort((a, b) => a.value - b.value);
    }
    formatHand() {
        if (this.hand?.length)
            return formatDeck(this.hand);
        else
            return "*No cards*";
    }
    toString() {
        return userMention(this.id);
    }
}
//# sourceMappingURL=Player.js.map