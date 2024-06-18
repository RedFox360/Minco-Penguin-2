import {
	APIEmbed,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	Collection,
	ComponentType,
	EmbedBuilder,
	Interaction,
	InteractionCollector,
	Message,
	MessageCollector,
	Snowflake,
	userMention,
} from "discord.js";
import {
	Call,
	ExtCard,
	HandRank,
	PlayerCall,
	ExtValue,
} from "./bs_poker_types.js";
import {
	callInDeck,
	formatCall,
	highestCallInDeck,
	isHigher,
	parseCall,
} from "./bs_poker_functions.js";
import {
	msToRelTimestamp,
	removeByValue,
	replyThenDelete,
	invalidNumber,
	median,
} from "../util.js";
import {
	createBasicDeck,
	formatCardSideways,
	formatDeck,
} from "../basic_card_functions.js";
import { promisify } from "util";
import { bsPokerTeams, channelsWithActiveGames, prisma } from "../../main.js";
import { getProfile, updateProfile } from "../../prisma/models.js";
import { colors, spliceRandom } from "../util.js";
const sleep = promisify(setTimeout);

const customIds = {
	joinMidGame: "join_mid_game_bspoker",
	leaveMidGame: "leave_mid_game_bspoker",
	viewCards: "view_cards_bspoker",
	bs: "bs_bspoker",
};
const customIdValues = Object.values(customIds);

const timeToMakeCall = 60_000;
const timeBetweenRounds = 12_000;
const timeToTakeCard = 20_000;
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
const bsButton = new ButtonBuilder()
	.setCustomId(customIds.bs)
	.setLabel("BS")
	.setStyle(ButtonStyle.Danger);

const joinMidGameDisabled = new ButtonBuilder(joinMidGame.toJSON()).setDisabled(
	true
);
const leaveMidGameDisabled = new ButtonBuilder(
	leaveMidGame.toJSON()
).setDisabled(true);
const bsButtonDisabled = new ButtonBuilder(bsButton.toJSON()).setDisabled(true);

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

class BSPoker {
	// Players
	playersOut: Snowflake[];
	currentCall: PlayerCall | null = null;
	currentPlayer: Snowflake;
	hostId: Snowflake;
	private _currPlayerIdx: number = 0;
	// Deck
	playerHands: Collection<Snowflake, ExtCard[]>;
	playerCardsEntitled: Map<Snowflake, number>;
	commonCards: ExtCard[];
	// States
	callsOpen = false;
	bsCalled = false;
	aborted = false;
	bxOpen = false;
	round = 0;
	totalBet = 0;
	// Notification
	notifText: string;
	notification: Message;
	notifTimeout: NodeJS.Timeout;
	// Collectors
	msgColl: MessageCollector;
	mcompColl: InteractionCollector<ButtonInteraction>;
	// Game Flow
	newRoundMsg: Message;
	roundBeginTimestamp: string;
	bserInteraction: Interaction;
	// Black Joker
	bxTimeout: NodeJS.Timeout;
	bxMsg: Message;
	bxContent: string;

	constructor(
		public interaction: ChatInputCommandInteraction<"cached">,
		public players: string[],
		public cardsToOut: number,
		public startingBet: number,
		public commonCardsAmount: number,
		public jokerCount: number,
		public insuranceCount: number,
		public beginCards: number,
		public allowJoinMidGame: boolean,
		public playerLimit: number,
		public useSpecialCards: boolean
	) {
		this.playersOut = [];
		this.playerHands = new Collection<Snowflake, ExtCard[]>();
		this.playerCardsEntitled = new Map<Snowflake, number>();
		this.commonCards = [];
		this.hostId = interaction.user.id;
		this.currentPlayer = players[0];
	}

	get currentPlayerIndex() {
		return this._currPlayerIdx % this.players.length;
	}

	set currentPlayerIndex(status: number) {
		if (status < 0) this._currPlayerIdx = 0;
		this._currPlayerIdx = status;
	}

