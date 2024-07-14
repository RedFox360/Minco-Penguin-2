import { userMention } from "discord.js";
import { spliceRandom } from "../../util.js";
import { bsPokerTeams } from "../../../main.js";
import { formatDeck } from "../../cards/basic_card_functions.js";
class Player {
    constructor(id, channelId) {
        this.id = id;
        this.channelId = channelId;
    }
    dealCards(deck) {
        const newHand = spliceRandom(deck, this.cardsEntitled);
        newHand.sort((a, b) => a.value - b.value);
        this.hand = newHand;
    }
    formatHand() {
        return formatDeck(this.hand);
    }
    displayEntitled() {
        if (this.cardsEntitled === 1)
            return `${this.toString()}: 1 card`;
        return `${this.toString()}: ${this.cardsEntitled} cards`;
    }
    toString() {
        return userMention(this.id);
    }
}
export default class BSPokerPlayer extends Player {
    constructor(id, channelId, cardsEntitled = 0, joinedMidGame = false) {
        super(id, channelId);
        this.cardsEntitled = cardsEntitled;
        this.joinedMidGame = joinedMidGame;
        this.hand = [];
    }
    getTeammates() {
        return bsPokerTeams
            .get(this.channelId)
            .find(t => t.includes(this.id))
            ?.filter(t => t !== this.id);
    }
    displayTeammates() {
        const teammates = this.getTeammates();
        if (teammates?.length > 0)
            return ` (Team: ${teammates.map(userMention).join(" ")})`;
        return "";
    }
}
//# sourceMappingURL=Player.js.map