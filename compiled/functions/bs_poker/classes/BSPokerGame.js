import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, } from "discord.js";
import { ClownState, customIds, customIdValues, } from "../bs_poker_types.js";
import { callInDeck, formatCall, highestCallInDeck, parseCall, } from "../bs_poker_functions.js";
import { msToRelTimestamp, replyThenDelete, invalidNumber, median, hasAdminForGames, } from "../../util.js";
import { cardToEmoji, formatCardSideways, formatDeck, formatDeckLines, } from "../../cards/basic_card_functions.js";
import { bsPokerTeams, channelsWithActiveGames } from "../../../main.js";
import { getProfile, updateProfile } from "../../../prisma/models.js";
import { colors, spliceRandom, sleep } from "../../util.js";
import { emoji, emojiRaw } from "../../cards/basic_card_types.js";
import CallValidator from "./CallValidator.js";
import StateManager from "./StateManager.js";
import NotificationManager from "./NotificationManager.js";
import PlayerCollection from "./PlayerCollection.js";
const timeBetweenRounds = 12000;
const timeToTakeCard = 30000;
const gameLength = 3600000;
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
const createCurseEmbed = (extraDescription = "") => new EmbedBuilder()
    .setColor(colors.red)
    .setTitle("Curse activated!")
    .setDescription(`The previous 3 calls were all false.\nEveryone will gain a card and a new round will start now.${extraDescription}`);
