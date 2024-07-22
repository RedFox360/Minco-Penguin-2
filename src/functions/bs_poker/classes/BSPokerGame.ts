import {
	type APIEmbed,
	type ButtonInteraction,
	type ChatInputCommandInteraction,
	type InteractionCollector,
	type Message,
	type MessageCollector,
	type Snowflake,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
} from "discord.js";
import {
	type Call,
	type ExtCard,
	ClownState,
	customIds,
	customIdValues,
} from "../bs_poker_types.js";
import {
	callInDeck,
	formatCall,
	highestCallInDeck,
	parseCall,
} from "../bs_poker_functions.js";
import {
	msToRelTimestamp,
	replyThenDelete,
	invalidNumber,
	median,
	hasAdminForGames,
} from "../../util.js";
import {
	formatCardSideways,
	formatDeck,
} from "../../cards/basic_card_functions.js";
import { bsPokerTeams, channelsWithActiveGames } from "../../../main.js";
import { getProfile, updateProfile } from "../../../prisma/models.js";
import { colors, spliceRandom, sleep } from "../../util.js";
import { emoji, emojiRaw } from "../../cards/basic_card_types.js";
import Player from "./Player.js";
import CallValidator from "./CallValidator.js";
import StateManager from "./StateManager.js";
import OptionManager from "./OptionManager.js";
import NotificationManager from "./NotificationManager.js";
import PlayerCollection from "./PlayerCollection.js";

const timeBetweenRounds = 12_000;
const timeToTakeCard = 30_000;
const gameLength = 3_600_000;
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
const clownRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	clownButton
);
const createCurseEmbed = (x = "") =>
	new EmbedBuilder()
		.setColor(colors.red)
		.setTitle("Curse activated!")
		.setDescription(
			`The previous 3 calls were all false.\nEveryone will gain a card and a new round will start now.${x}`
		);

const joinMidGameDisabled = new ButtonBuilder(joinMidGame.toJSON()).setDisabled(
	true
);
const leaveMidGameDisabled = new ButtonBuilder(
	leaveMidGame.toJSON()
).setDisabled(true);

const nrRowJoin = new ActionRowBuilder<ButtonBuilder>().addComponents(
	joinMidGame,
	leaveMidGame
);
const nrRowLeave = new ActionRowBuilder<ButtonBuilder>().addComponents(
	leaveMidGame
);
const nrRowJoinDisabled = new ActionRowBuilder<ButtonBuilder>().addComponents(
	joinMidGameDisabled,
	leaveMidGameDisabled
);
const nrRowLeaveDisabled = new ActionRowBuilder<ButtonBuilder>().addComponents(
	leaveMidGameDisabled
);

const kickRegex = /^kick <@\d+>/;

export default class BSPoker {
	private readonly players: PlayerCollection;
	private readonly state: StateManager;
	private readonly callValidator: CallValidator;
	private readonly notifications: NotificationManager;
	private hostId: Snowflake;
	private commonCards: ExtCard[] = [];
	private msgColl: MessageCollector;
	private mcompColl: InteractionCollector<ButtonInteraction>;
	private roundBeginTimestamp: string;

	public constructor(
		private readonly interaction: ChatInputCommandInteraction<"cached">,
		playerIds: readonly Snowflake[],
		private readonly options: OptionManager
	) {
		this.players = PlayerCollection.fromIds(
			playerIds,
			this.interaction.channelId,
			options
		);
		this.hostId = interaction.user.id;
		this.state = new StateManager(this.players);
		this.callValidator = new CallValidator(options, this.state);
		this.notifications = new NotificationManager(
			interaction.channel,
			this.state
		);
	}

	private get newRoundComponents(): ActionRowBuilder<ButtonBuilder>[] {
		return this.options.allowJoinMidGame ? [nrRowJoin] : [nrRowLeave];
	}
	private get newRoundDisabledComponents(): ActionRowBuilder<ButtonBuilder>[] {
		return this.options.allowJoinMidGame
			? [nrRowJoinDisabled]
			: [nrRowLeaveDisabled];
	}

