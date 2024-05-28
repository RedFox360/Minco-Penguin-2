import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Collection,
	EmbedBuilder,
	PermissionFlagsBits,
	Snowflake,
	TimestampStyles,
	time,
} from "discord.js";
import {
	Card,
	Deck,
	HandRank,
	PlayerCall,
	PlayerHands,
	Suit,
	Value,
} from "./bs_poker_types.js";
import {
	callInDeck,
	collectorEnd,
	formatCall,
	formatCardSideways,
	formatDeck,
	highestCallInDeck,
	invalidNumber,
	isHigher,
	median,
	parseCall,
	replyThenDelete,
} from "./bs_poker_functions.js";
import { promisify } from "util";

const allowedTime = 60_000;
const timeBetweenRounds = 12_000;
const timeToTakeCard = 20_000;
const joinMidGame = new ButtonBuilder()
	.setStyle(ButtonStyle.Success)
	.setLabel("Join")
	.setCustomId("join_mid_game");
const leaveMidGame = new ButtonBuilder()
	.setStyle(ButtonStyle.Danger)
	.setLabel("Leave")
	.setCustomId("leave_mid_game");

const joinMidGameDisabled = new ButtonBuilder(
	joinMidGame.toJSON()
).setDisabled();
const leaveMidGameDisabled = new ButtonBuilder(
	leaveMidGame.toJSON()
).setDisabled();

const jrow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	joinMidGame,
	leaveMidGame
);
const lrow = new ActionRowBuilder<ButtonBuilder>().addComponents(leaveMidGame);
const djrow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	joinMidGameDisabled,
	leaveMidGameDisabled
);
const dlrow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	leaveMidGameDisabled
);

class BSPoker {
	private interaction: ChatInputCommandInteraction<"cached">;
	private everPlayers: string[];
	private players: string[];

	// OPTIONS
	private cardsToOut: number;
	private commonCardsAmount: number;
	private jokerCount: number;
	private insuranceCount: number;
	private beginCards: number;
	private playerLimit: number;
	private allowJoinMidGame: boolean;
	private useSpecialCards: boolean;

	private _gameStatus: number = 0;
	private playerHands: PlayerHands;
	private playerCardsEntitled: Collection<Snowflake, number>;
	private currentCall: PlayerCall | null = null;
	private commonCards: Deck;
	private hostId: string;

	constructor(
		interaction: ChatInputCommandInteraction<"cached">,
		players: string[],
		cardsToOut: number,
		commonCardsAmount: number,
		jokerCount: number,
		insuranceCount: number,
		beginCards: number,
		allowJoinMidGame: boolean,
		playerLimit: number,
		useSpecialCards: boolean
	) {
		this.interaction = interaction;
		this.players = players;
		this.everPlayers = players;
		this.cardsToOut = cardsToOut;
		this.commonCardsAmount = commonCardsAmount;
		this.jokerCount = jokerCount;
		this.insuranceCount = insuranceCount;
		this.beginCards = beginCards;
		this.allowJoinMidGame = allowJoinMidGame;
		this.playerLimit = playerLimit;
		this.useSpecialCards = useSpecialCards;

		this.playerHands = new Collection<Snowflake, Deck>();
		this.playerCardsEntitled = new Collection<Snowflake, number>();
		this.commonCards = [];
		this.hostId = interaction.user.id;
	}

	get gameStatus() {
		if (this._gameStatus === -1) return 0;
		if (this._gameStatus >= this.players.length) return 0;
		return this._gameStatus;
	}

	set gameStatus(status: number) {
		if (status === -1 || status >= this.players.length) this._gameStatus = 0;
		this._gameStatus = status;
	}

	currentDeck() {
		const currentDeck: Deck = [].concat(
			...Array.from(this.playerHands.values())
		);
		currentDeck.push(...this.commonCards);
		return currentDeck;
	}

