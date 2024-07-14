import { Collection, userMention } from "discord.js";
import Player from "./Player.js";
import { bsPokerTeams, prisma } from "../../../main.js";
import { countInArray } from "../../util.js";
import { updateProfile } from "../../../prisma/models.js";
export default class PlayerCollection extends Collection {
    static fromIds(playerIds, channelId, options) {
        const players = playerIds.map(id => [
            id,
            new Player(id, channelId),
        ]);
        return new PlayerCollection(players, channelId, options);
    }
    constructor(iterable, channelId, options) {
        super(iterable);
        this.channelId = channelId;
        this.options = options;
        this.out = [];
    }
    get originalPlayersLen() {
        return countInArray(this.values(), p => !p.joinedMidGame);
    }
    get everPlayersLen() {
        return this.size + this.out.length;
    }
    get ids() {
        return Array.from(this.keys());
    }
    get cardsEntitled() {
        return this.map(p => p.cardsEntitled);
    }
    get hands() {
        return this.map(p => p.hand);
    }
    displayEntitled() {
        return this.map(p => p.displayEntitled()).join("\n");
    }
    updatePlayerRating(playerIds) {
        if (this.originalPlayersLen === 2)
            return;
        const avgRankOut = this.out.length - (1 + playerIds.length) / 2;
        const rating = avgRankOut * (1 / (this.everPlayersLen - 1));
        return prisma.profile.updateMany({
            where: {
                userId: {
                    in: playerIds,
                },
            },
            data: {
                bsPokerRating: {
                    increment: rating,
                },
            },
        });
    }
    removePlayers(...playerIds) {
        for (const id of playerIds)
            this.delete(id);
        this.out.push(...playerIds);
        this.removePlayerFromTeams(...playerIds);
        this.updatePlayerRating(playerIds);
    }
    removePlayerFromTeams(...playerIds) {
        bsPokerTeams.set(this.channelId, bsPokerTeams
            .get(this.channelId)
            .map(t => {
            if (playerIds.includes(t[0]))
                return null;
            return t.filter(p => !playerIds.includes(p));
        })
            .filter(t => t?.length));
    }
    async addPlayerMidGame(playerId, cards) {
        this.set(playerId, new Player(playerId, this.channelId, cards, true));
        this.removePlayerFromTeams(playerId);
        bsPokerTeams.get(this.channelId).push([playerId]);
        await updateProfile(playerId, {
            mincoDollars: {
                decrement: this.options.startingBet,
            },
        });
    }
    formatPWSC() {
        if (!this.options.useSpecialCards)
            return "";
        if (this.size === 0)
            return "";
        const pwsc = this.filter(player => player.hand.some(c => c.suit === "bj" || c.suit === "rj")).map((_, id) => userMention(id));
        return `Players with special cards: ${pwsc.length === 0 ? "None" : pwsc.join(" ")}`;
    }
    deal(deck) {
        for (const p of this.values()) {
            p.dealCards(deck);
        }
    }
}
//# sourceMappingURL=PlayerCollection.js.map