	currentDeck() {
		const currentDeck: ExtCard[] = [].concat(
			...Array.from(this.playerHands.values())
		);
		currentDeck.push(...this.commonCards);
		return currentDeck;
	}

	createDeck() {
		const deck: ExtCard[] = createBasicDeck();
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
		if (!this.useSpecialCards) return "";
		if (this.playerHands.size === 0) return "";
		const pwsc = this.players.filter(p =>
			this.playerHands.get(p).some(c => c.suit === "bj" || c.suit === "rj")
		);
		return `Players with special cards: ${
			pwsc.length === 0 ? "None" : pwsc.map(p => `<@${p}>`).join(" ")
		}`;
	}

	getHandsEmbed(handsList: string, highestCall: string | null = null) {
		return new EmbedBuilder()
			.setTitle(`Hands from Last Round ${this.round}`) // this.round is 0-indexed, so do not subtract 1
			.setDescription(
				`Common Cards: ${
					this.commonCards.length === 0
						? "None"
						: `\n${formatDeck(this.commonCards)}`
				}\n${handsList}${
					highestCall ? `\n\nHighest Call: **${highestCall}**` : ""
				}`
			)
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
						handsMsg.edit({
							embeds: [this.getHandsEmbed(handsList, formatCall(call))],
						});
					})
					.catch(console.error);
			});
	}

	displayPlayerTeammates(p: string) {
		const teammates = bsPokerTeams
			.get(this.interaction.channelId)
			.find(t => t.includes(p))
			.filter(t => t !== p);
		if (teammates?.length > 0)
			return ` (Team: ${teammates.map(userMention).join(" ")})`;
		return "";
	}

	newRoundEmbed(waiting: boolean): APIEmbed {
		let commonCardsToDisplay = "";
		if (waiting) {
			if (this.round > 0) {
				commonCardsToDisplay = `will be shown ${this.roundBeginTimestamp}`;
			}
		} else if (this.commonCards.length > 0) {
			commonCardsToDisplay = `\n${formatDeck(this.commonCards)}`;
		} else {
			commonCardsToDisplay = "None";
		}
		const pwsc = waiting ? "" : this.formatPWSC();
		return {
			title: `New Round (${this.round + 1})`,
			description: `${
				this.startingBet
					? `Bet to Join: **${this.startingBet} MD** | Pot: **${this.totalBet} MD**\n`
					: ""
			}Common Cards: ${commonCardsToDisplay}\n${pwsc}\n<@${
				this.players[this.currentPlayerIndex]
			}> will start the round.`,
			fields: [
				{
					name: "Players",
					value: this.players
						.map(p => {
							const cardsEntitled = this.playerCardsEntitled.get(p);
							if (cardsEntitled === 1) return `<@${p}>: 1 card`;
							return `<@${p}>: ${this.playerCardsEntitled.get(p)} cards`;
						})
						.join("\n"),
				},
			],
			color: colors.green,
		};
	}

	forward() {
		this.currentPlayerIndex += 1;
		this.currentPlayer = this.players[this.currentPlayerIndex];
	}

	async handleJoinLeave(buttonInteraction: ButtonInteraction) {
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
					content: `You do not have enough Minco Dollars to join this game (the bet is ${this.startingBet}).`,
					ephemeral: true,
				});
				return;
			}

			this.totalBet += this.startingBet;
			this.players.push(buttonInteraction.user.id);
			bsPokerTeams
				.get(this.interaction.channelId)
				.push([buttonInteraction.user.id]);
			const startingAmount = Math.max(...this.playerCardsEntitled.values());
			this.playerCardsEntitled.set(buttonInteraction.user.id, startingAmount);

			let toSend = `${buttonInteraction.user}, you have joined the game at ${startingAmount} cards.`;
			await updateProfile(buttonInteraction.user.id, {
				mincoDollars: {
					decrement: this.startingBet,
				},
				bsPokerGamesPlayed: {
					increment: 1,
				},
			});
			if (this.startingBet)
				toSend += ` **${this.startingBet}** Minco Dollars have been deducted from your wallet.`;
			await buttonInteraction.reply({
				content: toSend,
			});
			await this.newRoundMsg.edit({
				embeds: [this.newRoundEmbed(true)],
			});

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
			await this.newRoundMsg.edit({
				embeds: [this.newRoundEmbed(true)],
			});
			return;
		}
	}

	getNotifRow(disabled: boolean) {
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			viewCardsButton
		);
		if (this.currentCall)
			row.addComponents(disabled ? bsButtonDisabled : bsButton);
		return row;
	}

	validateAndRespond(call: Call, message: Message): boolean {
		if (!call || invalidNumber(call.call) || (call.call as number) === -1) {
			// Call could not be parsed
			return false;
		}
		if (this.currentCall) {
			if (!isHigher(call, this.currentCall.call)) {
				message.reply({
					content: `Your call is not higher than the current call (${formatCall(
						this.currentCall.call
					)}). Please try again.`,
				});
				return false;
			}
		}
		if (
			call.call === HandRank.DoublePair ||
			call.call === HandRank.DoubleTriple ||
			call.call === HandRank.FullHouse
		) {
			const highCards = call.high as [ExtValue, ExtValue];
			if (highCards[0] === highCards[1]) {
				replyThenDelete(
					message,
					`Double pairs, triples, and full houses must have different values (Your call: ${formatCall(
						call
					)}). Please try again.`
				);
				return false;
			}
		}
		if (call.call === HandRank.TriplePair) {
			const highCards = call.high as [ExtValue, ExtValue, ExtValue];
			if (
				highCards[0] === highCards[1] ||
				highCards[0] === highCards[2] ||
				highCards[1] === highCards[2]
			) {
				replyThenDelete(
					message,
					`Triple pairs must have 3 unique values (Your call: ${formatCall(
						call
					)}). Please try again.`
				);

				return false;
			}
		}
		if (call.call === HandRank.StraightFlush && call.high.value === 15) {
			replyThenDelete(
				message,
				`Sorry, but Insurance-High Straight Flushes are not allowed (Your call: ${formatCall(
					call
				)}). Please try again.`
			);
			return false;
		}
		if (call.call === HandRank.DoubleFlush) {
			const highCards = call.high as [ExtCard, ExtCard];
			if (highCards[0].suit === highCards[1].suit) {
				replyThenDelete(
					message,
					`Double flushes must have different suits (Your call: ${formatCall(
						call
					)}). Please try again.`
				);
				return false;
			}

			if (
				this.insuranceCount < 2 &&
				highCards[0].value === highCards[1].value &&
				highCards[0].value === 15
			) {
				replyThenDelete(
					message,
					`There are not enough insurance cards in the deck for a double insurance call (Your call: ${formatCall(
						call
					)}). Please try again.`
				);
				return false;
			}
		}
		return true;
	}

	async endGameSuccess() {
		const winnerId = this.players[0];
		await updateProfile(winnerId, {
			mincoDollars: {
				increment: this.totalBet,
			},
			bsPokerWins: {
				increment: 1,
			},
		});
		const winnerMember = this.interaction.guild.members.cache.get(winnerId);
		const embed = new EmbedBuilder()
			.setTitle("Game Over!")
			.setDescription(
				`<@${winnerId}> has won the game${
					this.startingBet ? ` and the pot of **${this.totalBet} MD**` : ""
				}! Congratulations!`
			)
			.setColor(colors.green);

		if (winnerMember) {
			embed.setAuthor({
				name: winnerMember.displayName,
				iconURL: winnerMember.user.displayAvatarURL(),
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

	async blackJokerBS(playerWBJ: Snowflake) {
		if (this.commonCards.length === 1) {
			await this.interaction.channel.send({
				content: `<@${playerWBJ}> had a black joker. There is 1 common card, so they will take it: **${formatCardSideways(
					this.commonCards[0]
				)}**.`,
			});
			this.commonCards = [];
			return;
		}

		const timeUpToTakeCard = msToRelTimestamp(timeToTakeCard);
		const commonCardsFormattedWithNumbers = this.commonCards
			.map((card, i) => `\`${i + 1}\` **${formatCardSideways(card)}**`)
			.join("\n");
		this.bxOpen = true;
		this.bxContent = `<@${playerWBJ}>, you had a black joker! You get to remove 1 common card from the deck.\n${commonCardsFormattedWithNumbers}`;
		this.bxMsg = await this.interaction.channel.send({
			content:
				this.bxContent +
				`\n*Please type the number of the card you want to remove* ${timeUpToTakeCard}.\nIf you do not want to take any card, type \`0\`.`,
		});
		// This will be handled in the main message collector in function gameLogic()

		this.bxTimeout = setTimeout(() => {
			if (this.bxOpen) {
				this.interaction.channel.send({
					content: `<@${playerWBJ}> failed to take a card in time. They will not take any card.`,
				});
				this.bxOpen = false;
			}
			this.disableBX(false);
		}, timeToTakeCard);
	}

	getMsgForNotif() {
		return `${
			this.currentCall
				? `<@${this.currentCall.player}> has called **${formatCall(
						this.currentCall.call
				  )}**.\n`
				: ""
		}<@${this.currentPlayer}>, it is your turn.`;
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
			if (this.aborted) return;
			msg.edit({
				content: nt,
				components: [this.getNotifRow(true)],
			});
			this.interaction.channel.send({
				content: `<@${this.currentPlayer}> failed to make a call in time. They gain a card and a new round will start now.`,
			});
			this.playerCardsEntitled.set(
				this.currentPlayer,
				this.playerCardsEntitled.get(this.currentPlayer) + 1
			);
			this.newRound();
		}, timeToMakeCall);

		this.notification = msg;
	}

	disableNotif() {
		this.notification.edit({
			content: this.notifText,
			components: [this.getNotifRow(true)],
		});
		clearTimeout(this.notifTimeout);
	}

	disableBX(clearTout = true) {
		this.bxMsg.edit({ content: this.bxContent });
		this.bxOpen = false;
		if (clearTout) clearTimeout(this.bxTimeout);
	}

	removePlayerFromGame(player: Snowflake, index?: number) {
		this.playerCardsEntitled.delete(player);
		if (index) {
			this.players.splice(index, 1);
		} else {
			removeByValue(this.players, player);
		}
		this.playersOut.push(player);
		bsPokerTeams.set(
			this.interaction.channel.id,
			bsPokerTeams
				.get(this.interaction.channel.id)
				.filter(t => !t.includes(player))
		);
		this.currentPlayer = this.players[this.currentPlayerIndex];
	}

	async newRound() {
		clearTimeout(this.notifTimeout);
		clearTimeout(this.bxTimeout);
		this.callsOpen = false;

		const deck = this.createDeck();

		if (this.round > 0 && this.playerHands.size > 0) this.printAllHands();

		// Remove players from game with cards >= cardsToOut
		this.players.forEach((p, i) => {
			const entitled = this.playerCardsEntitled.get(p);
			if (entitled >= this.cardsToOut || invalidNumber(entitled) || !entitled) {
				this.interaction.channel.send(`<@${p}> is out of the game.`);
				this.removePlayerFromGame(p, i);
			}
		});

		// Only 1 player left -> handle win
		if (this.players.length <= 1) {
			await this.endGameSuccess();
			return;
		}

		this.roundBeginTimestamp = msToRelTimestamp(timeBetweenRounds);

		const acCCAmount =
			this.commonCardsAmount > 0
				? this.commonCardsAmount
				: Math.floor(median(Array.from(this.playerCardsEntitled.values())));
		this.newRoundMsg = await this.interaction.channel.send({
			embeds: [this.newRoundEmbed(true)],
			components:
				this.round === 0
					? []
					: this.allowJoinMidGame
					? [nrRowJoin]
					: [nrRowLeave],
		});

		this.playerHands.clear();
		this.commonCards = [];
		if (this.players.length <= 1) {
			await this.endGameSuccess();
			return;
		}
		if (this.round > 0) await sleep(timeBetweenRounds); // wait before starting next round
		if (this.aborted) return;
		// check for 1 player again in case people left
		if (this.players.length <= 1) {
			await this.endGameSuccess();
			return;
		}

		// Remove duplicates from players
		this.players = [...new Set(this.players)];

		// DEAL CARDS TO PLAYERS
		for (const p of this.players) {
			const hand: ExtCard[] = spliceRandom(
				deck,
				this.playerCardsEntitled.get(p)
			);
			hand.sort((a, b) => a.value - b.value);
			// // for debugging: give black joker to host
			// if (p === this.hostId) {
			// 	hand.push({ suit: "bj", value: 1 });
			// }
			this.playerHands.set(p, hand);
		}

		// SET THE COMMON CARDS
		if (this.commonCardsAmount !== 0) {
			this.commonCards = spliceRandom(deck, acCCAmount);
			this.commonCards.sort((a, b) => a.value - b.value);
		}

		await this.newRoundMsg.edit({
			embeds: [this.newRoundEmbed(false)],
			components:
				this.round === 0
					? []
					: this.allowJoinMidGame
					? [nrRowJoinDisabled]
					: [nrRowLeaveDisabled],
		});

		this.callsOpen = true;
		this.bsCalled = false;
		this.round += 1;
		this.currentCall = null;
		this.sendNewNotif();
	}

	handleBS() {
		const bserHand = this.playerHands.get(this.bserInteraction.user.id);
		const bserHasRJ =
			this.useSpecialCards && bserHand.some(card => card.suit === "rj");

		const callIsTrue = callInDeck(this.currentCall.call, this.currentDeck());

		let cardGainer = this.currentPlayer;

		if (callIsTrue) {
			cardGainer = this.bserInteraction.user.id;
			this.interaction.channel.send({
				content: `:green_circle: <@${this.currentCall.player}> was telling the truth! <@${cardGainer}> gains 1 card.`,
			});
			this.playerCardsEntitled.set(
				cardGainer,
				this.playerCardsEntitled.get(cardGainer) + 1
			);
		} else {
			this.interaction.channel.send({
				content: `:red_circle: <@${this.currentCall.player}> was lying! They gain 1 card.`,
			});
			cardGainer = this.currentCall.player;
			this.playerCardsEntitled.set(
				cardGainer,
				this.playerCardsEntitled.get(cardGainer) + 1
			);
			if (bserHasRJ && this.bserInteraction.user.id !== this.currentPlayer) {
				if (bserHand.length === 1) {
					this.interaction.channel.send({
						content: `${this.bserInteraction.user} had a red joker and cross-BSed! However, they only had 1 card, so they do not lose any cards.`,
					});
				} else {
					this.interaction.channel.send({
						content: `${this.bserInteraction.user} had a red joker! Since they cross-BSed, they lose 1 card.`,
					});
					this.playerCardsEntitled.set(
						this.bserInteraction.user.id,
						this.playerCardsEntitled.get(this.bserInteraction.user.id) - 1
					);
				}
			}
		}

		this.currentPlayer = cardGainer;
		this.currentPlayerIndex = this.players.indexOf(cardGainer);
		this.newRound();
	}

	async takeBets() {
		if (!this.startingBet) return;
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
		this.totalBet = this.players.length * this.startingBet;
	}

	async returnBets() {
		if (!this.startingBet) return;
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
			},
		});
	}

	async gameLogic() {
		this.msgColl = this.interaction.channel.createMessageCollector({
			time: 3_600_000,
		});
		this.mcompColl = this.interaction.channel.createMessageComponentCollector({
			time: 3_600_000,
			componentType: ComponentType.Button,
			filter: i => customIdValues.includes(i.customId),
		});
		for (const p of this.players) {
			this.playerCardsEntitled.set(p, this.beginCards);
		}
		await this.takeBets();
		this.newRound(); // start the game with the 1st round

		this.msgColl.on("collect", async msg => {
			if (
				msg.author.id === this.hostId &&
				msg.content.toLowerCase() === "abort"
			) {
				await msg.reply({
					content: "Game aborted.",
				});
				await this.abort();
				return;
			}

			if (this.bxOpen && msg.author.id === this.bserInteraction.user.id) {
				const cardNumber = parseInt(msg.content);
				if (
					invalidNumber(cardNumber) ||
					cardNumber < 0 ||
					cardNumber > this.commonCards.length
				)
					return;
				if (cardNumber === 0) {
					await msg.reply({
						content: "You have chosen not to take any card.",
					});
				} else {
					const card = this.commonCards.splice(cardNumber - 1, 1)[0];
					await msg.reply({
						content: `You have taken the card **${formatCardSideways(card)}**.`,
					});
				}
				this.disableBX();
				this.handleBS();
				return;
			}

			if (!this.callsOpen) return;
			if (msg.author.id !== this.currentPlayer) return;

			const call = parseCall(msg.content);
			if (!this.validateAndRespond(call, msg)) return;

			this.disableNotif();
			this.currentCall = { call, player: this.currentPlayer };

			this.forward(); // go to the next player with callsOpen remaining true.
			await this.sendNewNotif();
		});

		this.mcompColl.on("collect", async buttonInteraction => {
			if (!this.callsOpen) {
				if (buttonInteraction.customId === customIds.viewCards) {
					await buttonInteraction.reply({
						content: "Please wait for the round to begin to view your cards.",
						ephemeral: true,
					});
					return;
				}
				if (buttonInteraction.customId === customIds.bs) {
					await buttonInteraction.reply({
						content:
							"The BS button is disabled as a new round has not yet started.",
						ephemeral: true,
					});
					return;
				}
				this.handleJoinLeave(buttonInteraction);
				return;
			}
			const cd = this.currentDeck();
			if (!cd || cd.length === 0) return;
			if (!this.players.includes(buttonInteraction.user.id)) {
				let toSendN = "*You are not a player in this game.*";
				if (this.commonCards.length > 0)
					toSendN += `\nCommon Cards:\n${formatDeck(this.commonCards)}`;
				const channelTeams = bsPokerTeams.get(this.interaction.channelId);
				toSendN += (() => {
					if (channelTeams.length === 0) return "";
					const team = channelTeams.find(t =>
						t.includes(buttonInteraction.user.id)
					);
					if (!team) return "";
					const teamPlayerInGame = team.find(p => this.players.includes(p));
					if (!teamPlayerInGame) return "";
					const teammateHand = this.playerHands.get(teamPlayerInGame);
					if (!teammateHand) return "";
					return `\n*<@${teamPlayerInGame}> is your teammate. Here are their cards.*\n${formatDeck(
						teammateHand
					)}`;
				})();

				if (this.useSpecialCards) toSendN += `\n${this.formatPWSC()}`;
				await buttonInteraction.reply({
					content: toSendN,
					ephemeral: true,
				});
				return;
			}
			if (buttonInteraction.customId === customIds.viewCards) {
				await buttonInteraction.reply({
					content: `**Your Hand:**\n${formatDeck(
						this.playerHands.get(buttonInteraction.user.id)
					)}\n**Common Cards:** ${
						this.commonCards.length === 0
							? "None"
							: `\n${formatDeck(this.commonCards)}`
					}${this.useSpecialCards ? `\n\n${this.formatPWSC()}` : ""}`,
					ephemeral: true,
				});
				return;
			}

			// BS button
			if (buttonInteraction.customId !== customIds.bs) return;
			if (this.bsCalled) {
				await buttonInteraction.reply({
					content:
						"Sorry, another player seems to have pressed the BS button before you.",
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
			this.bserInteraction = buttonInteraction;

			const playerWBJ = this.playerHands
				.filter(hand => hand.some(card => card.suit === "bj"))
				.firstKey();

			// If the player has a black joker
			if (
				playerWBJ &&
				playerWBJ !== this.currentCall.player &&
				this.commonCards.length > 0
			) {
				await this.blackJokerBS(playerWBJ);
			} else {
				this.handleBS();
			}
		});
	}
}

export default BSPoker;