	createDeck() {
		const suits: Suit[] = ["H", "D", "C", "S"];
		const values: Value[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
		const deck: Deck = [];
		for (let i = 0; i < this.jokerCount; i++) {
			deck.push({ suit: "j", value: 0 });
		}
		if (this.useSpecialCards) {
			deck.push({ suit: "bj", value: 0 });
			deck.push({ suit: "rj", value: 0 });
		}
		for (const suit of suits) {
			for (const value of values) {
				deck.push({ suit, value });
			}
		}
		for (let i = 0; i < this.insuranceCount; i++) {
			deck.push({ suit: "i", value: 15 });
		}
		return deck;
	}

	formatPWSC() {
		if (!this.useSpecialCards) return "";
		if (this.playerHands.size === 0) return "";
		const pwsc = this.players.filter(p =>
			this.playerHands.get(p).some(c => c.suit === "bj" || c.suit === "rj")
		);
		return `Players with Special Cards: ${
			pwsc.length === 0 ? "None" : pwsc.map(p => `<@${p}>`).join(" ")
		}`;
	}

	async gameLogic() {
		let deck: Deck;
		let round = 0;
		this.players.forEach(p => this.playerCardsEntitled.set(p, this.beginCards));

		while (this.players.length > 1) {
			deck = this.createDeck();

			if (this.gameStatus === -2) {
				return;
			}
			if (round > 0 && this.playerHands.size > 0) {
				// Print everyone's hands
				const handsList = this.playerHands
					.map((hand, player) => `<@${player}>\n${formatDeck(hand)}`)
					.join("\n");

				const getHandsEmbed = (x: string | null = null) =>
					new EmbedBuilder()
						.setTitle("Hands from Last Round")
						.setDescription(
							`Common Cards: ${
								this.commonCards.length === 0
									? "None"
									: `\n${formatDeck(this.commonCards)}`
							}\n${handsList}${x ? `\n\n${x}` : ""}`
						)
						.setColor(0x7289da);

				this.interaction.channel
					.send({
						embeds: [getHandsEmbed()],
					})
					.then(handsMsg => {
						highestCallInDeck(this.currentDeck()).then(call => {
							handsMsg.edit({
								embeds: [
									getHandsEmbed(`Highest Call: **${formatCall(call)}**`),
								],
							});
						});
					});
			}
			this.players.forEach(p => {
				const entitled = this.playerCardsEntitled.get(p);
				if (
					entitled >= this.cardsToOut ||
					Number.isNaN(entitled) ||
					!entitled
				) {
					this.interaction.channel.send(`<@${p}> is out of the game.`);
					this.playerCardsEntitled.delete(p);
					this.players = this.players.filter(player => player !== p);
				}
			});
			if (this.players.length <= 1) {
				break;
			}

			const embedCreator = (x = "", y = "") => {
				return new EmbedBuilder()
					.setTitle("New Round")
					.setDescription(
						`Common Cards: ${x}\n${y}\n<@${
							this.players[this.gameStatus]
						}> will start the round.`
					)
					.addFields({
						name: "Players",
						value: `${this.players
							.map(p => `<@${p}>: ${this.playerCardsEntitled.get(p)} cards`)
							.join("\n")}`,
					})
					.setColor(0x58d68d);
			};

			const roundBeginTime = Math.floor(
				(Date.now() + timeBetweenRounds) / 1000
			);

			const newRoundMsg = await this.interaction.channel.send({
				embeds: [
					embedCreator(
						round > 0
							? `will be shown ${time(
									roundBeginTime,
									TimestampStyles.RelativeTime
							  )}`
							: ""
					),
				],
				components: round === 0 ? [] : this.allowJoinMidGame ? [jrow] : [lrow],
			});

			const joinCollector = newRoundMsg.createMessageComponentCollector({
				filter: i =>
					(this.allowJoinMidGame && i.customId === "join_mid_game") ||
					i.customId === "leave_mid_game",
				time: timeBetweenRounds,
			});

			joinCollector.on("collect", async buttonInteraction => {
				if (buttonInteraction.customId === "join_mid_game") {
					if (this.players.includes(buttonInteraction.user.id)) {
						await buttonInteraction.reply({
							content: "You are already in the game.",
							ephemeral: true,
						});
						return;
					}
					if (this.everPlayers.includes(buttonInteraction.user.id)) {
						await buttonInteraction.reply({
							content: "You have already played in this game.",
							ephemeral: true,
						});
						return;
					}
					if (this.players.length >= this.playerLimit) {
						await buttonInteraction.reply({
							content: `Sorry, the player limit of ${this.playerLimit} has been reached.`,
							ephemeral: true,
						});
						return;
					}
					this.players.push(buttonInteraction.user.id);
					this.everPlayers.push(buttonInteraction.user.id);
					const startingAmount = Math.max(...this.playerCardsEntitled.values());
					this.playerCardsEntitled.set(
						buttonInteraction.user.id,
						startingAmount
					);
					await buttonInteraction.reply({
						content: `<@${buttonInteraction.user.id}>, you have joined the game at ${startingAmount} cards.`,
					});
					await newRoundMsg.edit({
						embeds: [
							embedCreator(
								round > 0
									? `will be shown ${time(
											roundBeginTime,
											TimestampStyles.RelativeTime
									  )}`
									: ""
							),
						],
					});

					return;
				}
				if (buttonInteraction.customId === "leave_mid_game") {
					if (!this.players.includes(buttonInteraction.user.id)) {
						await buttonInteraction.reply({
							content: "You are not in the game.",
							ephemeral: true,
						});
						return;
					}
					let toAppend = "";
					this.players = this.players.filter(
						player => player !== buttonInteraction.user.id
					);
					if (buttonInteraction.user.id === this.interaction.user.id) {
						this.hostId = this.players[0];
						toAppend = ` They were the host, so the host has been transferred to <@${this.hostId}>.`;
						return;
					}
					this.playerCardsEntitled.delete(buttonInteraction.user.id);
					await buttonInteraction.reply({
						content: `<@${buttonInteraction.user.id}> has left the game.${toAppend}`,
					});
					await newRoundMsg.edit({
						embeds: [
							embedCreator(
								round > 0
									? `will be shown ${time(
											roundBeginTime,
											TimestampStyles.RelativeTime
									  )}`
									: ""
							),
						],
					});
					return;
				}
			});

			this.playerHands.clear();
			this.commonCards = [];
			// remove all players from playerHands and playerCardsEntitled whose amount of cards is greater than or equal to the cardsToOut
			if (this.players.length <= 1) {
				break;
			}

			if (round > 0) await promisify(setTimeout)(timeBetweenRounds); // wait 5 seconds before starting next round

			if (this.players.length <= 1) {
				break;
			}

			// Remove duplicates from players
			this.players = [...new Set(this.players)];

			// GIVE CARDS TO PLAYERS
			this.players.forEach(async p => {
				const hand: Deck = [];
				for (let i = 0; i < this.playerCardsEntitled.get(p); i++) {
					const cardIndex = Math.floor(Math.random() * deck.length);
					hand.push(deck[cardIndex]);
					deck.splice(cardIndex, 1);
				}
				this.playerHands.set(p, hand);
			});

			if (this.commonCardsAmount !== 0) {
				const actualAmount =
					this.commonCardsAmount > 0
						? this.commonCardsAmount
						: Math.floor(median(Array.from(this.playerCardsEntitled.values())));
				for (let i = 0; i < actualAmount; i++) {
					const cardIndex = Math.floor(Math.random() * deck.length);
					this.commonCards.push(deck[cardIndex]);
					deck.splice(cardIndex, 1);
				}
			}

			await newRoundMsg.edit({
				embeds: [
					embedCreator(
						`${
							this.commonCards.length > 0
								? `\n${formatDeck(this.commonCards)}`
								: "None"
						}`,
						this.formatPWSC()
					),
				],
				components:
					round === 0 ? [] : this.allowJoinMidGame ? [djrow] : [dlrow],
			});

			await this.handlePlayerTurns();

			round += 1;
			this.currentCall = null;
		}

		await this.interaction.channel.send({
			embeds: [
				new EmbedBuilder()
					.setTitle("Game Over!")
					.setDescription(
						`<@${this.players[0]}> has won the game! Congratulations!`
					)
					.setColor(0x58d68d),
			],
		});
		return;
	}

	async handlePlayerTurns() {
		const currentPlayer = this.players[this.gameStatus];
		let roundOver = false;
		let cardGainer: Snowflake | null = null;
		let aborted = false;

		const viewCardsButton = new ButtonBuilder()
			.setCustomId("view_cards")
			.setLabel("View Cards")
			.setStyle(ButtonStyle.Secondary);
		const bsButton = new ButtonBuilder()
			.setCustomId("bs")
			.setLabel("BS")
			.setStyle(ButtonStyle.Danger);

		const getRow = (disabled: boolean) => {
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				viewCardsButton
			);
			if (this.currentCall) row.addComponents(bsButton.setDisabled(disabled));
			return row;
		};

		const timeUp = Math.floor((Date.now() + allowedTime) / 1000);
		const msgContent = `${
			this.currentCall
				? `<@${this.currentCall.player}> has called **${formatCall(
						this.currentCall.call
				  )}**.\n`
				: ""
		}<@${currentPlayer}>, it is your turn.`;
		const msg = await this.interaction.channel.send({
			content:
				msgContent +
				` Please type your call ${time(timeUp, TimestampStyles.RelativeTime)}.`,
			components: [getRow(false)],
		});

		const buttonCollector = msg.createMessageComponentCollector({
			filter: i => i.customId === "view_cards" || i.customId === "bs",
			time: allowedTime,
		});

		let hasCalled = false;
		let hasCalledBS = false;
		const msgCollector = this.interaction.channel.createMessageCollector({
			time: allowedTime,
		});

		buttonCollector.on("collect", async buttonInteraction => {
			const cd = this.currentDeck();
			if (!cd || cd.length === 0) return;
			if (!this.players.includes(buttonInteraction.user.id)) {
				let toSendN = "*You are not a player in this game.*";
				if (this.commonCards.length > 0)
					toSendN += `\nCommon Cards:\n${formatDeck(this.commonCards)}`;
				if (this.useSpecialCards) toSendN += `\n${this.formatPWSC()}`;
				await buttonInteraction.reply({
					content: toSendN,
					ephemeral: true,
				});
				return;
			}
			if (buttonInteraction.customId === "view_cards") {
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
			if (hasCalledBS) {
				await buttonInteraction.reply({
					content:
						"Sorry, another player seems to have pressed the BS button before you.",
					ephemeral: true,
				});
				return;
			}
			if (buttonInteraction.user.id === this.currentCall.player) {
				await buttonInteraction.reply({
					content: "You cannot call BS on your own call.",
					ephemeral: true,
				});
				return;
			}
			hasCalledBS = true;
			await msg.edit({
				content: msgContent,
				components: [getRow(true)],
			});

			const bserHand = this.playerHands.get(buttonInteraction.user.id);
			const playerWBJ = this.playerHands
				.filter(hand => hand.some(card => card.suit === "bj"))
				.firstKey();
			const bserHasRJ =
				this.useSpecialCards && bserHand.some(card => card.suit === "rj");

			await buttonInteraction.reply({
				content: `BS called by <@${buttonInteraction.user.id}>!`,
			});

			if (
				playerWBJ &&
				playerWBJ !== this.currentCall.player &&
				this.commonCards.length > 0
			) {
				// Black Joker

				if (this.commonCards.length === 1) {
					await this.interaction.channel.send({
						content: `<@${playerWBJ}> had a black joker. There is 1 common card, so they will take it: **${formatCardSideways(
							this.commonCards[0]
						)}**.`,
					});
					this.commonCards = [];
				} else {
					const timeUpToTakeCard = Math.floor(
						(Date.now() + timeToTakeCard) / 1000
					);
					const commonCardsFormattedWithNumbers = this.commonCards
						.map((card, i) => `\`${i + 1}\` **${formatCardSideways(card)}**`)
						.join("\n");
					const mainContent = `<@${playerWBJ}>, you had a black joker! You get to remove 1 common card from the deck.\n${commonCardsFormattedWithNumbers}`;
					const blackJokerMsg = await this.interaction.channel.send({
						content:
							mainContent +
							`\n*Please type the number of the card you want to remove* ${time(
								timeUpToTakeCard,
								TimestampStyles.RelativeTime
							)}.\nIf you do not want to take any card, type \`0\`.`,
					});
					let hasMadeBJCall = false;
					const bsBjCollector = this.interaction.channel.createMessageCollector(
						{
							time: timeToTakeCard,
							filter: m => m.author.id === playerWBJ,
						}
					);

					bsBjCollector.on("collect", async message => {
						if (hasMadeBJCall) return;
						const cardNumber = parseInt(message.content);
						if (
							invalidNumber(cardNumber) ||
							cardNumber < 0 ||
							cardNumber > this.commonCards.length
						)
							return;
						if (cardNumber === 0) {
							await message.reply({
								content: "You have chosen not to take any card.",
							});
						} else {
							const card = this.commonCards.splice(cardNumber - 1, 1)[0];
							await message.reply({
								content: `You have taken the card **${formatCardSideways(
									card
								)}**.`,
							});
						}
						hasMadeBJCall = true;
						await blackJokerMsg.edit({ content: mainContent });
						bsBjCollector.stop();
					});

					await collectorEnd(bsBjCollector);

					if (!hasMadeBJCall) {
						await this.interaction.channel.send({
							content: `<@${playerWBJ}> failed to take a card in time. They will not take any card.`,
						});
						await blackJokerMsg.edit({ content: mainContent });
					}

					setTimeout(() => {
						blackJokerMsg.edit({ content: mainContent });
					});
				}
			}

			const callIsTrue = callInDeck(this.currentCall.call, this.currentDeck());

			if (callIsTrue) {
				await this.interaction.channel.send({
					content: `<@${this.currentCall.player}> was telling the truth! <@${buttonInteraction.user.id}> gains 1 card.`,
				});
				cardGainer = buttonInteraction.user.id;
				this.playerCardsEntitled.set(
					buttonInteraction.user.id,
					this.playerCardsEntitled.get(buttonInteraction.user.id) + 1
				);
			} else {
				await this.interaction.channel.send({
					content: `<@${this.currentCall.player}> was lying! They gain 1 card.`,
				});
				cardGainer = this.currentCall.player;
				this.playerCardsEntitled.set(
					this.currentCall.player,
					this.playerCardsEntitled.get(this.currentCall.player) + 1
				);
				if (bserHasRJ && buttonInteraction.user.id !== currentPlayer) {
					if (bserHand.length === 1) {
						await this.interaction.channel.send({
							content: `<@${buttonInteraction.user.id}> had a red joker and cross-BSed! However, they only had 1 card, so they do not lose any cards.`,
						});
					} else {
						await this.interaction.channel.send({
							content: `<@${buttonInteraction.user.id}> had a red joker! Since they cross-BSed, they lose 1 card.`,
						});
						this.playerCardsEntitled.set(
							buttonInteraction.user.id,
							this.playerCardsEntitled.get(buttonInteraction.user.id) - 1
						);
					}
				}
			}
			roundOver = true;
			hasCalled = true;
			msgCollector.stop();

			return;
		});

		msgCollector.on("collect", async message => {
			if (
				(message.author.id === this.hostId ||
					message.member.permissions.has(PermissionFlagsBits.ManageMessages)) &&
				!message.author.bot &&
				message.content.toLowerCase() === "abort"
			) {
				await message.reply({
					content: "Game aborted.",
				});
				aborted = true;
				hasCalled = true;
				msgCollector.stop();
				return;
			}
			if (message.author.id !== currentPlayer) return;
			if (hasCalledBS) return;
			const call = parseCall(message.content);
			if (!call || call.call == null || (call.call as any) === -1) {
				// Call could not be parsed
				return;
			}
			if (this.currentCall) {
				if (!isHigher(call, this.currentCall.call)) {
					message.reply({
						content: `Your call is not higher than the current call (${formatCall(
							this.currentCall.call
						)}). Please try again.`,
					});
					return;
				}
			}
			if (
				call.call === HandRank.DoublePair ||
				call.call === HandRank.DoubleTriple ||
				call.call === HandRank.FullHouse
			) {
				const highCards = call.high as [Value, Value];
				if (highCards[0] === highCards[1]) {
					replyThenDelete(
						message,
						`Double pairs, triples, and full houses must have different values (Your call: ${formatCall(
							call
						)}). Please try again.`
					);
					return;
				}
			}
			if (call.call === HandRank.TriplePair) {
				const highCards = call.high as [Value, Value, Value];
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

					return;
				}
			}
			if (call.call === HandRank.StraightFlush && call.high.value === 15) {
				replyThenDelete(
					message,
					`Sorry, but Insurance-High Straight Flushes are not allowed (Your call: ${formatCall(
						call
					)}). Please try again.`
				);
				return;
			}
			if (call.call === HandRank.DoubleFlush) {
				const highCards = call.high as [Card, Card];
				if (highCards[0].suit === highCards[1].suit) {
					replyThenDelete(
						message,
						`Double flushes must have different suits (Your call: ${formatCall(
							call
						)}). Please try again.`
					);
					return;
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
					return;
				}
			}
			await msg.edit({
				content: msgContent,
				components: [getRow(true)],
			});
			this.currentCall = { call, player: currentPlayer };
			hasCalled = true;
			msgCollector.stop();
		});

		await collectorEnd(msgCollector);

		if (aborted) {
			this.gameStatus = -2;
			return;
		}
		if (roundOver) {
			this.gameStatus = this.players.indexOf(cardGainer);
			return;
		}

		if (!hasCalled) {
			await this.interaction.channel.send({
				content: `<@${currentPlayer}> failed to make a call in time. They gain a card and a new round will start now.`,
			});
			await msg.edit(msgContent);

			this.playerCardsEntitled.set(
				currentPlayer,
				this.playerCardsEntitled.get(currentPlayer) + 1
			);

			this.gameStatus = this.players.indexOf(currentPlayer);
			return;
		}

		this.gameStatus += 1;

		await this.handlePlayerTurns();
	}
}

export default BSPoker;
