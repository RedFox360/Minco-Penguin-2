import { Collection, userMention, } from "discord.js";
import Player from "./Player.js";
import { bsPokerTeams, prisma } from "../../../main.js";
import { formatDeck } from "../../cards/basic_card_functions.js";
export default class PlayerCollection extends Collection {
    static fromIds(playerIds, channelId, options, beginCards = 0) {
        const players = playerIds.map(id => [
            id,
            new Player(id, channelId, beginCards),
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
    addPlayer(playerId, cards) {
        this.set(playerId, new Player(playerId, this.channelId, cards, true));
        this.removePlayerFromTeams(playerId);
        bsPokerTeams.get(this.channelId).push([playerId]);
    }
    loadPWSC() {
        if (!this.options.useSpecialCards)
            return;
        this.pwsc = [];
        for (const player of this.values()) {
            const hasBJ = player.hand.some(c => c.suit === "bj");
            const hasRJ = player.hand.some(c => c.suit === "rj");
            if (hasBJ)
                this.pwsc.push(userMention(player.id));
            if (hasRJ)
                this.pwsc.push(userMention(player.id));
        }
    }
    formatPWSC() {
        if (this.size && this.pwsc) {
            const pwscDisplay = this.pwsc.length === 0 ? "None" : this.pwsc.join(" ");
            return `Players with special cards: ${pwscDisplay}`;
        }
        return "";
    }
    deal(deck) {
        for (const p of this.values()) {
            p.dealCards(deck);
        }
        this.loadPWSC();
    }
    formatTeammateHand(userId) {
        const channelTeams = bsPokerTeams.get(this.channelId);
        if (!channelTeams?.length)
            return "";
        const team = channelTeams.find(t => t.includes(userId));
        if (!team)
            return "";
        const teamPlayerInGameId = team[0];
        if (!this.has(teamPlayerInGameId))
            return "";
        const teammateHand = this.get(teamPlayerInGameId)?.hand;
        if (!teammateHand)
            return "";
        return `\n*<@${teamPlayerInGameId}> is your teammate. Here are their cards.*\n${formatDeck(teammateHand)}`;
    }
}
//# sourceMappingURL=PlayerCollection.js.map