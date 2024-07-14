import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, } from "discord.js";
import { ClownState, customIds, customIdValues, } from "../bs_poker_types.js";
import { callInDeck, formatCall, highestCallInDeck, parseCall, } from "../bs_poker_functions.js";
import { msToRelTimestamp, replyThenDelete, invalidNumber, median, } from "../../util.js";
import { formatCardSideways, formatDeck, } from "../../cards/basic_card_functions.js";
import { bsPokerTeams, channelsWithActiveGames, prisma, } from "../../../main.js";
import { getProfile, updateProfile } from "../../../prisma/models.js";
import { colors, spliceRandom, sleep } from "../../util.js";
import { emojiRaw } from "../../cards/basic_card_types.js";
import CallValidator from "./CallValidator.js";
import StateManager from "./StateManager.js";
import NotificationManager from "./NotificationManager.js";
import PlayerCollection from "./PlayerCollection.js";
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
const clownButton = new ButtonBuilder()
    .setCustomId(customIds.clown)
    .setLabel("Clown")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(emojiRaw.clown);
const clownRow = new ActionRowBuilder().addComponents(clownButton);
const createCurseEmbed = (x = "") => new EmbedBuilder()
    .setColor(colors.red)
    .setTitle("Curse activated!")
    .setDescription(`The previous 3 calls were all false.\nEveryone will gain a card and a new round will start now.${x}`);
