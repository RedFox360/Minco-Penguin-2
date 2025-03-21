import { Collection } from "discord.js";
import FishPlayer from "./FishPlayer.js";
import { CardsPerHalfSuit, SignificantCardPerHalfSuit, } from "../fish_types.js";
import { formatDeck } from "../../cards/basic_card_functions.js";
import { deckHasCard } from "../fish_functions.js";
export class TeamsAreDisjointError extends Error {
    constructor() {
        super("Teams are disjoint.");
    }
}
export default class FishPlayerCollection extends Collection {
    constructor() {
        super(...arguments);
        this.currentPlayerId = null;
        this.team0Score = 0;
        this.team1Score = 1;
        this.team0Table = [];
        this.team1Table = [];
    }
    get currentPlayer() {
        return this.get(this.currentPlayerId);
    }
    formatTeamsAndHandLengths() {
        const team0for = this.team0.map(p => p.formatHandLength()).join("\n");
        const team1for = this.team1.map(p => p.formatHandLength()).join("\n");
        return `**Team 1**:\n${team0for}\n**Team 2**:\n${team1for}`;
    }
    formatTeamNamesOnly() {
        return `**Team 1**: ${this.team0Names}\n**Team 2**: ${this.team1Names}`;
    }
    incrementScore(team) {
        if (team === 0) {
            this.team0Score += 1;
        }
        else {
            this.team1Score += 1;
        }
    }
    get team0() {
        return this.filter(p => p.team === 0);
    }
    get team1() {
        return this.filter(p => p.team === 1);
    }
    get team0Names() {
        return this.team0.map(p => p.toString()).join(" ");
    }
    get team1Names() {
        return this.team1.map(p => p.toString()).join(" ");
    }
    formatTeamTableCards(team) {
        const table = team === 0 ? this.team0Table : this.team1Table;
        if (table.length === 0)
            return "No Half Suits";
        if (table.length === 1)
            return formatDeck(CardsPerHalfSuit[table[0]]);
        return formatDeck(table.map(x => SignificantCardPerHalfSuit[x]));
    }
    opponents(id) {
        return this.get(id).team === 0 ? this.team1 : this.team0;
    }
    static fromUsers(team0, team1) {
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
    verifyHalfSuitCall(call) {
        const trueCall = this.createTrueHalfSuitCallCollection(call.suit);
        const valid = trueCall.every((cards, k) => {
            const player = call.call.get(k);
            if (!player)
                return false;
            return player.every(c => deckHasCard(cards, c));
        });
        if (valid) {
            return { trueCall: null, works: true };
        }
        else {
            return { trueCall, works: false };
        }
    }
    removeSuitFromPlayers(suit) {
        const cards = CardsPerHalfSuit[suit];
        for (const player of this.values()) {
            player.hand = player.hand.filter(c => !deckHasCard(cards, c));
        }
    }
    createTrueHalfSuitCallCollection(suit) {
        const cards = CardsPerHalfSuit[suit];
        const collection = new Collection();
        for (const player of this.values()) {
            collection.set(player.id, player.hand.filter(c => deckHasCard(cards, c)));
        }
        return collection;
    }
    deal(deck) {
        for (const player of this.values()) {
            player.dealCards(deck);
        }
    }
    setFirstPlayer() {
        this.currentPlayerId = this.findKey(p => p.hand.some(x => x.suit === "S" && x.value === 14));
    }
    setFirstAvailablePlayer(team) {
        const availablePlayers = this.filter(p => p.team === team && !p.out);
        if (availablePlayers.size) {
            this.currentPlayerId = availablePlayers.randomKey();
        }
        else {
            this.currentPlayerId = null;
            throw new TeamsAreDisjointError();
        }
    }
}
//# sourceMappingURL=FishPlayerCollection.js.map