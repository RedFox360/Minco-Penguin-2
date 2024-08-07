import {
	type APIEmbedField,
	type ButtonInteraction,
	type ChatInputCommandInteraction,
	type ColorResolvable,
	type InteractionCollector,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
} from "discord.js";
import { type Card } from "../cards/basic_card_types.js";
import { createBasicDeck, formatDeck } from "../cards/basic_card_functions.js";
import { colors, invalidNumber, spliceRandom, sleep } from "../util.js";
import { getProfile, updateProfile } from "../../prisma/models.js";

enum GameState {
	Game,
	Surrender,
	Blackjack,
}
enum Outcome {
	DealerBlackjack = -4,
	Loss = -3,
	Bust = -2,
	Surrender = -1,
	Draw = 0,
	DealerBust = 1,
	Win = 2,
	Blackjack = 3,
}
type HandValue = { total: number; soft: boolean };

const blackjackRatio = 1.5;
const timeToPlayGame = 240_000;
const customIds = {
	hit: "hit",
	stand: "stand",
	doubleDown: "double_down",
	split: "split",
	surrender: "surrender",
	continue: "continue",
	endSession: "end_session",
	modal: "change_bet_modal",
	betInput: "bet_input",
	editBet: "edit_bet",
};
const howToPlayButton = new ButtonBuilder()
	.setLabel("How to play")
	.setStyle(ButtonStyle.Link)
	.setURL("https://bicyclecards.com/how-to-play/blackjack/");

const customIdValues = Object.values(customIds);
export default class Blackjack {
	private playerHands: Card[][] = [];
	private focusedHand = 0;
	private dealerHand: Card[] = [];
	private bets: number[];
	private deck: Card[];
	private hitButton: ButtonBuilder;
	private standButton: ButtonBuilder;
	private doubleDownButton: ButtonBuilder;
	private splitButton: ButtonBuilder;
	private surrenderButton: ButtonBuilder;
	private continueButton: ButtonBuilder;
	private endSessionButton: ButtonBuilder;
	private editBetButton: ButtonBuilder;
	private currentCompState: GameState = GameState.Game;
	private mcompColl: InteractionCollector<ButtonInteraction>;
	private outcomes: Outcome[] = [];
	private betOutcomes: number[] = [];
	private session = 0;
	private sessionAborted = false;
	private newDeckCreated = true;

	public constructor(
		private interaction:
			| ChatInputCommandInteraction<"cached">
			| ButtonInteraction<"cached">,
		private startingBet: number,
		private isSession: boolean,
		private rounds: number,
		deck?: Card[],
		private totalEarnings = 0,
		private cardCount = 0
	) {
		this.bets = [startingBet];
		if (deck?.length > 20) {
			this.deck = deck;
			this.newDeckCreated = false;
		} else {
			this.deck = createBasicDeck();
			this.cardCount = 0;
		}
		this.hitButton = new ButtonBuilder()
			.setLabel("Hit")
			.setCustomId(customIds.hit)
			.setStyle(ButtonStyle.Primary);
		this.standButton = new ButtonBuilder()
			.setLabel("Stand")
			.setCustomId(customIds.stand)
			.setStyle(ButtonStyle.Success);
		this.doubleDownButton = new ButtonBuilder()
			.setLabel("Double Down")
			.setCustomId(customIds.doubleDown)
			.setStyle(ButtonStyle.Secondary);
		this.splitButton = new ButtonBuilder()
			.setLabel("Split")
			.setCustomId(customIds.split)
			.setStyle(ButtonStyle.Secondary);
		this.surrenderButton = new ButtonBuilder()
			.setLabel("Surrender")
			.setCustomId(customIds.surrender)
			.setStyle(ButtonStyle.Secondary);
		this.continueButton = new ButtonBuilder()
			.setLabel("Continue")
			.setCustomId(customIds.continue)
			.setStyle(ButtonStyle.Success);
		this.endSessionButton = new ButtonBuilder()
			.setLabel("End Session")
			.setCustomId(customIds.endSession)
			.setStyle(ButtonStyle.Secondary);
		this.editBetButton = new ButtonBuilder()
			.setLabel("Edit Bet")
			.setCustomId(customIds.editBet)
			.setStyle(ButtonStyle.Secondary);
	}