	private get pot(): number {
		return this.players.everPlayersLen * this.options.startingBet;
	}

	private getCurrentDeck(): ExtCard[] {
		const deck = this.players.hands.flat(1);
		deck.push(...this.commonCards);
		return deck;
	}

	private async sendNewNotif() {
		await this.notifications.sendNewNotif(() => {
			this.newRound();
		});
	}

	private getHandsEmbed() {
		const commonCardsDisplay =
			this.commonCards.length === 0
				? "None"
				: `\n${formatDeck(this.commonCards)}`;
		const handsList = this.players
			.map(player => {
				const teammates = player.displayTeammates();
				return `${player}${teammates}\n${player.formatHand()}`;
			})
			.join("\n");
		return new EmbedBuilder()
			.setTitle(`Hands from Last Round (${this.state.round})`) // this.round is 0-indexed, so do not subtract 1
			.setDescription(
				`Common Cards: ${commonCardsDisplay}
${handsList}`
			)
			.setColor(colors.blurple);
	}

	private printAllHands() {
		const deck = this.getCurrentDeck();
		const embed = this.getHandsEmbed().toJSON();
		this.interaction.channel
			.send({
				embeds: [embed],
			})
			.then(handsMsg => {
				highestCallInDeck(
					deck,
					this.options.nonStandard,
					this.options.insuranceCount
				)
					.then(call => {
						if (!call) return;
						embed.description += `\n\nHighest Call: **${formatCall(call)}**`;
						handsMsg.edit({
							embeds: [embed],
						});
					})
					.catch(console.error);
			});
	}

	private gameInfoEmbed() {
		const embed = new EmbedBuilder()
			.setTitle("Game Info")
			.setColor(colors.green)
			.setDescription(`Game Host: <@${this.hostId}>${this.betInfo()}`)
			.addFields(
				{ name: "Players", value: this.players.displayEntitled() },
				{ name: "Options", value: this.options.display() }
			);
		return embed;
	}

	private betInfo() {
		return this.options.startingBet
			? `Bet to Join: **${this.options.startingBet.toLocaleString()} MD** | Pot: **${this.pot.toLocaleString()} MD**\n`
			: "";
	}

	private newRoundEmbed(waiting = false): APIEmbed {
		let commonCardsToDisplay: string;
		if (waiting) {
			commonCardsToDisplay = `The round will begin ${this.roundBeginTimestamp}`;
		} else if (this.commonCards.length > 0) {
			commonCardsToDisplay = `Common Cards:\n${formatDeck(this.commonCards)}`;
		} else {
			commonCardsToDisplay = "Common Cards: None";
		}
		const pwsc = waiting ? "" : this.players.formatPWSC();
		return {
			title: `New Round (${this.state.round + 1})`,
			description: `${this.betInfo()}${commonCardsToDisplay}
${pwsc}
${this.state.currentPlayer} will start the round.`,
			fields: [
				{
					name: "Players",
					value: this.players.displayEntitled(),
				},
			],
			color: colors.green,
		};
	}