const joinMidGameDisabled = new ButtonBuilder(joinMidGame.toJSON()).setDisabled(true);
const leaveMidGameDisabled = new ButtonBuilder(leaveMidGame.toJSON()).setDisabled(true);
const nrRowJoin = new ActionRowBuilder().addComponents(joinMidGame, leaveMidGame);
const nrRowLeave = new ActionRowBuilder().addComponents(leaveMidGame);
const nrRowJoinDisabled = new ActionRowBuilder().addComponents(joinMidGameDisabled, leaveMidGameDisabled);
const nrRowLeaveDisabled = new ActionRowBuilder().addComponents(leaveMidGameDisabled);
const kickRegex = /^kick <@\d+>/;
class BSPoker {
    constructor(interaction, playerIds, options) {
        this.interaction = interaction;
        this.options = options;
        this.commonCards = [];
        this.players = PlayerCollection.fromIds(playerIds, this.interaction.channelId, options);
        this.hostId = interaction.user.id;
        this.state = new StateManager(this.players);
        this.callValidator = new CallValidator(options, this.state);
        this.notifications = new NotificationManager(interaction.channel, this.state);
    }
    get newRoundComponents() {
        if (this.state.round === 0)
            return [];
        if (this.options.allowJoinMidGame)
            return [nrRowJoin];
        return [nrRowLeave];
    }
    get pot() {
        return this.players.everPlayersLen * this.options.startingBet;
    }
    get currentDeck() {
        const deck = this.players.hands.flat(1);
        deck.push(...this.commonCards);
        return deck;
    }
    async sendNewNotif() {
        await this.notifications.sendNewNotif(() => {
            this.newRound();
        });
    }
    getHandsEmbed(handsList, highestCall) {
        return new EmbedBuilder()
            .setTitle(`Hands from Last Round (${this.state.round})`) // this.round is 0-indexed, so do not subtract 1
            .setDescription(`Common Cards: ${this.commonCards.length === 0
            ? "None"
            : `\n${formatDeck(this.commonCards)}`}\n${handsList}${highestCall ? `\n\nHighest Call: **${highestCall}**` : ""}`)
            .setColor(colors.blurple);
    }
    async printAllHands() {
        const handsList = this.players
            .map(player => {
            const teammates = player.displayTeammates();
            return `<@${player.id}>${teammates}\n${player.formatHand()}`;
        })
            .join("\n");
        this.interaction.channel
            .send({
            embeds: [this.getHandsEmbed(handsList)],
        })
            .then(handsMsg => {
            highestCallInDeck(this.currentDeck, this.options.nonStandard, this.options.insuranceCount)
                .then(call => {
                handsMsg.edit({
                    embeds: [this.getHandsEmbed(handsList, formatCall(call))],
                });
            })
                .catch(console.error);
        });
    }
    gameInfoEmbed() {
        const embed = new EmbedBuilder()
            .setTitle("Game Info")
            .setColor(colors.green)
            .setDescription(`Game Host: <@${this.hostId}>\n${this.betInfo()}`)
            .addFields({ name: "Players", value: this.players.displayEntitled() }, { name: "Options", value: this.options.display() });
        return embed;
    }
    betInfo() {
        return this.options.startingBet
            ? `Bet to Join: **${this.options.startingBet.toLocaleString()} MD** | Pot: **${this.pot.toLocaleString()} MD**\n`
            : "";
    }
    newRoundEmbed(waiting) {
        let commonCardsToDisplay = "";
        if (waiting) {
            if (this.state.round > 0) {
                commonCardsToDisplay = `The round will begin ${this.roundBeginTimestamp}`;
            }
        }
        else if (this.commonCards.length > 0) {
            commonCardsToDisplay = `Common Cards:\n${formatDeck(this.commonCards)}`;
        }
        else {
            commonCardsToDisplay = "Common Cards: None";
        }
        const pwsc = waiting ? "" : this.players.formatPWSC();
        return {
            title: `New Round (${this.state.round + 1})`,
            description: `${this.betInfo()}${commonCardsToDisplay}\n${pwsc}\n${this.state.currentPlayer} will start the round.`,
            fields: [
                {
                    name: "Players",
                    value: this.players.displayEntitled(),
                },
            ],
            color: colors.green,
        };
    }
    async handleJoinMidGame(buttonInteraction) {
        if (this.players.has(buttonInteraction.user.id)) {
            await buttonInteraction.reply({
                content: "You are already in the game.",
                ephemeral: true,
            });
            return;
        }
        if (this.players.out.includes(buttonInteraction.user.id)) {
            await buttonInteraction.reply({
                content: "You are out of this game, so you may not rejoin.",
                ephemeral: true,
            });
            return;
        }
        if (this.players.size >= this.options.playerLimit) {
            await buttonInteraction.reply({
                content: `Sorry, the player limit of ${this.options.playerLimit} has already been reached.`,
                ephemeral: true,
            });
            return;
        }
        if (this.options.startingBet) {
            const joinerProfile = await getProfile(buttonInteraction.user.id);
            if (joinerProfile.mincoDollars < this.options.startingBet) {
                await buttonInteraction.reply({
                    content: `You do not have enough Minco Dollars to join this game (the bet is ${this.options.startingBet.toLocaleString()}).`,
                    ephemeral: true,
                });
                return;
            }
        }
        const startingAmount = Math.max(...this.players.cardsEntitled);
        await this.players.addPlayerMidGame(buttonInteraction.user.id, startingAmount);
        let toSend = `${buttonInteraction.user}, you have joined the game at ${startingAmount} cards.`;
        if (this.options.startingBet)
            toSend += ` **${this.options.startingBet.toLocaleString()}** Minco Dollars have been deducted from your wallet.`;
        buttonInteraction.reply({
            content: toSend,
        });
        buttonInteraction.message.edit({
            embeds: [this.newRoundEmbed(true)],
        });
        return;
    }
    async handleLeaveMidGame(buttonInteraction) {
        if (!this.players.has(buttonInteraction.user.id)) {
            await buttonInteraction.reply({
                content: "You are not in the game.",
                ephemeral: true,
            });
            return;
        }
        let toAppend = "";
        if (buttonInteraction.user.id === this.hostId) {
            this.hostId = this.players[0].id; // select the first player to become the host
            toAppend = ` Since they were the host, host privileges have been transferred to <@${this.hostId}>.`;
            return;
        }
        this.players.removePlayers(buttonInteraction.user.id);
        buttonInteraction.reply({
            content: `${buttonInteraction.user} has left the game.${toAppend}`,
        });
        buttonInteraction.message.edit({
            embeds: [this.newRoundEmbed(true)],
        });
        return;
    }
    async endGameSuccess() {
        if (this.players.size === 0) {
            let description = "Everyone lost the game due to a curse!";
            if (this.options.startingBet)
                description += "\nThe pot will not be given to any player.";
            const noWinnerEmbed = new EmbedBuilder()
                .setTitle("Game Over: Cursed!")
                .setDescription(description)
                .setColor(colors.red);
            await this.interaction.channel.send({
                embeds: [noWinnerEmbed],
            });
            return;
        }
        const winner = this.players.first();
        if (winner.joinedMidGame || this.players.originalPlayersLen === 2) {
            if (this.options.startingBet) {
                await updateProfile(winner.id, {
                    mincoDollars: {
                        increment: this.pot,
                    },
                });
            }
        }
        else {
            await updateProfile(winner.id, {
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
        }
        const embed = new EmbedBuilder()
            .setTitle("Game Over!")
            .setDescription(`${winner} has won the game${this.options.startingBet
            ? ` and the pot of **${this.pot.toLocaleString()} MD**`
            : ""}! Congratulations!`)
            .setColor(colors.green);
        const winnerMember = this.interaction.guild.members.cache.get(winner.id);
        if (winnerMember) {
            embed.setAuthor({
                name: winnerMember.displayName,
                iconURL: winnerMember.displayAvatarURL(),
            });
        }
        await this.interaction.channel.send({
            embeds: [embed],
        });
        this.endCollectors();
    }
    endCollectors() {
        this.msgColl.stop();
        this.mcompColl.stop();
        // abort handled in the end of msgColl
    }
    async abort() {
        await this.returnBets();
        this.endCollectors();
    }
    async blackJokerBS(playerWBJ, bserId) {
        const timeUpToTakeCard = msToRelTimestamp(timeToTakeCard);
        const commonCardsFormattedWithNumbers = this.commonCards
            .map((card, i) => `\`${i + 1}\` **${formatCardSideways(card)}**`)
            .join("\n");
        const bxContent = `${playerWBJ}, you had a black joker! You get to remove 1 common card from the deck.\n${commonCardsFormattedWithNumbers}`;
        const bxMsg = await this.interaction.channel.send({
            content: bxContent +
                `\n*Please type the number of the card you want to remove* ${timeUpToTakeCard}.\nIf you do not want to take any card, type \`0\`.`,
        });
        this.interaction.channel
            .awaitMessages({
            max: 1,
            idle: 0,
            time: timeToTakeCard,
            filter: msg => {
                if (msg.author.id !== playerWBJ.id)
                    return false;
                const cardNumber = parseInt(msg.content);
                return (!invalidNumber(cardNumber) &&
                    cardNumber >= 0 &&
                    cardNumber <= this.commonCards.length);
            },
        })
            .then(messages => {
            const msg = messages.first();
            const cardNumber = parseInt(msg.content);
            if (cardNumber === 0) {
                msg.reply({
                    content: "You have chosen not to take any card.",
                });
            }
            else {
                const card = this.commonCards.splice(cardNumber - 1, 1)[0];
                msg.reply({
                    content: `You have taken the card **${formatCardSideways(card)}**.`,
                });
            }
        })
            .catch(() => {
            this.interaction.channel.send({
                content: `${playerWBJ} failed to take a card in time. They will not take any card.`,
            });
        })
            .finally(() => {
            bxMsg.edit({ content: bxContent });
            this.handleBS(bserId);
        });
    }
    removePlayersWithCardsAbove() {
        const playersToRemove = [];
        for (const p of this.players.values()) {
            const entitled = p.cardsEntitled;
            if (entitled >= this.options.cardsToOut ||
                invalidNumber(entitled) ||
                !entitled) {
                this.interaction.channel.send(`${p} is out of the game.`);
                playersToRemove.push(p.id);
            }
        }
        this.players.removePlayers(...playersToRemove);
    }
    calculateCommonCards() {
        if (this.options.commonCards === -1) {
            return Math.floor(median(this.players.cardsEntitled));
        }
        else {
            return this.options.commonCards;
        }
    }
    async newRound() {
        this.notifications.clearNotifTimeout();
        this.state.roundInProgress = false;
        const deck = this.options.createDeck();
        if (this.state.round !== 0)
            this.printAllHands();
        // Remove players from game with cards >= cardsToOut
        this.removePlayersWithCardsAbove();
        // Only 1 player left -> handle win
        if (this.players.size <= 1) {
            await this.endGameSuccess();
            return;
        }
        this.roundBeginTimestamp = msToRelTimestamp(timeBetweenRounds);
        const acCCAmount = this.calculateCommonCards();
        const newRoundMsg = await this.interaction.channel.send({
            embeds: [this.newRoundEmbed(true)],
            components: this.newRoundComponents,
        });
        // SET THE COMMON CARDS
        if (this.options.commonCards !== 0) {
            this.commonCards = spliceRandom(deck, acCCAmount);
            this.commonCards.sort((a, b) => a.value - b.value);
        }
        if (this.state.round > 0)
            await sleep(timeBetweenRounds); // wait before starting next round
        if (this.state.aborted)
            return;
        // check for 1 player again in case people left
        if (this.players.size <= 1) {
            await this.endGameSuccess();
            return;
        }
        this.players.deal(deck);
        newRoundMsg.edit({
            embeds: [this.newRoundEmbed(false)],
            components: this.state.round === 0
                ? []
                : this.options.allowJoinMidGame
                    ? [nrRowJoinDisabled]
                    : [nrRowLeaveDisabled],
        });
        this.state.reset();
        this.state.nextRound();
        this.sendNewNotif();
    }
    handleBS(bserId) {
        const bser = this.players.get(bserId);
        const bserHasRJ = this.options.useSpecialCards &&
            !this.options.useClown &&
            bser.hand.some(card => card.suit === "rj");
        const callIsTrue = callInDeck(this.state.currentCall.call, this.currentDeck);
        let cardGainer = this.state.currentPlayer;
        if (callIsTrue) {
            cardGainer = bser;
            this.interaction.channel.send({
                content: `:green_circle: ${this.state.currentCall.player} was telling the truth! ${cardGainer} gains 1 card.`,
            });
            cardGainer.cardsEntitled += 1;
        }
        else {
            this.interaction.channel.send({
                content: `:red_circle: ${this.state.currentCall.player} was lying! They gain 1 card.`,
            });
            cardGainer = this.state.currentCall.player;
            cardGainer.cardsEntitled += 1;
            if (bserHasRJ && bserId !== this.state.currentPlayer.id) {
                if (bser.hand.length === 1) {
                    this.interaction.channel.send({
                        content: `<@${bserId}> had a red joker and cross-BSed! However, they only had 1 card, so they do not lose any cards.`,
                    });
                }
                else {
                    this.interaction.channel.send({
                        content: `<@${bserId}> had a red joker! Since they cross-BSed, they lose 1 card.`,
                    });
                    bser.cardsEntitled += 1;
                }
            }
        }
        this.state.setIdxToIdxOf(cardGainer.id);
        this.newRound();
    }
    async takeBets() {
        if (this.players.size === 2) {
            if (!this.options.startingBet)
                return;
            await prisma.profile.updateMany({
                where: {
                    userId: {
                        in: this.players.ids,
                    },
                },
                data: {
                    mincoDollars: {
                        decrement: this.options.startingBet,
                    },
                },
            });
            return;
        }
        await prisma.profile.updateMany({
            where: {
                userId: {
                    in: this.players.ids,
                },
            },
            data: {
                mincoDollars: {
                    decrement: this.options.startingBet,
                },
                bsPokerGamesPlayed: {
                    increment: 1,
                },
            },
        });
    }
    async returnBets() {
        if (this.players.originalPlayersLen === 2) {
            if (!this.options.startingBet)
                return;
            await prisma.profile.updateMany({
                where: {
                    userId: {
                        in: this.players.ids,
                    },
                },
                data: {
                    mincoDollars: {
                        increment: this.options.startingBet,
                    },
                },
            });
            return;
        }
        await prisma.profile.updateMany({
            where: {
                userId: {
                    in: this.players.ids,
                },
            },
            data: {
                mincoDollars: {
                    increment: this.options.startingBet,
                },
                bsPokerGamesPlayed: {
                    decrement: 1,
                },
            },
        });
    }
    async kickPlayer(msg) {
        const kickId = msg.mentions.users.firstKey();
        if (!kickId)
            return;
        if (!this.players.has(kickId)) {
            replyThenDelete(msg, "That player is not in the game.");
            return;
        }
        if (kickId === msg.author.id) {
            replyThenDelete(msg, "You may not kick yourself from the game.");
            return;
        }
        this.state.callsOpen = false;
        const currentPlayerBeforeKick = this.state.currentPlayer.id;
        this.players.removePlayers(kickId);
        msg.reply(`<@${kickId}> has been kicked from the game.`);
        if (this.players.size === 1) {
            this.newRound();
            return;
        }
        if (currentPlayerBeforeKick === kickId) {
            this.notifications.disableNotif();
            await this.sendNewNotif();
        }
        this.state.callsOpen = true;
    }
    handleCurses() {
        const callIsTrue = callInDeck(this.state.currentCall.call, this.currentDeck);
        this.state.addToTracker(callIsTrue);
        if (this.state.lastThreeCallTracker.every(x => x === false)) {
            this.interaction.channel.send({
                content: `${this.state.currentPlayer} has called **${this.state.formatCurrentCall()}**.`,
            });
            let playerWRJ;
            if (this.options.useBloodJoker && !this.options.useClown) {
                playerWRJ = this.players.find(player => player.hand.some(card => card.suit === "rj")).id;
            }
            let had1Card = false;
            for (const player of this.players.values()) {
                if (playerWRJ && player.id === playerWRJ) {
                    if (player.cardsEntitled === 1) {
                        had1Card = true;
                    }
                    else {
                        player.cardsEntitled -= 1;
                    }
                }
                else {
                    player.cardsEntitled += 1;
                }
            }
            const extraDescription = playerWRJ
                ? had1Card
                    ? `\n<@${playerWRJ}> had a Blood Joker, but they only had 1 card, so they do not lose any cards.`
                    : `\n<@${playerWRJ}> had a Blood Joker, so they lose a card.`
                : "";
            this.interaction.channel.send({
                embeds: [createCurseEmbed(extraDescription)],
            });
            this.newRound();
            return true;
        }
        return false;
    }
    async bsButtonClicked(buttonInteraction) {
        if (!this.state.callsOpen) {
            await buttonInteraction.reply({
                content: "The buttons have not finished loading. Please try again.",
                ephemeral: true,
            });
            return;
        }
        if (this.state.bsCalled) {
            await buttonInteraction.reply({
                content: "Sorry, another player seems to have pressed the BS button before you.",
                ephemeral: true,
            });
            return;
        }
        if (buttonInteraction.user.id === this.state.currentCall.player.id) {
            await buttonInteraction.reply({
                content: "You may not call BS on your own call.",
                ephemeral: true,
            });
            return;
        }
        this.state.bsCalled = true;
        this.notifications.disableNotif();
        await buttonInteraction.reply({
            content: `BS called by ${buttonInteraction.user}!`,
        });
        const playerWBJ = this.players.find(player => player.hand.some(card => card.suit === "bj"));
        // If the player has a black joker
        this.state.roundInProgress = false;
        if (playerWBJ &&
            playerWBJ.id !== this.state.currentCall.player.id &&
            this.commonCards.length > 0) {
            await this.blackJokerBS(playerWBJ, buttonInteraction.user.id);
        }
        else {
            this.handleBS(buttonInteraction.user.id);
        }
    }
    async viewCardsClicked(buttonInteraction, isPlayer) {
        const buttonPlayer = this.players.get(buttonInteraction.user.id);
        if (!isPlayer || !buttonPlayer.hand) {
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
                const teamPlayerInGameId = team[0];
                if (!this.players.has(teamPlayerInGameId))
                    return "";
                const teammateHand = this.players.get(teamPlayerInGameId).hand;
                if (!teammateHand)
                    return "";
                return `\n*<@${teamPlayerInGameId}> is your teammate. Here are their cards.*\n${formatDeck(teammateHand)}`;
            })();
            if (this.options.useSpecialCards)
                toSendN += `\n${this.players.formatPWSC()}`;
            await buttonInteraction.reply({
                content: toSendN,
                ephemeral: true,
            });
            return;
        }
        const hasClown = this.options.useClown &&
            this.state.clowned === ClownState.NotClowned &&
            buttonPlayer.hand.some(card => card.suit === "rj");
        const components = hasClown ? [clownRow] : undefined;
        await buttonInteraction.reply({
            content: `**Your Hand:**\n${buttonPlayer.formatHand()}\n**Common Cards:** ${this.commonCards.length === 0
                ? "None"
                : `\n${formatDeck(this.commonCards)}`}${this.options.useSpecialCards ? `\n${this.players.formatPWSC()}` : ""}`,
            ephemeral: true,
            components,
        });
    }
    async clownClicked(buttonInteraction) {
        const buttonPlayer = this.players.get(buttonInteraction.user.id);
        if (!buttonPlayer || !buttonPlayer.hand) {
            await buttonInteraction.reply({
                content: "You are not in the game.",
                ephemeral: true,
            });
            return;
        }
        const hasClownCard = buttonPlayer.hand.some(card => card.suit === "rj");
        if (!hasClownCard) {
            await buttonInteraction.reply({
                content: "You do not have a Clown Joker in your hand.",
                ephemeral: true,
            });
            return;
        }
        if (this.players.size === 2) {
            await buttonInteraction.reply({
                content: "You may not use your Clown Joker when there are only 2 players.",
                ephemeral: true,
            });
            return;
        }
        if (this.state.clowned !== ClownState.NotClowned) {
            await buttonInteraction.reply({
                content: "The Clown Joker has already been used this round.",
                ephemeral: true,
            });
            return;
        }
        this.players.reverse();
        this.state.reverseIdx();
        this.state.clowned = ClownState.Clowned;
        await buttonInteraction.reply({
            content: `${buttonInteraction.user} has used their Clown Joker.\nThe order of players has been reversed.`,
        });
    }
    async messageCollect(msg) {
        if (msg.author.id === this.hostId) {
            const content = msg.content.toLowerCase();
            if (content === "abort") {
                await msg.reply({
                    content: "Game aborted.",
                });
                await this.abort();
                return;
            }
            if (kickRegex.test(content)) {
                await this.kickPlayer(msg);
                return;
            }
        }
        if (!this.state.roundInProgress || !this.state.callsOpen)
            return;
        if (msg.author.id !== this.state.currentPlayer.id)
            return;
        const call = parseCall(msg.content);
        if (!this.callValidator.validateAndRespond(call, msg))
            return;
        this.state.callsOpen = false;
        this.notifications.disableNotif();
        this.state.currentCall = { call, player: this.state.currentPlayer };
        if (this.options.useCurses && this.players.size > 2) {
            const cursed = this.handleCurses();
            if (cursed)
                return;
        }
        if (this.state.clowned === ClownState.Clowned) {
            this.state.clowned = ClownState.ClownedAndCalled;
        }
        this.state.forward(); // go to the next player with callsOpen remaining true.
        await this.sendNewNotif();
        this.state.callsOpen = true;
    }
    async buttonCollect(buttonInteraction) {
        if (buttonInteraction.customId === customIds.viewGameInfo) {
            await buttonInteraction.reply({
                embeds: [this.gameInfoEmbed()],
                ephemeral: true,
            });
            return;
        }
        if (!this.state.roundInProgress) {
            if (buttonInteraction.customId === customIds.joinMidGame) {
                this.handleJoinMidGame(buttonInteraction);
            }
            else if (buttonInteraction.customId === customIds.leaveMidGame) {
                this.handleLeaveMidGame(buttonInteraction);
            }
            else {
                await buttonInteraction.reply({
                    content: "Please wait for the round to begin.",
                    ephemeral: true,
                });
            }
            return;
        }
        const buttonClickerIsPlayer = this.players.has(buttonInteraction.user.id);
        if (buttonInteraction.customId === customIds.viewCards) {
            await this.viewCardsClicked(buttonInteraction, buttonClickerIsPlayer);
        }
        else if (buttonInteraction.customId === customIds.bs) {
            if (!buttonClickerIsPlayer) {
                await buttonInteraction.reply({
                    content: "You may not BS as you are not a player in this game.",
                    ephemeral: true,
                });
                return;
            }
            await this.bsButtonClicked(buttonInteraction);
        }
        else if (buttonInteraction.customId === customIds.clown) {
            await this.clownClicked(buttonInteraction);
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
        for (const p of this.players.values()) {
            p.cardsEntitled = this.options.beginCards;
        }
        await this.takeBets();
        await this.newRound(); // start the game with the 1st round
        this.msgColl.on("collect", async (m) => {
            this.messageCollect(m);
        });
        this.mcompColl.on("collect", async (bi) => {
            this.buttonCollect(bi);
        });
        this.msgColl.on("end", () => {
            this.state.aborted = true;
            this.notifications.clearNotifTimeout();
            channelsWithActiveGames.delete(this.interaction.channelId);
        });
    }
}
export default BSPoker;
//# sourceMappingURL=BSPokerGame.js.map