const joinMidGameDisabled = new ButtonBuilder(joinMidGame.toJSON()).setDisabled(true);
const leaveMidGameDisabled = new ButtonBuilder(leaveMidGame.toJSON()).setDisabled(true);
const nrRowJoin = new ActionRowBuilder().addComponents(joinMidGame, leaveMidGame);
const nrRowLeave = new ActionRowBuilder().addComponents(leaveMidGame);
const nrRowJoinDisabled = new ActionRowBuilder().addComponents(joinMidGameDisabled, leaveMidGameDisabled);
const nrRowLeaveDisabled = new ActionRowBuilder().addComponents(leaveMidGameDisabled);
const kickRegex = /^kick <@\d+>/;
export default class BSPoker {
    constructor(channel, hostId, playerIds, options) {
        this.channel = channel;
        this.hostId = hostId;
        this.options = options;
        this.commonCards = [];
        this.players = PlayerCollection.fromIds(playerIds, channel.id, options, this.options.beginCards);
        this.state = new StateManager();
        this.callValidator = new CallValidator(options, this.state, this.players);
        this.notifications = new NotificationManager(channel, this.state, this.players);
    }
    get newRoundComponents() {
        return this.options.allowJoinMidGame ? [nrRowJoin] : [nrRowLeave];
    }
    get newRoundDisabledComponents() {
        return this.options.allowJoinMidGame
            ? [nrRowJoinDisabled]
            : [nrRowLeaveDisabled];
    }
    get pot() {
        return this.players.everPlayersLen * this.options.startingBet;
    }
    formatCommonCards() {
        return this.commonCards?.length
            ? `\n${formatDeck(this.commonCards)}`
            : "None";
    }
    formatCommonCardsWithHighest() {
        const commonCardLines = formatDeckLines(this.commonCards);
        const cardEmojis = cardToEmoji(this.players?.highestCard);
        if (cardEmojis) {
            commonCardLines[0].push(" ", cardEmojis[0]);
            commonCardLines[1].push(" ", cardEmojis[1]);
        }
        return `\n${commonCardLines[0].join(" ")}\n${commonCardLines[1].join(" ")}`;
    }
    formatCommonCardsWithName(highest = false) {
        if (highest) {
            const title = this.commonCards?.length
                ? "**Common Cards** & Highest Card:"
                : "**Highest Card:**";
            return `${title} ${this.formatCommonCardsWithHighest()}`;
        }
        return `**Common Cards:** ${this.formatCommonCards()}`;
    }
    getCurrentDeck() {
        const deck = this.players.hands.flat(1);
        deck.push(...this.commonCards);
        return deck;
    }
    async sendNewNotif() {
        await this.notifications.sendNewNotif(() => {
            this.newRound();
        });
    }
    getHandsEmbed() {
        const handsList = this.players
            .map(player => {
            const teammates = player.displayTeammates();
            return `${player}${teammates}\n${player.formatHand()}`;
        })
            .join("\n");
        return {
            title: `Hands from Last Round (${this.state.round})`, // this.round is 0-indexed, so do not subtract 1
            description: `Common Cards: ${this.formatCommonCards()}
${handsList}`,
            color: colors.blurple,
        };
    }
    printAllHands() {
        const deck = this.getCurrentDeck();
        const embed = this.getHandsEmbed();
        this.channel
            .send({
            embeds: [embed],
        })
            .then(handsMsg => {
            highestCallInDeck(deck, this.options.nonStandard, this.options.trueInsuranceCount)
                .then(call => {
                if (!call)
                    return;
                embed.description += `\n\nHighest Call: **${formatCall(call)}**`;
                handsMsg.edit({
                    embeds: [embed],
                });
            })
                .catch(console.error);
        });
    }
    gameInfoEmbed() {
        return new EmbedBuilder()
            .setTitle("Game Info")
            .setColor(colors.green)
            .setDescription(`Game Host: <@${this.hostId}>
Player Limit: **${this.options.playerLimit}**
${this.betInfo()}`)
            .addFields({ name: "Players", value: this.players.displayEntitled() }, { name: "Options", value: this.options.display() });
    }
    betInfo() {
        return this.options.startingBet
            ? `Bet to Join: **${this.options.startingBet.toLocaleString()} MD** | Pot: **${this.pot.toLocaleString()} MD**`
            : "";
    }
    newRoundEmbed(waiting = false) {
        let commonCardsToDisplay;
        if (waiting) {
            commonCardsToDisplay = `The round will begin ${this.roundBeginTimestamp}`;
        }
        else if (this.commonCards.length > 0) {
            commonCardsToDisplay = `Common Cards: ${this.formatCommonCards()}`;
        }
        const pwsc = waiting ? "" : this.players.formatPWSC();
        return {
            title: `New Round (${this.state.round + 1})`,
            description: `${this.betInfo()}
${commonCardsToDisplay}
${pwsc}
${this.players.currentPlayer} will start the round.`,
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
            buttonInteraction.reply({
                content: "You are already in the game.",
                ephemeral: true,
            });
            return;
        }
        if (this.players.out.includes(buttonInteraction.user.id)) {
            buttonInteraction.reply({
                content: "You are out of this game, so you may not rejoin.",
                ephemeral: true,
            });
            return;
        }
        if (this.players.size >= this.options.playerLimit) {
            buttonInteraction.reply({
                content: `Sorry, the player limit of ${this.options.playerLimit} has already been reached.`,
                ephemeral: true,
            });
            return;
        }
        const joinerProfile = await getProfile(buttonInteraction.user.id);
        if (this.options.startingBet &&
            joinerProfile.mincoDollars < this.options.startingBet) {
            buttonInteraction.reply({
                content: `You do not have enough Minco Dollars to join this game. (The bet is **${this.options.startingBet.toLocaleString()} MD**.)`,
                ephemeral: true,
            });
            return;
        }
        const startingAmount = Math.max(...this.players.cardsEntitled);
        this.players.addPlayer(buttonInteraction.user.id, startingAmount);
        let toSend = `${buttonInteraction.user}, you have joined the game at ${startingAmount} cards.`;
        if (this.options.startingBet)
            toSend += ` The game bet is **${this.options.startingBet.toLocaleString()} MD**.`;
        buttonInteraction.reply({
            content: toSend,
        });
        buttonInteraction.message.edit({
            embeds: [this.newRoundEmbed(true)],
        });
        return;
    }
    handleLeaveMidGame(buttonInteraction) {
        if (!this.players.has(buttonInteraction.user.id)) {
            buttonInteraction.reply({
                content: "You are not in the game.",
                ephemeral: true,
            });
            return;
        }
        this.players.removePlayers(this.players.get(buttonInteraction.user.id));
        let toAppend = "";
        if (buttonInteraction.user.id === this.hostId) {
            this.hostId = this.players.firstKey(); // select the first player to become the host
            toAppend = ` Host privileges have been transferred to <@${this.hostId}>.`;
            return;
        }
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
            let description = "There were no players left at the end of this game due to a curse or players leaving.";
            if (this.options.startingBet)
                description += "\nThe pot will not be given to any player.";
            const noWinnerEmbed = new EmbedBuilder()
                .setTitle("Game Over!")
                .setDescription(description)
                .setColor(colors.red);
            this.channel.send({
                embeds: [noWinnerEmbed],
            });
            this.endCollectors();
            return;
        }
        const winner = this.players.first();
        let potIncrement = 0;
        if (this.options.startingBet) {
            potIncrement = this.pot - this.options.startingBet;
        }
        if (winner.joinedMidGame || this.players.originalPlayers === 2) {
            if (this.options.startingBet) {
                updateProfile(winner.id, {
                    mincoDollars: {
                        increment: potIncrement,
                    },
                });
            }
        }
        else {
            updateProfile(winner.id, {
                mincoDollars: {
                    increment: potIncrement,
                },
                bsPokerGamesPlayed: {
                    increment: 1,
                },
                bsPokerWins: {
                    increment: 1,
                },
                bsPokerRating: {
                    increment: 1.0,
                },
            });
        }
        const betWinningInfo = this.options.startingBet
            ? ` and the pot of **${this.pot.toLocaleString()} MD**`
            : "";
        const embed = new EmbedBuilder()
            .setTitle("Game Over!")
            .setDescription(`${winner} has won the game${betWinningInfo}! Congratulations!`)
            .setColor(colors.green);
        const winnerMember = this.channel.guild.members.cache.get(winner.id);
        if (winnerMember) {
            embed.setAuthor({
                name: winnerMember.displayName,
                iconURL: winnerMember.displayAvatarURL(),
            });
        }
        this.channel.send({
            embeds: [embed],
        });
        this.endCollectors();
    }
    endCollectors() {
        this.msgColl.stop();
        this.mcompColl.stop();
        // abort handled in the end of msgColl
    }
    async blackJokerBS(playerWBJ, bser) {
        const timeUpToTakeCard = msToRelTimestamp(timeToTakeCard);
        const commonCardsFormattedWithNumbers = this.commonCards
            .map((card, i) => `\`${i + 1}\` **${formatCardSideways(card)}**`)
            .join("\n");
        const bxContent = `${playerWBJ}, you had a Black Joker! You get to remove 1 common card from the deck.\n${commonCardsFormattedWithNumbers}`;
        const bxMsg = await this.channel.send({
            content: bxContent +
                `\n*Please type the number of the card you want to remove* ${timeUpToTakeCard}.\nIf you do not want to take a card, type \`0\`.`,
        });
        this.channel
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
            if (cardNumber > 0 && cardNumber <= this.commonCards.length) {
                const card = this.commonCards.splice(cardNumber - 1, 1)[0];
                msg.reply({
                    content: `You have taken the card **${formatCardSideways(card)}**.`,
                });
            }
            else {
                msg.reply({
                    content: "You have chosen not to take any card.",
                });
            }
        })
            .catch(() => {
            this.channel.send({
                content: `${playerWBJ} failed to take a card in time. They will not take any card.`,
            });
        })
            .finally(() => {
            bxMsg.edit({ content: bxContent });
            this.handleBS(bser);
        });
    }
    removePlayersWithCardsAbove() {
        const playersToRemove = [];
        for (const p of this.players.values()) {
            const entitled = p.cardsEntitled;
            if (!entitled ||
                invalidNumber(entitled) ||
                entitled >= this.options.cardsToOut) {
                this.channel.send(`${p} is out of the game.`);
                playersToRemove.push(p);
            }
        }
        this.players.removePlayers(...playersToRemove);
        if (playersToRemove.some(x => x.id === this.hostId)) {
            this.hostId = this.players.firstKey();
        }
    }
    calculateCommonCards() {
        if (this.options.commonCardsAmt === -1) {
            return Math.floor(median(this.players.cardsEntitled));
        }
        else {
            return this.options.commonCardsAmt;
        }
    }
    dealCommonCards(deck) {
        const acCCAmount = this.calculateCommonCards();
        // SET THE COMMON CARDS
        if (this.options.commonCardsAmt !== 0) {
            this.commonCards = spliceRandom(deck, acCCAmount);
            this.commonCards.sort((a, b) => a.value - b.value);
        }
    }
    async newRound() {
        this.notifications.clearNotifTimeout();
        this.state.roundInProgress = false;
        const deck = this.options.createDeck();
        if (this.state.round !== 0) {
            this.printAllHands();
            this.removePlayersWithCardsAbove();
        }
        // Only 1 player left -> handle win
        if (this.players.size <= 1) {
            await this.endGameSuccess();
            return;
        }
        this.dealCommonCards(deck);
        if (this.state.round === 0) {
            this.players.dealCards(deck);
            await this.channel.send({
                embeds: [this.newRoundEmbed(false)],
            });
        }
        else {
            this.roundBeginTimestamp = msToRelTimestamp(timeBetweenRounds);
            const newRoundMsg = await this.channel.send({
                embeds: [this.newRoundEmbed(true)],
                components: this.newRoundComponents,
            });
            await sleep(timeBetweenRounds); // wait before starting next round
            if (this.state.aborted)
                return;
            // check for 1 player again in case people left
            if (this.players.size <= 1) {
                await this.endGameSuccess();
                return;
            }
            this.players.dealCards(deck);
            newRoundMsg.edit({
                embeds: [this.newRoundEmbed(false)],
                components: this.newRoundDisabledComponents,
            });
        }
        this.state.reset();
        this.state.nextRound();
        this.sendNewNotif();
    }
    handleBS(bser) {
        const bserHasRJ = this.options.useSpecialCards &&
            bser.hand.some(card => card.suit === "rj");
        const callIsTrue = callInDeck(this.state.currentCall.call, this.getCurrentDeck());
        let cardGainer = this.players.currentPlayer;
        if (callIsTrue) {
            cardGainer = bser;
            this.channel.send({
                content: `:green_circle: ${this.state.currentCall.player} was telling the truth! ${cardGainer} gains 1 card.`,
            });
        }
        else {
            cardGainer = this.state.currentCall.player;
            this.channel.send({
                content: `:red_circle: ${cardGainer} was lying! They gain 1 card.`,
            });
            if (bserHasRJ && bser.id !== this.players.currentPlayer.id) {
                this.channel.send({
                    content: `${bser} had a Red Joker! Since they successfully cross-BSed, they lose 1 card.`,
                });
                bser.cardsEntitled -= 1;
            }
        }
        cardGainer.cardsEntitled += 1;
        this.players.setIdxToIdxOf(cardGainer.id);
        this.newRound();
    }
    async kickPlayer(msg) {
        const kickId = msg.mentions.users.firstKey();
        if (!kickId)
            return;
        const kickPlayer = this.players.get(kickId);
        if (!kickPlayer) {
            replyThenDelete(msg, "That player is not in the game.");
            return;
        }
        if (kickId === msg.author.id) {
            replyThenDelete(msg, "You may not kick yourself from the game.");
            return;
        }
        this.state.callsOpen = false;
        const currentPlayerBeforeKick = this.players.currentPlayer.id;
        this.players.removePlayers(kickPlayer).then(() => {
            this.players.afterKick();
        });
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
        const callIsTrue = callInDeck(this.state.currentCall.call, this.getCurrentDeck());
        this.state.addToTracker(callIsTrue);
        if (!this.state.last3CallsFalse())
            return false;
        let playerWRJ;
        if (this.options.useBloodJoker) {
            playerWRJ = this.players.findKey(player => player.hand.some(card => card.suit === "rj"));
        }
        let bloodJokerDescription = "";
        for (const player of this.players.values()) {
            if (playerWRJ && player.id === playerWRJ) {
                player.cardsEntitled -= 1;
                bloodJokerDescription = `\n<@${playerWRJ}> had a Blood Joker, so they lose a card.`;
            }
            else {
                player.cardsEntitled += 1;
            }
        }
        this.channel.send({
            content: `${this.players.currentPlayer} has called **${this.state.formatCurrentCall()}**.`,
            embeds: [createCurseEmbed(bloodJokerDescription)],
        });
        this.newRound();
        return true;
    }
    async bsButtonClicked(buttonInteraction) {
        const bser = this.players.get(buttonInteraction.user.id);
        if (!bser) {
            await buttonInteraction.reply({
                content: "You may not BS as you are not a player in this game.",
                ephemeral: true,
            });
            return;
        }
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
            await this.blackJokerBS(playerWBJ, bser);
        }
        else {
            this.handleBS(bser);
        }
    }
    async viewCardsClicked(buttonInteraction) {
        const buttonPlayer = this.players.get(buttonInteraction.user.id);
        if (!buttonPlayer?.hand) {
            let content = "*You are not a player in this game.*\n";
            const teammateHandFormatData = this.players.formatTeammateHand(buttonInteraction.user.id);
            if (teammateHandFormatData) {
                const teammateHasBleedJoker = this.options.useBleedJoker &&
                    teammateHandFormatData.hand?.some(card => card.suit === "rj");
                const commonCardsDisplay = this.formatCommonCardsWithName(teammateHasBleedJoker);
                content += `${teammateHandFormatData.content}\n${commonCardsDisplay}\n${this.players.formatPWSC()}`;
            }
            else {
                content += `${this.formatCommonCardsWithName()}\n${this.players.formatPWSC()}`;
            }
            await buttonInteraction.reply({
                content,
                ephemeral: true,
            });
            return;
        }
        let hasRJ;
        const getHasRJ = () => hasRJ ?? (hasRJ = buttonPlayer.hand.some(card => card.suit === "rj"));
        const hasClown = this.options.useClown &&
            this.players.size > 2 &&
            this.state.clowned === ClownState.NotClowned &&
            getHasRJ();
        const hasBleed = this.options.useBleedJoker && getHasRJ();
        const components = hasClown ? [clownRow] : undefined;
        await buttonInteraction.reply({
            content: `**Your Hand:**
${buttonPlayer.formatHand()}
${this.formatCommonCardsWithName(hasBleed)}
${this.players.formatPWSC()}`,
            ephemeral: true,
            components,
        });
    }
    async clownClicked(buttonInteraction) {
        const buttonPlayerHand = this.players.get(buttonInteraction.user.id)?.hand;
        if (!buttonPlayerHand) {
            await buttonInteraction.reply({
                content: "You are not a player in this game.",
                ephemeral: true,
            });
            return;
        }
        const hasClownCard = buttonPlayerHand.some(card => card.suit === "rj");
        if (!hasClownCard) {
            await buttonInteraction.reply({
                content: "You do not have a Clown Joker.",
                ephemeral: true,
            });
            return;
        }
        if (this.players.size === 2) {
            await buttonInteraction.reply({
                content: "You may not use a Clown Joker when there are only 2 players.",
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
        this.players.reverseAll();
        this.state.clowned = ClownState.Clowned;
        await buttonInteraction.reply({
            content: `${emoji.clown} ${buttonInteraction.user} has used their Clown Joker. ${emoji.clown}\nThe order of players has been reversed.`,
        });
    }
    async handleCallAttempt(msg) {
        if (!this.state.roundInProgress || !this.state.callsOpen)
            return;
        if (msg.author.id !== this.players.currentPlayer.id)
            return;
        const call = parseCall(msg.content);
        const validated = this.callValidator.validateAndRespond(call, msg);
        if (!validated)
            return;
        this.state.callsOpen = false;
        this.notifications.disableNotif();
        this.state.currentCall = {
            call,
            player: this.players.currentPlayer,
        };
        if (this.options.useCurses && this.players.size > 2) {
            const cursed = this.handleCurses();
            if (cursed)
                return;
        }
        if (this.state.clowned === ClownState.Clowned) {
            this.state.clowned = ClownState.ClownedAndCalled;
        }
        this.players.forward(); // go to next player
        await this.sendNewNotif();
        this.state.callsOpen = true;
    }
    async messageCollect(msg) {
        if (hasAdminForGames(msg.author.id, msg.member.permissions, this.hostId)) {
            const content = msg.content.toLowerCase();
            if (content === "abort") {
                await msg.reply({
                    content: "Game aborted.",
                });
                this.endCollectors();
                return;
            }
            if (kickRegex.test(content)) {
                await this.kickPlayer(msg);
                return;
            }
        }
        await this.handleCallAttempt(msg);
    }
    assertRoundNotInProgress(interaction) {
        if (this.state.roundInProgress) {
            interaction.reply({
                content: "Please wait for the round to end.",
                ephemeral: true,
            });
            return false;
        }
        return true;
    }
    assertRoundInProgress(interaction) {
        if (!this.state.roundInProgress) {
            interaction.reply({
                content: "Please wait for the round to begin.",
                ephemeral: true,
            });
            return false;
        }
        return true;
    }
    async buttonCollect(buttonInteraction) {
        switch (buttonInteraction.customId) {
            case customIds.viewGameInfo: {
                await buttonInteraction.reply({
                    embeds: [this.gameInfoEmbed()],
                    ephemeral: true,
                });
                return;
            }
            case customIds.viewCards: {
                if (this.assertRoundInProgress(buttonInteraction)) {
                    await this.viewCardsClicked(buttonInteraction);
                }
                return;
            }
            case customIds.bs: {
                await this.bsButtonClicked(buttonInteraction);
                return;
            }
            case customIds.joinMidGame: {
                if (this.assertRoundNotInProgress(buttonInteraction)) {
                    await this.handleJoinMidGame(buttonInteraction);
                }
                return;
            }
            case customIds.leaveMidGame: {
                if (this.assertRoundNotInProgress(buttonInteraction)) {
                    this.handleLeaveMidGame(buttonInteraction);
                }
                return;
            }
            case customIds.clown: {
                if (this.assertRoundInProgress(buttonInteraction)) {
                    await this.clownClicked(buttonInteraction);
                }
                return;
            }
            default: {
                buttonInteraction.deferUpdate();
                return;
            }
        }
    }
    async gameLogic() {
        this.msgColl = this.channel.createMessageCollector({
            time: gameLength,
        });
        this.mcompColl = this.channel.createMessageComponentCollector({
            time: gameLength,
            componentType: ComponentType.Button,
            filter: i => customIdValues.includes(i.customId),
        });
        await this.newRound(); // start the game with the 1st round
        this.msgColl.on("collect", (m) => {
            this.messageCollect(m);
        });
        this.mcompColl.on("collect", bi => {
            this.buttonCollect(bi);
        });
        this.msgColl.on("end", (_, reason) => {
            if (reason === "time") {
                this.channel.send("Game ended due to inactivity (lasted longer than 1 hour).");
            }
            this.state.aborted = true;
            this.notifications.clearNotifTimeout();
            channelsWithActiveGames.delete(this.channel.id);
            bsPokerTeams.delete(this.channel.id);
        });
    }
}
//# sourceMappingURL=BSPokerGame.js.map