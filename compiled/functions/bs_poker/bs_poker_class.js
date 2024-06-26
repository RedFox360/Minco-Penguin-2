import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection, ComponentType, EmbedBuilder, userMention, } from "discord.js";
import { HandRank, } from "./bs_poker_types.js";
import { callInDeck, formatCall, highestCallInDeck, isHigher, parseCall, } from "./bs_poker_functions.js";
import { msToRelTimestamp, removeByValue, replyThenDelete, invalidNumber, median, handleMessageError, } from "../util.js";
import { createBasicDeck, formatCardSideways, formatDeck, } from "../basic_card_functions.js";
import { promisify } from "util";
import { bsPokerTeams, channelsWithActiveGames, prisma } from "../../main.js";
import { getProfile, updateProfile } from "../../prisma/models.js";
import { colors, spliceRandom } from "../util.js";
const sleep = promisify(setTimeout);
const customIds = {
    joinMidGame: "join_mid_game_bspoker",
    leaveMidGame: "leave_mid_game_bspoker",
    viewCards: "view_cards_bspoker",
    viewGameInfo: "view_game_info_bspoker",
    bs: "bs_bspoker",
};
const customIdValues = Object.values(customIds);
const timeToMakeCall = 60000;
const timeBetweenRounds = 12000;
const timeToTakeCard = 20000;
const joinMidGame = new ButtonBuilder()
    .setStyle(ButtonStyle.Success)
    .setLabel("Join")
    .setCustomId(customIds.joinMidGame);
const leaveMidGame = new ButtonBuilder()
    .setStyle(ButtonStyle.Danger)
    .setLabel("Leave")
    .setCustomId(customIds.leaveMidGame);
const viewCardsButton = new ButtonBuilder()
    .setCustomId(customIds.viewCards)
    .setLabel("View Cards")
    .setStyle(ButtonStyle.Secondary);
const viewGameInfoButton = new ButtonBuilder()
    .setCustomId(customIds.viewGameInfo)
    .setLabel("Game Info")
    .setStyle(ButtonStyle.Secondary);
const bsButton = new ButtonBuilder()
    .setCustomId(customIds.bs)
    .setLabel("BS")
    .setStyle(ButtonStyle.Danger);
