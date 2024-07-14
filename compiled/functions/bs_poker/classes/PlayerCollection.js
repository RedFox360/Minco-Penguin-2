import { Collection, userMention } from "discord.js";
import Player from "./Player.js";
import { bsPokerTeams, prisma } from "../../../main.js";
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
        this.originalPlayers = this.size;
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
    updatePlayerData(players) {
        if (this.originalPlayers === 2)
            return;
        const avgRankOut = this.out.length - (1 + players.length) / 2;
        const rating = avgRankOut * (1 / (this.everPlayersLen - 1));
        const joinedMidGame = players.filter(p => p.joinedMidGame).map(p => p.id);
        const didNotJoinMidgame = players
            .filter(p => !p.joinedMidGame)
            .map(p => p.id);
        const promises = [];
        if (joinedMidGame.length) {
            if (this.options.startingBet) {
                promises.push(prisma.profile.updateMany({
                    where: {
                        userId: {
                            in: joinedMidGame,
                        },
                    },
                    data: {
                        mincoDollars: {
                            decrement: this.options.startingBet,
                        },
                    },
                }));
            }
        }
        else if (didNotJoinMidgame.length) {
            promises.push(prisma.profile.updateMany({
                where: {
                    userId: {
                        in: didNotJoinMidgame,
                    },
                },
                data: {
                    bsPokerRating: {
                        increment: rating,
                    },
                    bsPokerGamesPlayed: {
                        increment: 1,
                    },
                    mincoDollars: {
                        decrement: this.options.startingBet,
                    },
                },
            }));
        }
        return Promise.all(promises);
    }
    async removePlayers(...players) {
        const playerIds = players.map(p => p.id);
        for (const id of playerIds)
            this.delete(id);
        this.out.push(...playerIds);
        this.removePlayerFromTeams(...playerIds);
        await this.updatePlayerData(players);
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