	private async handleJoinMidGame(buttonInteraction: ButtonInteraction) {
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
		if (
			this.options.startingBet &&
			joinerProfile.mincoDollars < this.options.startingBet
		) {
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

	private handleLeaveMidGame(buttonInteraction: ButtonInteraction) {
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

	private async endGameSuccess() {
		if (this.players.size === 0) {
			let description =
				"There were no players left at the end of this game due to a curse or players leaving.";
			if (this.options.startingBet)
				description += "\nThe pot will not be given to any player.";
			const noWinnerEmbed = new EmbedBuilder()
				.setTitle("Game Over!")
				.setDescription(description)
				.setColor(colors.red);
			this.interaction.channel.send({
				embeds: [noWinnerEmbed],
			});
			return;
		}

		const winner = this.players.first();
		if (winner.joinedMidGame || this.players.originalPlayers === 2) {
			if (this.options.startingBet) {
				updateProfile(winner.id, {
					mincoDollars: {
						increment: this.pot,
					},
				});
			}
		} else {
			updateProfile(winner.id, {
				mincoDollars: {
					increment: this.pot,
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
			.setDescription(
				`${winner} has won the game${betWinningInfo}! Congratulations!`
			)
			.setColor(colors.green);

		const winnerMember = this.interaction.guild.members.cache.get(winner.id);
		if (winnerMember) {
			embed.setAuthor({
				name: winnerMember.displayName,
				iconURL: winnerMember.displayAvatarURL(),
			});
		}
		this.interaction.channel.send({
			embeds: [embed],
		});
		this.endCollectors();
	}

	private endCollectors() {
		this.msgColl.stop();
		this.mcompColl.stop();
		// abort handled in the end of msgColl
	}

	private async blackJokerBS(playerWBJ: Player, bserId: Snowflake) {
		const timeUpToTakeCard = msToRelTimestamp(timeToTakeCard);
		const commonCardsFormattedWithNumbers = this.commonCards
			.map((card, i) => `\`${i + 1}\` **${formatCardSideways(card)}**`)
			.join("\n");
		const bxContent = `${playerWBJ}, you had a Black Joker! You get to remove 1 common card from the deck.\n${commonCardsFormattedWithNumbers}`;
		const bxMsg = await this.interaction.channel.send({
			content:
				bxContent +
				`\n*Please type the number of the card you want to remove* ${timeUpToTakeCard}.\nIf you do not want to take a card, type \`0\`.`,
		});

		this.interaction.channel
			.awaitMessages({
				max: 1,
				idle: 0,
				time: timeToTakeCard,
				filter: msg => {
					if (msg.author.id !== playerWBJ.id) return false;
					const cardNumber = parseInt(msg.content);
					return (
						!invalidNumber(cardNumber) &&
						cardNumber >= 0 &&
						cardNumber <= this.commonCards.length
					);
				},
			})
			.then(messages => {
				const msg = messages.first();
				const cardNumber = parseInt(msg.content);
				if (cardNumber === 0) {
					msg.reply({
						content: "You have chosen not to take any card.",
					});
				} else {
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

	private removePlayersWithCardsAbove() {
		const playersToRemove: Player[] = [];
		for (const p of this.players.values()) {
			const entitled = p.cardsEntitled;
			if (
				!entitled ||
				invalidNumber(entitled) ||
				entitled >= this.options.cardsToOut
			) {
				this.interaction.channel.send(`${p} is out of the game.`);
				playersToRemove.push(p);
			}
		}
		this.players.removePlayers(...playersToRemove);
		if (playersToRemove.some(x => x.id === this.hostId)) {
			this.hostId = this.players.firstKey();
		}
	}

	private calculateCommonCards(): number {
		if (this.options.commonCards === -1) {
			return Math.floor(median(this.players.cardsEntitled));
		} else {
			return this.options.commonCards;
		}
	}

	private async newRound() {
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

		const acCCAmount = this.calculateCommonCards();
		// SET THE COMMON CARDS
		if (this.options.commonCards !== 0) {
			this.commonCards = spliceRandom(deck, acCCAmount);
			this.commonCards.sort((a, b) => a.value - b.value);
		}

		if (this.state.round === 0) {
			this.players.deal(deck);
			await this.interaction.channel.send({
				embeds: [this.newRoundEmbed(false)],
			});
		} else {
			this.roundBeginTimestamp = msToRelTimestamp(timeBetweenRounds);
			const newRoundMsg = await this.interaction.channel.send({
				embeds: [this.newRoundEmbed(true)],
				components: this.newRoundComponents,
			});
			await sleep(timeBetweenRounds); // wait before starting next round
			if (this.state.aborted) return;
			// check for 1 player again in case people left
			if (this.players.size <= 1) {
				await this.endGameSuccess();
				return;
			}
			this.players.deal(deck);
			newRoundMsg.edit({
				embeds: [this.newRoundEmbed(false)],
				components: this.newRoundDisabledComponents,
			});
		}

		this.state.reset();
		this.state.nextRound();
		this.sendNewNotif();
	}

	private handleBS(bserId: Snowflake) {
		const bser = this.players.get(bserId);
		const bserHasRJ =
			this.options.useSpecialCards &&
			!this.options.useClown &&
			bser.hand.some(card => card.suit === "rj");

		const callIsTrue = callInDeck(
			this.state.currentCall.call,
			this.getCurrentDeck()
		);

		let cardGainer = this.state.currentPlayer;

		if (callIsTrue) {
			cardGainer = bser;
			this.interaction.channel.send({
				content: `:green_circle: ${this.state.currentCall.player} was telling the truth! ${cardGainer} gains 1 card.`,
			});
		} else {
			this.interaction.channel.send({
				content: `:red_circle: ${this.state.currentCall.player} was lying! They gain 1 card.`,
			});
			cardGainer = this.state.currentCall.player;
			if (bserHasRJ && bserId !== this.state.currentPlayer.id) {
				if (bser.hand.length === 1) {
					this.interaction.channel.send({
						content: `<@${bserId}> had a Red Joker and cross-BSed! However, they only had 1 card, so they do not lose any cards.`,
					});
				} else {
					this.interaction.channel.send({
						content: `<@${bserId}> had a Red Joker! Since they cross-BSed, they lose 1 card.`,
					});
					bser.cardsEntitled -= 1;
				}
			}
		}
		cardGainer.cardsEntitled += 1;
		this.state.setIdxToIdxOf(cardGainer.id);
		this.newRound();
	}

	private async kickPlayer(msg: Message) {
		const kickId = msg.mentions.users.firstKey();
		if (!kickId) return;
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
		this.players.removePlayers(this.players.get(kickId));
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

	private handleCurses(): boolean {
		const callIsTrue = callInDeck(
			this.state.currentCall.call,
			this.getCurrentDeck()
		);
		this.state.addToTracker(callIsTrue);
		if (this.state.last3CallsFalse()) {
			this.interaction.channel.send({
				content: `${
					this.state.currentPlayer
				} has called **${this.state.formatCurrentCall()}**.`,
			});
			let playerWRJ: Snowflake;
			if (this.options.useBloodJoker && !this.options.useClown) {
				playerWRJ = this.players.findKey(player =>
					player.hand.some(card => card.suit === "rj")
				);
			}
			let had1Card = false;
			for (const player of this.players.values()) {
				if (playerWRJ && player.id === playerWRJ) {
					if (player.cardsEntitled === 1) {
						had1Card = true;
					} else {
						player.cardsEntitled -= 1;
					}
				} else {
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

	private async bsButtonClicked(buttonInteraction: ButtonInteraction) {
		if (!this.players.has(buttonInteraction.user.id)) {
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
				content:
					"Sorry, another player seems to have pressed the BS button before you.",
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

		const playerWBJ = this.players.find(player =>
			player.hand.some(card => card.suit === "bj")
		);

		// If the player has a black joker
		this.state.roundInProgress = false;
		if (
			playerWBJ &&
			playerWBJ.id !== this.state.currentCall.player.id &&
			this.commonCards.length > 0
		) {
			await this.blackJokerBS(playerWBJ, buttonInteraction.user.id);
		} else {
			this.handleBS(buttonInteraction.user.id);
		}
	}

	private async viewCardsClicked(buttonInteraction: ButtonInteraction) {
		const buttonPlayer = this.players.get(buttonInteraction.user.id);
		if (!buttonPlayer?.hand) {
			let content = "*You are not a player in this game.*";
			if (this.commonCards.length)
				content += `\nCommon Cards:\n${formatDeck(this.commonCards)}`;
			content += `${this.players.formatTeammateHand(buttonInteraction.user.id)}
${this.players.formatPWSC()}`;
			await buttonInteraction.reply({
				content,
				ephemeral: true,
			});
			return;
		}
		const hasClown =
			this.options.useClown &&
			this.players.size > 2 &&
			this.state.clowned === ClownState.NotClowned &&
			buttonPlayer.hand.some(card => card.suit === "rj");
		const components = hasClown ? [clownRow] : undefined;
		const commonCardsDisplay =
			this.commonCards.length === 0
				? "None"
				: `\n${formatDeck(this.commonCards)}`;
		await buttonInteraction.reply({
			content: `**Your Hand:**
${buttonPlayer.formatHand()}
**Common Cards:** ${commonCardsDisplay}
${this.players.formatPWSC()}`,
			ephemeral: true,
			components,
		});
	}

	private async clownClicked(buttonInteraction: ButtonInteraction) {
		const buttonPlayer = this.players.get(buttonInteraction.user.id);
		if (!buttonPlayer?.hand) {
			await buttonInteraction.reply({
				content: "You are not a player in this game.",
				ephemeral: true,
			});
			return;
		}
		const hasClownCard = buttonPlayer.hand.some(card => card.suit === "rj");
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
		this.players.reverse();
		this.state.reverseIdx();
		this.state.clowned = ClownState.Clowned;
		await buttonInteraction.reply({
			content: `${emoji.clown} ${buttonInteraction.user} has used their Clown Joker. ${emoji.clown}\nThe order of players has been reversed.`,
		});
	}

	private async messageCollect(msg: Message<true>) {
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

		if (!this.state.roundInProgress || !this.state.callsOpen) return;
		if (msg.author.id !== this.state.currentPlayer.id) return;
		const call: Call = parseCall(msg.content);
		const validated = this.callValidator.validateAndRespond(call, msg);
		if (!validated) return;

		this.state.callsOpen = false;
		this.notifications.disableNotif();

		this.state.setCurrentCall(call);
		if (this.options.useCurses && this.players.size > 2) {
			const cursed = this.handleCurses();
			if (cursed) return;
		}
		if (this.state.clowned === ClownState.Clowned) {
			this.state.clowned = ClownState.ClownedAndCalled;
		}

		this.state.forward(); // go to next player
		await this.sendNewNotif();
		this.state.callsOpen = true;
	}

	private async buttonCollect(buttonInteraction: ButtonInteraction) {
		switch (buttonInteraction.customId) {
			case customIds.viewGameInfo: {
				await buttonInteraction.reply({
					embeds: [this.gameInfoEmbed()],
					ephemeral: true,
				});
				return;
			}
			case customIds.joinMidGame: {
				if (this.state.roundInProgress) {
					await buttonInteraction.reply({
						content: "Please wait for the round to end.",
						ephemeral: true,
					});
				} else {
					await this.handleJoinMidGame(buttonInteraction);
				}
				return;
			}
			case customIds.leaveMidGame: {
				if (this.state.roundInProgress) {
					await buttonInteraction.reply({
						content: "Please wait for the round to end.",
						ephemeral: true,
					});
					return;
				} else {
					this.handleLeaveMidGame(buttonInteraction);
				}
				return;
			}
			case customIds.viewCards: {
				await this.viewCardsClicked(buttonInteraction);
				return;
			}
			case customIds.bs: {
				await this.bsButtonClicked(buttonInteraction);
				return;
			}
			case customIds.clown: {
				await this.clownClicked(buttonInteraction);
				return;
			}
			default: {
				buttonInteraction.deferUpdate();
				return;
			}
		}
	}

	public async gameLogic() {
		this.msgColl = this.interaction.channel.createMessageCollector({
			time: gameLength,
		});
		this.mcompColl = this.interaction.channel.createMessageComponentCollector({
			time: gameLength,
			componentType: ComponentType.Button,
			filter: i => customIdValues.includes(i.customId),
		});
		for (const p of this.players.values()) {
			p.cardsEntitled = this.options.beginCards;
		}
		await this.newRound(); // start the game with the 1st round

		this.msgColl.on("collect", (m: Message<true>) => {
			this.messageCollect(m);
		});

		this.mcompColl.on("collect", bi => {
			this.buttonCollect(bi);
		});

		this.msgColl.on("end", (_, reason) => {
			if (reason === "time") {
				this.interaction.channel.send(
					"Game ended due to inactivity (lasted longer than 1 hour)."
				);
			}
			this.state.aborted = true;
			this.notifications.clearNotifTimeout();
			channelsWithActiveGames.delete(this.interaction.channelId);
			bsPokerTeams.delete(this.interaction.channelId);
		});
	}
}
