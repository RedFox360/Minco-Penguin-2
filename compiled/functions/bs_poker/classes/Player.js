import { userMention } from "discord.js";
import { bsPokerTeams, prisma } from "../../../main.js";
import Player from "../../cards/Player.js";
export default class BSPokerPlayer extends Player {
    constructor(id, channelId, cardsEntitled = 0, joinedMidGame = false) {
        super(id);
        this.channelId = channelId;
        this.cardsEntitled = cardsEntitled;
        this.joinedMidGame = joinedMidGame;
        this.hand = [];
        this._bses = 0;
        this._bsSuccesses = 0;
    }
    get bses() {
        return this._bses;
    }
    get bsSuccesses() {
        return this._bsSuccesses;
    }
    incrementBses() {
        this._bses += 1;
    }
    incrementBsSuccesses() {
        this._bsSuccesses += 1;
    }
    updateBSData() {
        if (!this.joinedMidGame && this.bses !== 0) {
            return prisma.profile.update({
                where: {
                    userId: this.id,
                },
                data: {
                    bsCount: {
                        increment: this.bses,
                    },
                    bsSuccesses: {
                        increment: this.bsSuccesses,
                    },
                },
            });
        }
        return Promise.resolve();
    }
    getTeammates() {
        return bsPokerTeams
            .get(this.channelId)
            .find(t => t.includes(this.id))
            ?.filter(t => t !== this.id);
    }
    displayEntitled() {
        if (this.cardsEntitled === 1)
            return `${this.toString()}: 1 card`;
        return `${this.toString()}: ${this.cardsEntitled} cards`;
    }
    displayTeammates() {
        const teammates = this.getTeammates();
        if (teammates?.length > 0)
            return `(Team: ${teammates.map(userMention).join(" ")})`;
        return "";
    }
}
//# sourceMappingURL=Player.js.map