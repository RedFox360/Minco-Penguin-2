import Player from "../../cards/Player.js";
export default class FishPlayer extends Player {
    get out() {
        return this.disjoint.length === 3 || this.hand.length === 0;
    }
    constructor(id, username, team) {
        super(id);
        this.username = username;
        this.team = team;
        this.hand = [];
        this.cardsEntitled = 9;
        this.disjoint = [];
    }
    formatHandLength() {
        if (this.hand.length === 1)
            return `${this.toString()}: 1 card`;
        return `${this.toString()}: ${this.hand.length} cards`;
    }
}
//# sourceMappingURL=FishPlayer.js.map