	private get gameMsgComponents() {
		const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			this.hitButton,
			this.standButton,
			this.doubleDownButton,
			this.splitButton
		);
		const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
			this.surrenderButton
		);
		if (this.isSession) {
			row2.addComponents(this.endSessionButton, this.editBetButton);
		} else {
			row2.addComponents(howToPlayButton);
		}
		this.currentCompState = GameState.Game;
		return [row1, row2];
	}

	private get surrenderComponents() {
		this.currentCompState = GameState.Surrender;
		const rows = [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				this.surrenderButton,
				this.continueButton
			),
		];
		if (this.isSession)
			rows.push(
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					this.endSessionButton,
					this.editBetButton
				)
			);
		return rows;
	}

	private get blackjackComponents() {
		this.currentCompState = GameState.Blackjack;
		return [
			new ActionRowBuilder<ButtonBuilder>().addComponents(this.continueButton),
		];
	}

	private get currentComponents() {
		switch (this.currentCompState) {
			case GameState.Game:
				return this.gameMsgComponents;
			case GameState.Surrender:
				return this.surrenderComponents;
			case GameState.Blackjack:
				return this.blackjackComponents;
			default:
				return null;
		}
	}

	private gameMsg(earned?: number) {
		return {
			embeds: [this.getEmbed(earned)],
			components: earned == null ? this.gameMsgComponents : [],
		};
	}

	private surrenderMsg() {
		return {
			embeds: [this.getEmbed()],
			components: this.surrenderComponents,
		};
	}

	private fromBlackjackMsg(earned: number) {
		this.currentCompState = GameState.Blackjack;
		return {
			embeds: [this.getEmbed(earned)],
			components: this.blackjackComponents,
		};
	}

	private currentDeck() {
		return [this.playerHands, this.dealerHand].flat(2);
	}

	private currentCardCount() {
		const deck = this.currentDeck();
		let count = 0;
		for (const card of deck) {
			if (card.value >= 10) {
				count -= 1;
			} else if (card.value <= 6) {
				count += 1;
			}
		}
		return count;
	}

	private updateCardCount() {
		this.cardCount += this.currentCardCount();
	}

	private get withinPlayerTurn() {
		return this.outcomes?.length === 0 && this.betOutcomes?.length === 0;
	}

	private get visibleDealerHand() {
		if (this.withinPlayerTurn) return [this.dealerHand[0], null];
		return this.dealerHand;
	}

	private get isSplit() {
		return this.playerHands.length > 1;
	}

	private moneyEarned() {
		return this.betOutcomes.reduce((acc, i) => acc + i);
	}

	private get totalBet() {
		return this.bets.reduce((acc, i) => acc + i);
	}

	private getEmbed(earned?: number) {
		let description = "*Game in Progress*";
		let color: ColorResolvable = colors.blurple;
		if (!this.withinPlayerTurn) {
			color =
				earned > 0 ? colors.green : earned === 0 ? colors.yellow : colors.red;
		}

		if (this.withinPlayerTurn) {
			if (this.bets.length > 1)
				description = `Bet: **${this.bets.join("+")}** (${this.totalBet} MD)`;
			else description = `Bet: **${this.bets[0]} MD**`;
		} else if (earned != null) {
			description = `${Blackjack.displayBetOutcome(earned)}`;
		}
		if (this.isSession) {
			if (this.newDeckCreated) description += "\n*New Deck Created*";
			description += `\nRound \`${this.session + 1}\` | Card Count: \`${
				this.cardCount
			}\`\nTotal Earnings: \`${this.totalEarnings} MD\``;
		}

		const fields: APIEmbedField[] = this.playerHands.map(
			(hand, i): APIEmbedField => {
				const handVal = Blackjack.handValue(hand);
				let fieldValue = "";
				if (this.isSplit && this.focusedHand === i && this.withinPlayerTurn) {
					fieldValue += ":green_circle: `Focused`\n";
				}
				if (
					!this.withinPlayerTurn &&
					this.outcomes[i] != null &&
					this.betOutcomes[i] != null
				) {
					fieldValue += `${Blackjack.displayOutcome(this.outcomes[i])}\n`;
				}
				fieldValue += `${formatDeck(hand)}\nTotal: **${Blackjack.displayValue(
					handVal
				)}**`;
				return {
					name: this.isSplit ? `Your Hand ${i + 1}` : "Your Hand",
					value: fieldValue,
				};
			}
		);

		fields.push({
			name: "Minco Penguin",
			value: `${formatDeck(
				this.visibleDealerHand
			)}\nTotal: **${Blackjack.displayValue(
				Blackjack.handValue(this.visibleDealerHand)
			)}**`,
		});

		const embed = new EmbedBuilder()
			.setColor(color)
			.setAuthor({
				name: this.interaction.member.displayName,
				iconURL: this.interaction.member.displayAvatarURL(),
			})
			.setTitle(this.isSession ? "Blackjack Session" : "Blackjack")
			.setDescription(description)
			.setFields(fields);
		return embed;
	}

	private deal() {
		this.playerHands.push(spliceRandom(this.deck, 2));
		this.dealerHand.push(...spliceRandom(this.deck, 2));
		this.activateSplitButton();
	}

	private activateSplitButton() {
		const enableButton =
			this.currentHand.length === 2 &&
			this.currentHand[0].value === this.currentHand[1].value;
		this.splitButton.setDisabled(!enableButton);
	}

	private get currentHand() {
		return this.playerHands[this.focusedHand];
	}

	private setOutcomes() {
		const dealerHandTotal = Blackjack.handValue(this.dealerHand).total;
		const dealerHasBlackjack = Blackjack.hasBlackjack(this.dealerHand);

		const playerHasOneBlackjack =
			this.playerHands.length === 1 &&
			Blackjack.hasBlackjack(this.playerHands[0]);
		if (playerHasOneBlackjack) {
			this.outcomes = [dealerHasBlackjack ? Outcome.Draw : Outcome.Blackjack];
		} else {
			this.outcomes = this.playerHands.map(hand => {
				const handVal = Blackjack.handValue(hand).total;
				if (dealerHasBlackjack) return Outcome.DealerBlackjack;
				if (handVal === dealerHandTotal) return Outcome.Draw;
				if (handVal > 21) return Outcome.Bust;
				if (dealerHandTotal > 21) return Outcome.DealerBust;
				if (handVal > dealerHandTotal) return Outcome.Win;
				if (handVal < dealerHandTotal) return Outcome.Loss;
				return 0;
			});
		}
	}

	private async endPlayerTurn(
		bi: ChatInputCommandInteraction<"cached"> | ButtonInteraction<"cached">,
		surrendered = false,
		fromBlackjack = false
	) {
		const dealToDealer =
			!surrendered &&
			this.playerHands.some(
				hand =>
					Blackjack.handValue(hand).total <= 21 && !Blackjack.hasBlackjack(hand)
			);
		if (dealToDealer) {
			while (Blackjack.handValue(this.dealerHand).total < 17) {
				this.dealerHand.push(spliceRandom(this.deck, 1)[0]);
			}
		}

		if (surrendered) {
			this.outcomes = [Outcome.Surrender];
			this.betOutcomes = [-Math.floor(this.startingBet / 2)];
		} else {
			this.setOutcomes();
			this.setBetOutcomes();
		}
		const earned = this.moneyEarned();
		await updateProfile(
			this.interaction.user.id,
			{
				mincoDollars: {
					increment: earned,
				},
			},
			false
		);
		this.mcompColl?.stop?.();

		if (this.isSession) {
			this.updateCardCount();
			this.totalEarnings += earned;
			let blackjackInteraction: ButtonInteraction<"cached">;
			if (fromBlackjack) {
				const fbmsg = await this.interaction.editReply(
					this.fromBlackjackMsg(earned)
				);
				try {
					blackjackInteraction = await fbmsg.awaitMessageComponent({
						componentType: ComponentType.Button,
						filter: i =>
							i.user.id === this.interaction.user.id &&
							i.customId === customIds.continue,
						time: 30_000,
						idle: 0,
					});
				} catch (e) {
					await this.interaction.channel.send({
						content: `You took too long to continue, so the session will end now.\nTotal earnings: **${this.totalEarnings} MD**.`,
					});
					return;
				}
				fbmsg.edit({
					components: [],
				});
			} else {
				await this.interaction.editReply(this.gameMsg(earned));
			}
			const interaction = blackjackInteraction ?? bi;
			if (!this.sessionAborted && this.session < this.rounds - 1) {
				interaction
					.deferReply()
					.then(async () => {
						const nextGame = new Blackjack(
							interaction,
							this.startingBet,
							true,
							this.rounds,
							this.deck,
							this.totalEarnings,
							this.cardCount
						);
						nextGame.session = this.session + 1;
						await sleep(1000);
						await nextGame.gameLogic();
					})
					.catch(() => {
						interaction.channel.send(
							`This Blackjack session timed out, so it has been aborted.\nTotal earnings: **${this.totalEarnings} MD**.`
						);
					});
			} else {
				await interaction.reply({
					content: `${this.interaction.user}, your session has ended.\nTotal earnings: **${this.totalEarnings} MD**.`,
				});
			}
			return;
		}

		if (bi.isButton()) bi.update(this.gameMsg(earned));
		else if (bi.isCommand()) bi.editReply(this.gameMsg(earned));
	}

	private continueOrEnd(bi: ButtonInteraction<"cached">) {
		if (this.focusedHand === this.playerHands.length - 1) {
			this.endPlayerTurn(bi);
			return;
		}
		this.activateSplitButton();
		this.focusedHand += 1;
		this.doubleDownButton.setDisabled(false);
		bi.update(this.gameMsg());
	}

	private deal1Card() {
		this.currentHand.push(spliceRandom(this.deck, 1)[0]);
	}

	private hit(bi: ButtonInteraction<"cached">) {
		this.deal1Card();
		this.doubleDownButton.setDisabled(true);
		const total = Blackjack.handValue(this.currentHand).total;
		if (total >= 21) {
			this.continueOrEnd(bi);
			return true;
		}
		bi.update(this.gameMsg());
		return false;
	}

	private async doubleDown(bi: ButtonInteraction<"cached">) {
		const profile = await getProfile(bi.user.id);
		const betNeeded = this.bets[this.focusedHand] + this.totalBet;
		if (profile.mincoDollars < betNeeded) {
			bi.reply({
				content: `You need **${betNeeded} MD** to double down.`,
				ephemeral: true,
			});
			return;
		}
		this.bets[this.focusedHand] *= 2;
		this.deal1Card();
		this.doubleDownButton.setDisabled(true);
		this.continueOrEnd(bi);
	}

	private async split(bi: ButtonInteraction<"cached">) {
		const profile = await getProfile(bi.user.id);
		const ogBet = this.bets[this.focusedHand];
		const betNeeded = ogBet + this.totalBet;
		if (profile.mincoDollars < betNeeded) {
			bi.reply({
				content: `You need **${betNeeded} MD** to split.`,
				ephemeral: true,
			});
			return;
		}
		this.bets.push(ogBet);
		this.playerHands.push([
			this.currentHand.pop(),
			spliceRandom(this.deck, 1)[0],
		]);
		this.currentHand.push(spliceRandom(this.deck, 1)[0]);
		this.activateSplitButton();
		bi.update(this.gameMsg());
	}

	private async editBet(bi: ButtonInteraction<"cached">) {
		if (this.session >= this.rounds - 1) {
			await bi.reply({
				content: `You may not edit your bet because this is the last round of the session.`,
				ephemeral: true,
			});
			return;
		}
		const guideMsg = await bi.reply({
			content: `${bi.user}, please type your new bet amount. This will apply in the next round.
Your bet must be between **5** and **250** MD.`,
		});
		try {
			const messages = await bi.channel.awaitMessages({
				max: 1,
				idle: 0,
				time: 30_000,
				filter: m => {
					if (m.author.id !== bi.user.id) return false;
					const bet = parseInt(m.content);
					if (invalidNumber(bet)) return false;
					return bet >= 5 && bet <= 250;
				},
			});
			const msg = messages.first();
			const newBet = parseInt(msg.content);
			this.startingBet = newBet;
			await bi.channel.send({
				content: `${bi.user}, your bet has been updated to **${newBet} MD**.`,
			});
			msg.delete();
			guideMsg.delete();
		} catch (err) {
			bi.followUp({
				content: `${bi.user}, you took too long to respond, so your bet will not be updated.`,
			});
		}
	}

	private async endSession(bi: ButtonInteraction<"cached">) {
		this.endSessionButton.setDisabled();
		this.sessionAborted = true;
		await this.interaction.editReply({
			components: this.currentComponents,
		});
		await bi.reply({
			content: `Your session will end after this round.`,
		});
	}

	public async gameLogic() {
		if (this.isSession) {
			const profile = await getProfile(this.interaction.user.id);
			if (profile.mincoDollars < this.startingBet) {
				await this.interaction.editReply({
					content: `You don't have **${this.startingBet}** Minco Dollars, so the session will end now.\nTotal earnings: **${this.totalEarnings} MD**.`,
				});
				return;
			}
		}
		this.deal();
		const dealerHas10OrAce = this.dealerHand[0].value >= 10;
		const playerHasBlackjack = Blackjack.hasBlackjack(this.playerHands[0]);
		if (playerHasBlackjack) {
			this.endPlayerTurn(this.interaction, false, true);
			return;
		}
		const msg = await this.interaction.editReply(
			dealerHas10OrAce ? this.surrenderMsg() : this.gameMsg()
		);

		this.mcompColl = msg.createMessageComponentCollector({
			filter: i =>
				i.user.id === this.interaction.user.id &&
				customIdValues.includes(i.customId),
			time: timeToPlayGame,
			componentType: ComponentType.Button,
		});

		this.mcompColl.on("collect", async bi => {
			if (!bi.inCachedGuild()) return;
			if (bi.customId === customIds.continue) {
				const dealerHasBlackjack = Blackjack.hasBlackjack(this.dealerHand);
				if (dealerHasBlackjack) {
					this.endPlayerTurn(bi);
					return;
				}
				bi.update(this.gameMsg());
				return;
			}
			if (bi.customId === customIds.endSession) {
				await this.endSession(bi);
				return;
			}
			if (bi.customId === customIds.editBet) {
				await this.editBet(bi);
				return;
			}
			this.surrenderButton.setDisabled(true);
			if (bi.customId === customIds.surrender) {
				await this.endPlayerTurn(bi, true);
				return;
			} else if (bi.customId === customIds.hit) {
				this.hit(bi);
			} else if (bi.customId === customIds.stand) {
				this.continueOrEnd(bi);
			} else if (bi.customId === customIds.doubleDown) {
				await this.doubleDown(bi);
			} else if (bi.customId === customIds.split) {
				await this.split(bi);
			}
		});

		this.mcompColl.on("end", () => {
			if (this.withinPlayerTurn) this.endPlayerTurn(this.interaction);
		});
	}

	private static handValue(hand: readonly Card[]): HandValue {
		let soft = false;
		let hasAce = false;
		let total = hand.reduce((acc, card) => {
			if (!card || !card.value) return acc;
			if (card.value === 14) {
				hasAce = true;
				return acc + 1;
			}
			if (card.value > 10) return acc + 10;
			return acc + card.value;
		}, 0);
		if (total < 12 && hasAce) {
			total += 10; // soft total
			soft = true;
		}
		return { total, soft };
	}

	private static displayValue(value: HandValue): string {
		if (value.soft) return `${value.total - 10}/${value.total}`;
		return value.total.toString();
	}

	private static displayOutcome(outcome: Outcome): string {
		switch (outcome) {
			case Outcome.DealerBlackjack:
				return "Minco Penguin got a blackjack (loss)";
			case Outcome.Loss:
				return "You lost";
			case Outcome.Bust:
				return "You busted (loss)";
			case Outcome.Surrender:
				return "You surrendered";
			case Outcome.Draw:
				return "You drew (push)";
			case Outcome.DealerBust:
				return "Minco Penguin busted (win)";
			case Outcome.Win:
				return "You won!";
			case Outcome.Blackjack:
				return "You got a blackjack! (win)";
			default:
				return "";
		}
	}

	private setBetOutcomes(): void {
		this.betOutcomes = this.outcomes.map((outcome, i) => {
			if (outcome < 0) return -this.bets[i];
			if (outcome === 0) return 0;
			if (outcome === Outcome.Blackjack)
				return Math.ceil(this.bets[i] * blackjackRatio);
			return this.bets[i];
		});
	}

	private static displayBetOutcome(earnings?: number) {
		if (earnings === 0) return "**Push!** (You did not earn or lose any MD)";
		if (earnings > 0) return `You earned **${earnings} MD**!`;
		return `You lost **${-earnings} MD**!`;
	}

	private static hasBlackjack(hand: readonly Card[]): boolean {
		return hand.length === 2 && Blackjack.handValue(hand).total === 21;
	}
}
