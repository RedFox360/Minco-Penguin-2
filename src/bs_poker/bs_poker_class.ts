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
	formatDeck,
	isHigher,
	median,
	parseCall,
} from "./bs_poker_functions.js";
import { promisify } from "util";

const allowedTime = 60_000;
const timeBetweenRounds = 12_000;

class BSPoker {
	interaction: ChatInputCommandInteraction<"cached">;
	players: string[];
	cardsToOut: number;
	commonCardsAmount: number;
	jokerCount: number;
	insuranceCount: number;
	beginCards: number;
	gameStatus: number = 0;
	playerHands: PlayerHands;
	playerCardsEntitled: Collection<Snowflake, number>;
	currentCall: PlayerCall | null = null;
	commonCards: Deck;

	constructor(
		interaction: ChatInputCommandInteraction<"cached">,
		players: string[],
		cardsToOut: number,
		commonCardsAmount: number,
		jokerCount: number,
		insuranceCount: number,
		beginCards: number
	) {
		this.interaction = interaction;
		this.players = players;
		this.cardsToOut = cardsToOut;
		this.commonCardsAmount = commonCardsAmount;
		this.jokerCount = jokerCount;
		this.insuranceCount = insuranceCount;
		this.beginCards = beginCards;

		this.playerHands = new Collection<Snowflake, Deck>();
		this.playerCardsEntitled = new Collection<Snowflake, number>();
		this.commonCards = [];
	}

	createDeck() {
		const suits: Suit[] = ["H", "D", "C", "S"];
		const values: Value[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
		const deck: Deck = [];
		for (let i = 0; i < this.jokerCount; i++) {
			deck.push({ suit: "j", value: 0 });
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
					.map((hand, player) => `<@${player}>: **${formatDeck(hand, true)}**`)
					.join("\n");

				this.interaction.channel.send({
					embeds: [
						new EmbedBuilder()
							.setTitle("Hands from Last Round")
							.setDescription(
								`Common Cards: ${
									this.commonCards.length === 0
										? "None"
										: `**${formatDeck(this.commonCards, true)}**`
								}\n${handsList}`
							)
							.setColor(0x7289da),
					],
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
			if (this.gameStatus === -1 || this.gameStatus >= this.players.length) {
				this.gameStatus = 0;
			}
			const embedCreator = (x: string) =>
				new EmbedBuilder()
					.setTitle("New Round")
					.setDescription(
						`Common Cards: ${x}\n<@${
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
			const joinMidGame = new ButtonBuilder()
				.setStyle(ButtonStyle.Success)
				.setLabel("Join")
				.setCustomId("join_mid_game");
			const leaveMidGame = new ButtonBuilder()
				.setStyle(ButtonStyle.Danger)
				.setLabel("Leave")
				.setCustomId("leave_mid_game");

			const roundBeginTime = Date.now() + timeBetweenRounds;

			const jrow = new ActionRowBuilder<ButtonBuilder>().addComponents(
				joinMidGame,
				leaveMidGame
			);
			const newRoundMsg = await this.interaction.channel.send({
				embeds: [
					embedCreator(
						round > 0
							? `will be shown ${time(
									Math.floor(roundBeginTime / 1000),
									TimestampStyles.RelativeTime
							  )}`
							: ""
					),
				],
				components: round === 0 ? [] : [jrow],
			});

			const joinCollector = newRoundMsg.createMessageComponentCollector({
				filter: i =>
					i.customId === "join_mid_game" || i.customId === "leave_mid_game",
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
					this.players.push(buttonInteraction.user.id);
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
											Math.floor(roundBeginTime / 1000),
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
					this.players = this.players.filter(
						player => player !== buttonInteraction.user.id
					);
					this.playerCardsEntitled.delete(buttonInteraction.user.id);
					await buttonInteraction.reply({
						content: `<@${buttonInteraction.user.id}> has left the game.`,
					});
					await newRoundMsg.edit({
						embeds: [
							embedCreator(
								round > 0
									? `will be shown ${time(
											Math.floor(roundBeginTime / 1000),
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

			this.players.forEach(async p => {
				const hand: Deck = [];
				for (let i = 0; i < this.playerCardsEntitled.get(p); i++) {
					const cardIndex = Math.floor(Math.random() * deck.length);
					hand.push(deck[cardIndex]);
					deck.splice(cardIndex, 1);
				}
				this.playerHands.set(p, hand);
				// For debugging: Prints the hand of each player
				// await interaction.channel.send(`<@${p}>\n${formatDeck(hand)}`);
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
								? `**${formatDeck(this.commonCards)}**`
								: "None"
						}`
					),
				],
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						joinMidGame.setDisabled(),
						leaveMidGame.setDisabled()
					),
				],
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
		if (this.gameStatus >= this.players.length) this.gameStatus = 0;
		let currentPlayer = this.players[this.gameStatus];
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

		const timeUp = Date.now() + allowedTime;
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
				` Please type your call ${time(
					Math.floor(timeUp / 1000),
					TimestampStyles.RelativeTime
				)}.`,
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
			if (!this.players.includes(buttonInteraction.user.id)) {
				await buttonInteraction.reply({
					content: "You are not a player in this game.",
					ephemeral: true,
				});
				return;
			}
			if (buttonInteraction.customId === "view_cards") {
				await buttonInteraction.reply({
					content: `Your Hand: **${formatDeck(
						this.playerHands.get(buttonInteraction.user.id)
					)}**\nCommon Cards: ${
						this.commonCards.length === 0
							? "None"
							: `**${formatDeck(this.commonCards)}**`
					}`,
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
			await buttonInteraction.reply({
				content: `BS called by <@${buttonInteraction.user.id}>!`,
			});

			const currentDeck: Deck = [].concat(
				...Array.from(this.playerHands.values())
			);
			currentDeck.push(...this.commonCards);
			const callIsTrue = callInDeck(this.currentCall.call, currentDeck);

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
			}
			roundOver = true;
			hasCalled = true;
			msgCollector.stop();

			return;
		});

		msgCollector.on("collect", async message => {
			if (
				(message.author.id === this.interaction.user.id ||
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
			const call = parseCall(message.content);
			if (!call || call.call == undefined || (call.call as any) === -1) {
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
				call.call === HandRank.DoubleTriple
			) {
				const highCards = call.high as [Value, Value];
				if (highCards[0] === highCards[1]) {
					message.reply({
						content: `Double pairs and triples must have different values (Your call: ${formatCall(
							call
						)}). Please try again.`,
					});
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
					message.reply({
						content: `Triple pairs must have 3 unique values (Your call: ${formatCall(
							call
						)}). Please try again.`,
					});
					return;
				}
			}
			if (call.call === HandRank.DoubleFlush) {
				const highCards = call.high as [Card, Card];
				if (highCards[0].suit === highCards[1].suit) {
					message.reply({
						content: `Double flushes must have different suits (Your call: ${formatCall(
							call
						)}). Please try again.`,
					});
					return;
				}

				if (
					this.insuranceCount < 2 &&
					highCards[0].value === highCards[1].value &&
					highCards[0].value === 15
				) {
					message.reply({
						content: `There are not enough insurance cards in the deck for a double insurance call (Your call: ${formatCall(
							call
						)}). Please try again.`,
					});
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
		if (this.gameStatus >= this.players.length - 1) this.gameStatus = 0;
		else this.gameStatus++;

		await this.handlePlayerTurns();
	}
}

export default BSPoker;