const joinMidGameDisabled = new ButtonBuilder(joinMidGame.toJSON()).setDisabled(true);
const leaveMidGameDisabled = new ButtonBuilder(leaveMidGame.toJSON()).setDisabled(true);
const bsButtonDisabled = new ButtonBuilder(bsButton.toJSON()).setDisabled(true);
const nrRowJoin = new ActionRowBuilder().addComponents(joinMidGame, leaveMidGame);
const nrRowLeave = new ActionRowBuilder().addComponents(leaveMidGame);
const nrRowJoinDisabled = new ActionRowBuilder().addComponents(joinMidGameDisabled, leaveMidGameDisabled);
const nrRowLeaveDisabled = new ActionRowBuilder().addComponents(leaveMidGameDisabled);
class BSPoker {
    constructor(interaction, players, cardsToOut, startingBet, commonCardsAmount, jokerCount, insuranceCount, beginCards, allowJoinMidGame, playerLimit, useSpecialCards) {
        this.interaction = interaction;
        this.players = players;
        this.cardsToOut = cardsToOut;
        this.startingBet = startingBet;
        this.commonCardsAmount = commonCardsAmount;
        this.jokerCount = jokerCount;
        this.insuranceCount = insuranceCount;
        this.beginCards = beginCards;
        this.allowJoinMidGame = allowJoinMidGame;
        this.playerLimit = playerLimit;
        this.useSpecialCards = useSpecialCards;
        this.currentCall = null;
        this._currPlayerIdx = 0;
        this.playerWBJ = null;
        // States
        this.roundInProgress = false;
        this.callsOpen = true;
        this.bsCalled = false;
        this.aborted = false;
        this.bxOpen = false;
        this.round = 0;
        this.playersOut = [];
        this.playerHands = new Collection();
        this.playerCardsEntitled = new Map();
        this.commonCards = [];
        this.midGamePlayers = [];
        this.hostId = interaction.user.id;
        this.totalPlayers = players.length;
    }
    get currentPlayerIndex() {
        if (this._currPlayerIdx < 0 || this._currPlayerIdx >= this.players.length) {
            return 0;
        }
        else {
            return this._currPlayerIdx;
        }
    }
    get currentPlayer() {
        return this.players[this.currentPlayerIndex];
    }
    set currentPlayerIndex(newIdx) {
        if (newIdx < 0 || newIdx >= this.players.length) {
            this._currPlayerIdx = 0;
        }
        else {
            this._currPlayerIdx = newIdx;
        }
    }
    get pot() {
        return this.totalPlayers * this.startingBet;
    }
    currentDeck() {
        const currentDeck = [].concat(...Array.from(this.playerHands.values()));
        currentDeck.push(...this.commonCards);
        return currentDeck;
    }
    createDeck() {
        const deck = createBasicDeck();
        for (let i = 0; i < this.jokerCount; i++) {
            deck.push({ suit: "j", value: 1 });
        }
        if (this.useSpecialCards) {
            deck.push({ suit: "bj", value: 1 }, { suit: "rj", value: 1 });
        }
        for (let i = 0; i < this.insuranceCount; i++) {
            deck.push({ suit: "i", value: 15 });
        }
        return deck;
    }
    // Format Players with Special Cards
    formatPWSC() {
        if (!this.useSpecialCards)
            return "";
        if (this.playerHands.size === 0)
            return "";
        const pwsc = this.players.filter(p => this.playerHands.get(p).some(c => c.suit === "bj" || c.suit === "rj"));
        return `Players with special cards: ${pwsc.length === 0 ? "None" : pwsc.map(userMention).join(" ")}`;
    }
    getHandsEmbed(handsList, highestCall = null) {
        return new EmbedBuilder()
            .setTitle(`Hands from Last Round (${this.round})`) // this.round is 0-indexed, so do not subtract 1
            .setDescription(`Common Cards: ${this.commonCards.length === 0
            ? "None"
            : `\n${formatDeck(this.commonCards)}`}\n${handsList}${highestCall ? `\n\nHighest Call: **${highestCall}**` : ""}`)
            .setColor(colors.blurple);
    }
    async printAllHands() {
        const handsList = this.playerHands
            .map((hand, player) => {
            const teammates = this.displayPlayerTeammates(player);
            return `<@${player}>${teammates}\n${formatDeck(hand)}`;
        })
            .join("\n");
        this.interaction.channel
            .send({
            embeds: [this.getHandsEmbed(handsList)],
        })
            .then(handsMsg => {
            highestCallInDeck(this.currentDeck())
                .then(call => {
                handsMsg
                    .edit({
                    embeds: [this.getHandsEmbed(handsList, formatCall(call))],
                })
                    .catch(handleMessageError);
            })
                .catch(console.error);
        });
    }
    displayPlayerTeammates(p) {
        const teammates = bsPokerTeams
            .get(this.interaction.channelId)
            .find(t => t.includes(p))
            .filter(t => t !== p);
        if (teammates?.length > 0)
            return ` (Team: ${teammates.map(userMention).join(" ")})`;
        return "";
    }
    playersAndEntitled() {
        return this.players
            .map(p => {
            const cardsEntitled = this.playerCardsEntitled.get(p);
            if (cardsEntitled === 1)
                return `<@${p}>: 1 card`;
            return `<@${p}>: ${this.playerCardsEntitled.get(p)} cards`;
        })
            .join("\n");
    }
    displayOptions() {
        return `Cards to get out: **${this.cardsToOut}**
Jokers: **${this.jokerCount}** | Insurances: **${this.insuranceCount}**
Starting cards: **${this.beginCards}**
Common cards: **${this.commonCardsAmount === -1 ? "Median" : this.commonCardsAmount}**
Allow join mid-game: **${this.allowJoinMidGame ? "True" : "False"}**
Use special cards: **${this.useSpecialCards ? "True" : "False"}**`;
    }
    gameInfoEmbed() {
        const embed = new EmbedBuilder()
            .setTitle("Game Info")
            .setColor(colors.green)
            .setDescription(`Game Host: <@${this.hostId}>\n${this.betInfo()}`)
            .addFields({ name: "Players", value: this.playersAndEntitled() }, { name: "Options", value: this.displayOptions() });
        return embed;
    }
    betInfo() {
        return this.startingBet
            ? `Bet to Join: **${this.startingBet.toLocaleString()} MD** | Pot: **${this.pot.toLocaleString()} MD**\n`
            : "";
    }
    newRoundEmbed(waiting) {
        let commonCardsToDisplay = "";
        if (waiting) {
            if (this.round > 0) {
                commonCardsToDisplay = `will be shown ${this.roundBeginTimestamp}`;
            }
        }
        else if (this.commonCards.length > 0) {
            commonCardsToDisplay = `\n${formatDeck(this.commonCards)}`;
        }
        else {
            commonCardsToDisplay = "None";
        }
        const pwsc = waiting ? "" : this.formatPWSC();
        return {
            title: `New Round (${this.round + 1})`,
            description: `${this.betInfo()}Common Cards: ${commonCardsToDisplay}\n${pwsc}\n<@${this.currentPlayer}> will start the round.`,
            fields: [
                {
                    name: "Players",
                    value: this.playersAndEntitled(),
                },
            ],
            color: colors.green,
        };
    }
    forward() {
        this.currentPlayerIndex = this.currentPlayerIndex + 1;
    }
    async handleJoinLeave(buttonInteraction) {
        if (buttonInteraction.customId === customIds.joinMidGame) {
            if (this.players.includes(buttonInteraction.user.id)) {
                await buttonInteraction.reply({
                    content: "You are already in the game.",
                    ephemeral: true,
                });
                return;
            }
            if (this.playersOut.includes(buttonInteraction.user.id)) {
                await buttonInteraction.reply({
                    content: "You are out of this game, so you may not rejoin.",
                    ephemeral: true,
                });
                return;
            }
            if (this.players.length >= this.playerLimit) {
                await buttonInteraction.reply({
                    content: `Sorry, the player limit of ${this.playerLimit} has already been reached.`,
                    ephemeral: true,
                });
                return;
            }
            const joinerProfile = await getProfile(buttonInteraction.user.id);
            if (joinerProfile.mincoDollars < this.startingBet) {
                await buttonInteraction.reply({
                    content: `You do not have enough Minco Dollars to join this game (the bet is ${this.startingBet.toLocaleString()}).`,
                    ephemeral: true,
                });
                return;
            }
            const startingAmount = Math.max(...this.playerCardsEntitled.values());
            await this.addPlayerMidGame(buttonInteraction.user.id, startingAmount);
            let toSend = `${buttonInteraction.user}, you have joined the game at ${startingAmount} cards.`;
            if (this.startingBet)
                toSend += ` **${this.startingBet.toLocaleString()}** Minco Dollars have been deducted from your wallet.`;
            await buttonInteraction.reply({
                content: toSend,
            });
            this.newRoundMsg
                .edit({
                embeds: [this.newRoundEmbed(true)],
            })
                .catch(handleMessageError);
            return;
        }
        if (buttonInteraction.customId === customIds.leaveMidGame) {
            if (!this.players.includes(buttonInteraction.user.id)) {
                await buttonInteraction.reply({
                    content: "You are not in the game.",
                    ephemeral: true,
                });
                return;
            }
            let toAppend = "";
            removeByValue(this.players, buttonInteraction.user.id);
            if (buttonInteraction.user.id === this.interaction.user.id) {
                this.hostId = this.players[0]; // select the first player to become the host
                toAppend = ` Since they were the host, host privileges have been transferred to <@${this.hostId}>.`;
                return;
            }
            this.removePlayerFromGame(buttonInteraction.user.id);
            await buttonInteraction.reply({
                content: `${buttonInteraction.user} has left the game.${toAppend}`,
            });
            this.newRoundMsg
                .edit({
                embeds: [this.newRoundEmbed(true)],
            })
                .catch(handleMessageError);
            return;
        }
    }
    getNotifRow(disabled) {
        const row = new ActionRowBuilder().addComponents(viewCardsButton, viewGameInfoButton);
        if (this.currentCall)
            row.addComponents(disabled ? bsButtonDisabled : bsButton);
        return row;
    }
    validateAndRespond(call, message) {
        if (!call || invalidNumber(call.call) || call.call === -1) {
            // Call could not be parsed
            return false;
        }
        if (this.currentCall) {
            if (!isHigher(call, this.currentCall.call)) {
                message.reply({
                    content: `Your call is not higher than the current call (${formatCall(this.currentCall.call)}). Please try again.`,
                });
                return false;
            }
        }
        if (call.call === HandRank.DoublePair ||
            call.call === HandRank.DoubleTriple ||
            call.call === HandRank.FullHouse) {
            const highCards = call.high;
            if (highCards[0] === highCards[1]) {
                replyThenDelete(message, `Double pairs, triples, and full houses must have different values (Your call: ${formatCall(call)}). Please try again.`);
                return false;
            }
        }
        if (call.call === HandRank.TriplePair) {
            const highCards = call.high;
            if (highCards[0] === highCards[1] ||
                highCards[0] === highCards[2] ||
                highCards[1] === highCards[2]) {
                replyThenDelete(message, `Triple pairs must have 3 unique values (Your call: ${formatCall(call)}). Please try again.`);
                return false;
            }
        }
        if (call.call === HandRank.StraightFlush && call.high.value === 15) {
            replyThenDelete(message, `Sorry, but Insurance-High Straight Flushes are not allowed (Your call: ${formatCall(call)}). Please try again.`);
            return false;
        }
        if (call.call === HandRank.DoubleFlush) {
            const highCards = call.high;
            if (highCards[0].suit === highCards[1].suit) {
                replyThenDelete(message, `Double flushes must have different suits (Your call: ${formatCall(call)}). Please try again.`);
                return false;
            }
            if (this.insuranceCount < 2 &&
                highCards[0].value === highCards[1].value &&
                highCards[0].value === 15) {
                replyThenDelete(message, `There are not enough insurance cards in the deck for a double insurance call (Your call: ${formatCall(call)}). Please try again.`);
                return false;
            }
        }
        return true;
    }
    async endGameSuccess() {
        const winnerId = this.players[0];
        await updateProfile(winnerId, {
            mincoDollars: {
                increment: this.pot,
            },
            bsPokerWins: {
                increment: 1,
            },
            bsPokerRating: {
                increment: 1.0,
            },
        });
        const winnerMember = this.interaction.guild.members.cache.get(winnerId);
        const embed = new EmbedBuilder()
            .setTitle("Game Over!")
            .setDescription(`<@${winnerId}> has won the game${this.startingBet
            ? ` and the pot of **${this.pot.toLocaleString()} MD**`
            : ""}! Congratulations!`)
            .setColor(colors.green);
        if (winnerMember) {
            embed.setAuthor({
                name: winnerMember.displayName,
                iconURL: winnerMember.displayAvatarURL(),
            });
        }
        await this.interaction.channel.send({
            embeds: [embed],
        });
        this.end();
    }
    end() {
        this.msgColl.stop();
        this.mcompColl.stop();
        this.aborted = true;
        clearTimeout(this.bxTimeout);
        clearTimeout(this.notifTimeout);
        removeByValue(channelsWithActiveGames, this.interaction.channelId);
    }
    async abort() {
        await this.returnBets();
        this.end();
    }
    async blackJokerBS() {
        if (this.commonCards.length === 1) {
            await this.interaction.channel.send({
                content: `<@${this.playerWBJ}> had a black joker. There is 1 common card, so they will take it: **${formatCardSideways(this.commonCards[0])}**.`,
            });
            this.commonCards = [];
            this.handleBS();
            return;
        }
        const timeUpToTakeCard = msToRelTimestamp(timeToTakeCard);
        const commonCardsFormattedWithNumbers = this.commonCards
            .map((card, i) => `\`${i + 1}\` **${formatCardSideways(card)}**`)
            .join("\n");
        this.bxOpen = true;
        this.bxContent = `<@${this.playerWBJ}>, you had a black joker! You get to remove 1 common card from the deck.\n${commonCardsFormattedWithNumbers}`;
        this.bxMsg = await this.interaction.channel.send({
            content: this.bxContent +
                `\n*Please type the number of the card you want to remove* ${timeUpToTakeCard}.\nIf you do not want to take any card, type \`0\`.`,
        });
        // This will be handled in the main message collector in function gameLogic()
        this.bxTimeout = setTimeout(() => {
            if (this.bxOpen) {
                this.interaction.channel.send({
                    content: `<@${this.playerWBJ}> failed to take a card in time. They will not take any card.`,
                });
                this.bxOpen = false;
                this.handleBS();
            }
            this.disableBX(false);
        }, timeToTakeCard);
    }
    getMsgForNotif() {
        return `${this.currentCall
            ? `<@${this.currentCall.player}> has called **${formatCall(this.currentCall.call)}**.\n`
            : ""}<@${this.currentPlayer}>, it is your turn.`;
    }
    async sendNewNotif() {
        const timeUp = msToRelTimestamp(timeToMakeCall);
        const nt = this.getMsgForNotif();
        this.notifText = nt;
        const msg = await this.interaction.channel.send({
            content: nt + ` Please type your call ${timeUp}.`,
            components: [this.getNotifRow(false)],
        });
        this.notifTimeout = setTimeout(() => {
            if (this.aborted)
                return;
            msg
                .edit({
                content: nt,
                components: [this.getNotifRow(true)],
            })
                .catch(handleMessageError);
            this.interaction.channel.send({
                content: `<@${this.currentPlayer}> failed to make a call in time. They gain a card and a new round will start now.`,
            });
            this.playerCardsEntitled.set(this.currentPlayer, this.playerCardsEntitled.get(this.currentPlayer) + 1);
            this.newRound();
        }, timeToMakeCall);
        this.notification = msg;
    }
    disableNotif() {
        this.notification
            .edit({
            content: this.notifText,
            components: [this.getNotifRow(true)],
        })
            .catch(handleMessageError);
        clearTimeout(this.notifTimeout);
    }
    disableBX(clearTout = true) {
        this.bxMsg.edit({ content: this.bxContent }).catch(handleMessageError);
        this.bxOpen = false;
        if (clearTout)
            clearTimeout(this.bxTimeout);
    }
    updatePlayerRating(player) {
        if (this.midGamePlayers.includes(player))
            return;
        const rankOut = this.playersOut.length - 1;
        const rating = rankOut * (1 / (this.totalPlayers - 1));
        if (rating > 0)
            return updateProfile(player, {
                bsPokerRating: {
                    increment: rating,
                },
            });
    }
    removePlayerFromGame(player, index) {
        this.playerCardsEntitled.delete(player);
        if (index) {
            this.players.splice(index, 1);
        }
        else {
            removeByValue(this.players, player);
        }
        this.playersOut.push(player);
        this.updatePlayerRating(player);
        this.removePlayerFromTeams(player);
    }
    async addPlayerMidGame(player, cards) {
        this.players.push(player);
        this.removePlayerFromTeams(player);
        this.playerCardsEntitled.set(player, cards);
        this.removePlayerFromTeams(player);
        this.midGamePlayers.push(player);
        bsPokerTeams.get(this.interaction.channelId).push([player]);
        this.totalPlayers += 1;
        await updateProfile(player, {
            bsPokerGamesPlayed: {
                increment: 1,
            },
            mincoDollars: {
                decrement: this.startingBet,
            },
        });
    }
    removePlayerFromTeams(player) {
        bsPokerTeams.set(this.interaction.channel.id, bsPokerTeams
            .get(this.interaction.channel.id)
            .filter(t => !t.includes(player)));
    }
    removePlayersWithCardsAbove() {
        this.players.forEach((p, i) => {
            const entitled = this.playerCardsEntitled.get(p);
            if (entitled >= this.cardsToOut || invalidNumber(entitled) || !entitled) {
                this.interaction.channel.send(`<@${p}> is out of the game.`);
                this.removePlayerFromGame(p, i);
            }
        });
    }
    dealToPlayers(deck) {
        for (const p of this.players) {
            const hand = spliceRandom(deck, this.playerCardsEntitled.get(p));
            hand.sort((a, b) => a.value - b.value);
            this.playerHands.set(p, hand);
        }
    }
    async newRound() {
        clearTimeout(this.notifTimeout);
        clearTimeout(this.bxTimeout);
        this.roundInProgress = false;
        const deck = this.createDeck();
        if (this.round > 0 && this.playerHands.size > 0)
            this.printAllHands();
        // Remove players from game with cards >= cardsToOut
        this.removePlayersWithCardsAbove();
        // Only 1 player left -> handle win
        if (this.players.length <= 1) {
            await this.endGameSuccess();
            return;
        }
        this.roundBeginTimestamp = msToRelTimestamp(timeBetweenRounds);
        const acCCAmount = this.commonCardsAmount > 0
            ? this.commonCardsAmount
            : Math.floor(median(Array.from(this.playerCardsEntitled.values())));
        this.newRoundMsg = await this.interaction.channel.send({
            embeds: [this.newRoundEmbed(true)],
            components: this.round === 0
                ? []
                : this.allowJoinMidGame
                    ? [nrRowJoin]
                    : [nrRowLeave],
        });
        if (this.players.length <= 1) {
            await this.endGameSuccess();
            return;
        }
        // SET THE COMMON CARDS
        if (this.commonCardsAmount !== 0) {
            this.commonCards = spliceRandom(deck, acCCAmount);
            this.commonCards.sort((a, b) => a.value - b.value);
        }
        this.playerHands.clear();
        if (this.round > 0)
            await sleep(timeBetweenRounds); // wait before starting next round
        if (this.aborted)
            return;
        // check for 1 player again in case people left
        if (this.players.length <= 1) {
            await this.endGameSuccess();
            return;
        }
        // Remove duplicates from players
        this.players = [...new Set(this.players)];
        this.dealToPlayers(deck);
        this.newRoundMsg
            .edit({
            embeds: [this.newRoundEmbed(false)],
            components: this.round === 0
                ? []
                : this.allowJoinMidGame
                    ? [nrRowJoinDisabled]
                    : [nrRowLeaveDisabled],
        })
            .catch(handleMessageError);
        this.roundInProgress = true;
        this.bsCalled = false;
        this.round += 1;
        this.currentCall = null;
        this.sendNewNotif();
    }
    handleBS() {
        this.playerWBJ = null;
        const bserHand = this.playerHands.get(this.bser);
        const bserHasRJ = this.useSpecialCards && bserHand.some(card => card.suit === "rj");
        const callIsTrue = callInDeck(this.currentCall.call, this.currentDeck());
        let cardGainer = this.currentPlayer;
        if (callIsTrue) {
            cardGainer = this.bser;
            this.interaction.channel.send({
                content: `:green_circle: <@${this.currentCall.player}> was telling the truth! <@${cardGainer}> gains 1 card.`,
            });
            this.playerCardsEntitled.set(cardGainer, this.playerCardsEntitled.get(cardGainer) + 1);
        }
        else {
            this.interaction.channel.send({
                content: `:red_circle: <@${this.currentCall.player}> was lying! They gain 1 card.`,
            });
            cardGainer = this.currentCall.player;
            this.playerCardsEntitled.set(cardGainer, this.playerCardsEntitled.get(cardGainer) + 1);
            if (bserHasRJ && this.bser !== this.currentPlayer) {
                if (bserHand.length === 1) {
                    this.interaction.channel.send({
                        content: `<@${this.bser}> had a red joker and cross-BSed! However, they only had 1 card, so they do not lose any cards.`,
                    });
                }
                else {
                    this.interaction.channel.send({
                        content: `<@${this.bser}> had a red joker! Since they cross-BSed, they lose 1 card.`,
                    });
                    this.playerCardsEntitled.set(this.bser, this.playerCardsEntitled.get(this.bser) - 1);
                }
            }
        }
        this.currentPlayerIndex = this.players.indexOf(cardGainer);
        this.bser = null;
        this.newRound();
    }
    async takeBets() {
        await prisma.profile.updateMany({
            where: {
                userId: {
                    in: this.players,
                },
            },
            data: {
                mincoDollars: {
                    decrement: this.startingBet,
                },
                bsPokerGamesPlayed: {
                    increment: 1,
                },
            },
        });
    }
    async returnBets() {
        await prisma.profile.updateMany({
            where: {
                userId: {
                    in: this.players,
                },
            },
            data: {
                mincoDollars: {
                    increment: this.startingBet,
                },
                bsPokerGamesPlayed: {
                    decrement: 1,
                },
            },
        });
    }
    async messageCollect(msg) {
        if (msg.author.id === this.hostId &&
            msg.content.toLowerCase() === "abort") {
            await msg.reply({
                content: "Game aborted.",
            });
            await this.abort();
            return;
        }
        if (this.bxOpen && msg.author.id === this.playerWBJ) {
            const cardNumber = parseInt(msg.content);
            if (invalidNumber(cardNumber) ||
                cardNumber < 0 ||
                cardNumber > this.commonCards.length)
                return;
            if (cardNumber === 0) {
                await msg.reply({
                    content: "You have chosen not to take any card.",
                });
            }
            else {
                const card = this.commonCards.splice(cardNumber - 1, 1)[0];
                await msg.reply({
                    content: `You have taken the card **${formatCardSideways(card)}**.`,
                });
            }
            this.disableBX();
            this.handleBS();
            return;
        }
        if (!this.roundInProgress || !this.callsOpen)
            return;
        if (msg.author.id !== this.currentPlayer)
            return;
        const call = parseCall(msg.content);
        if (!this.validateAndRespond(call, msg))
            return;
        this.callsOpen = false;
        this.disableNotif();
        this.currentCall = { call, player: this.currentPlayer };
        this.forward(); // go to the next player with callsOpen remaining true.
        await this.sendNewNotif();
        this.callsOpen = true;
    }
    async buttonCollect(buttonInteraction) {
        if (!this.roundInProgress) {
            if (buttonInteraction.customId === customIds.viewCards ||
                buttonInteraction.customId === customIds.viewGameInfo ||
                buttonInteraction.customId === customIds.bs) {
                await buttonInteraction.reply({
                    content: "Please wait for the round to begin.",
                    ephemeral: true,
                });
                return;
            }
            this.handleJoinLeave(buttonInteraction);
            return;
        }
        const cd = this.currentDeck();
        if (!cd || cd.length === 0)
            return;
        const buttonClickerIsPlayer = this.players.includes(buttonInteraction.user.id);
        if (buttonInteraction.customId === customIds.viewCards) {
            if (!buttonClickerIsPlayer) {
                let toSendN = "*You are not a player in this game.*";
                if (this.commonCards.length > 0)
                    toSendN += `\nCommon Cards:\n${formatDeck(this.commonCards)}`;
                const channelTeams = bsPokerTeams.get(this.interaction.channelId);
                toSendN += (() => {
                    if (channelTeams.length === 0)
                        return "";
                    const team = channelTeams.find(t => t.includes(buttonInteraction.user.id));
                    if (!team)
                        return "";
                    const teamPlayerInGame = team.find(p => this.players.includes(p));
                    if (!teamPlayerInGame)
                        return "";
                    const teammateHand = this.playerHands.get(teamPlayerInGame);
                    if (!teammateHand)
                        return "";
                    return `\n*<@${teamPlayerInGame}> is your teammate. Here are their cards.*\n${formatDeck(teammateHand)}`;
                })();
                if (this.useSpecialCards)
                    toSendN += `\n${this.formatPWSC()}`;
                await buttonInteraction.reply({
                    content: toSendN,
                    ephemeral: true,
                });
                return;
            }
            await buttonInteraction.reply({
                content: `**Your Hand:**\n${formatDeck(this.playerHands.get(buttonInteraction.user.id))}\n**Common Cards:** ${this.commonCards.length === 0
                    ? "None"
                    : `\n${formatDeck(this.commonCards)}`}${this.useSpecialCards ? `\n\n${this.formatPWSC()}` : ""}`,
                ephemeral: true,
            });
            return;
        }
        if (buttonInteraction.customId === customIds.viewGameInfo) {
            await buttonInteraction.reply({
                embeds: [this.gameInfoEmbed()],
                ephemeral: true,
            });
            return;
        }
        // BS button
        if (buttonInteraction.customId !== customIds.bs)
            return;
        if (!this.callsOpen) {
            await buttonInteraction.reply({
                content: "The buttons have not finished loading. Please try again.",
                ephemeral: true,
            });
            return;
        }
        if (!buttonClickerIsPlayer) {
            await buttonInteraction.reply({
                content: "You may not BS as you are not a player in this game.",
                ephemeral: true,
            });
            return;
        }
        if (this.bsCalled) {
            await buttonInteraction.reply({
                content: "Sorry, another player seems to have pressed the BS button before you.",
                ephemeral: true,
            });
            return;
        }
        if (buttonInteraction.user.id === this.currentCall.player) {
            await buttonInteraction.reply({
                content: "You may not call BS on your own call.",
                ephemeral: true,
            });
            return;
        }
        this.bsCalled = true;
        this.disableNotif();
        await buttonInteraction.reply({
            content: `BS called by <@${buttonInteraction.user.id}>!`,
        });
        this.bser = buttonInteraction.user.id;
        const playerWBJ = this.playerHands
            .filter(hand => hand.some(card => card.suit === "bj"))
            .firstKey();
        // If the player has a black joker
        if (playerWBJ &&
            playerWBJ !== this.currentCall.player &&
            this.commonCards.length > 0) {
            this.playerWBJ = playerWBJ;
            await this.blackJokerBS();
        }
        else {
            this.handleBS();
        }
    }
    async gameLogic() {
        this.msgColl = this.interaction.channel.createMessageCollector({
            time: 3600000,
        });
        this.mcompColl = this.interaction.channel.createMessageComponentCollector({
            time: 3600000,
            componentType: ComponentType.Button,
            filter: i => customIdValues.includes(i.customId),
        });
        for (const p of this.players) {
            this.playerCardsEntitled.set(p, this.beginCards);
        }
        await this.takeBets();
        await this.newRound(); // start the game with the 1st round
        this.msgColl.on("collect", async (m) => {
            this.messageCollect(m);
        });
        this.mcompColl.on("collect", async (bi) => {
            this.buttonCollect(bi);
        });
    }
}
export default BSPoker;
//# sourceMappingURL=bs_poker_class.js.map