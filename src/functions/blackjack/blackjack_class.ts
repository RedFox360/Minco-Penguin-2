import {
	APIEmbedField,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	ColorResolvable,
	ComponentType,
	EmbedBuilder,
	InteractionCollector,
} from "discord.js";
import { Card } from "../basic_card_types.js";
import { createBasicDeck, formatDeck } from "../basic_card_functions.js";
import { colors, spliceRandom } from "../util.js";
import { getProfile, updateProfile } from "../../prisma/models.js";
import { promisify } from "util";
const sleep = promisify(setTimeout);
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
const howToPlayButton = new ButtonBuilder()
	.setLabel("How to play")
	.setStyle(ButtonStyle.Link)
	.setURL("https://bicyclecards.com/how-to-play/blackjack/");
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
};

const customIdValues = Object.values(customIds);
class Blackjack {
	playerHands: Card[][];
	focusedHand = 0;
	dealerHand: Card[];
	bets: number[];
	deck: Card[];
	hitButton: ButtonBuilder;
	standButton: ButtonBuilder;
	doubleDownButton: ButtonBuilder;
	splitButton: ButtonBuilder;
	surrenderButton: ButtonBuilder;
	continueButton: ButtonBuilder;
	endSessionButton: ButtonBuilder;
	mcompColl: InteractionCollector<ButtonInteraction>;
	outcomes: Outcome[];
	betOutcomes: number[];
	session = 0;
	sessionAborted = false;
	newDeckCreated = true;
	totalEarnings = 0;

	constructor(
		public interaction:
			| ChatInputCommandInteraction<"cached">
			| ButtonInteraction<"cached">,
		public startingBet: number,
		public isSession: boolean,
		public rounds: number,
		deck?: Card[],
		totalEarnings = 0,
		public cardCount = 0
	) {
		this.playerHands = [];
		this.dealerHand = [];
		this.outcomes = [];
		this.betOutcomes = [];
		this.bets = [startingBet];
		if (deck?.length > 20) {
			this.deck = deck;
			this.newDeckCreated = false;
		} else {
			this.deck = createBasicDeck();
			this.cardCount = 0;
		}
		this.totalEarnings = totalEarnings;
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
	}

	get gameMsgComponents() {
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
			row2.addComponents(this.endSessionButton);
		}
		row2.addComponents(howToPlayButton);
		return [row1, row2];
	}

	get surrenderComponents() {
		return [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				this.surrenderButton,
				this.continueButton
			),
			new ActionRowBuilder<ButtonBuilder>().addComponents(howToPlayButton),
		];
	}

	gameMsg(earned?: number) {
		return {
			embeds: [this.getEmbed(earned)],
			components: earned == null ? this.gameMsgComponents : [],
		};
	}

	surrenderMsg() {
		return {
			embeds: [this.getEmbed()],
			components: this.surrenderComponents,
		};
	}

	fromBlackjackMsg(earned: number) {
		return {
			embeds: [this.getEmbed(earned)],
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents(
					this.continueButton
				),
			],
		};
	}

	currentDeck() {
		return [this.playerHands, this.dealerHand].flat(2);
	}

	currentCardCount() {
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

	updateCardCount() {
		this.cardCount += this.currentCardCount();
	}

	get withinPlayerTurn() {
		return this.outcomes?.length === 0 && this.betOutcomes?.length === 0;
	}

	get visibleDealerHand() {
		if (this.withinPlayerTurn) return [this.dealerHand[0], null];
		return this.dealerHand;
	}

	get isSplit() {
		return this.playerHands.length > 1;
	}

	moneyEarned() {
		return this.betOutcomes.reduce((acc, i) => acc + i);
	}

	get totalBet() {
		return this.bets.reduce((acc, i) => acc + i);
	}

	getEmbed(earned?: number) {
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
		if (this.isSession && this.newDeckCreated)
			description += "\n*New Deck Created*";

		const fields: APIEmbedField[] = [];

		fields.push(
			...this.playerHands.map((hand, i) => {
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
			})
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
			.setTitle("Blackjack")
			.setDescription(description)
			.setFields(fields);
		if (this.isSession)
			embed.setFooter({
				text: `Session ${this.session + 1} | Card Count: ${this.cardCount}`,
			});
		return embed;
	}

	deal() {
		this.playerHands.push(spliceRandom(this.deck, 2));
		this.dealerHand.push(...spliceRandom(this.deck, 2));
		this.activateSplitButton();
	}

	activateSplitButton() {
		const enableButton =
			this.playerHands[0].length === 2 &&
			this.playerHands[0][0].value === this.playerHands[0][1].value;
		this.splitButton.setDisabled(!enableButton);
	}

	get currentHand() {
		return this.playerHands[this.focusedHand];
	}

	setOutcomes() {
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

	async endPlayerTurn(
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
					await this.interaction.editReply({
						content: `You took too long to continue, so the session will end now.\nTotal earnings: **${this.totalEarnings} MD**.`,
					});
					return;
				}
			} else {
				await this.interaction.editReply(this.gameMsg(earned));
			}
			const interaction = blackjackInteraction ?? bi;
			if (!this.sessionAborted && this.session < this.rounds - 1) {
				await interaction.deferReply();
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
			} else {
				await interaction.reply({
					content: `${this.interaction.user}, your session has ended.\nTotal earnings: **${this.totalEarnings} MD**.`,
				});
			}
			return;
		}

		if (bi.isButton()) await bi.update(this.gameMsg(earned));
		else if (bi.isCommand()) await bi.editReply(this.gameMsg(earned));
	}

	continueOrEnd(bi: ButtonInteraction<"cached">) {
		if (this.focusedHand === this.playerHands.length - 1) {
			this.endPlayerTurn(bi);
			return;
		}
		this.activateSplitButton();
		this.focusedHand += 1;
		this.doubleDownButton.setDisabled(false);
		bi.update(this.gameMsg());
	}

	deal1Card() {
		this.currentHand.push(spliceRandom(this.deck, 1)[0]);
	}

	hit(bi: ButtonInteraction<"cached">) {
		const fromSplit = this.currentHand.length === 1;
		this.deal1Card();
		this.doubleDownButton.setDisabled(true);
		if (fromSplit) this.activateSplitButton();
		const total = Blackjack.handValue(this.currentHand).total;
		if (total >= 21) {
			this.continueOrEnd(bi);
			return true;
		}
		bi.update(this.gameMsg());
		return false;
	}

	async doubleDown(bi: ButtonInteraction<"cached">) {
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

	async split(bi: ButtonInteraction<"cached">) {
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
			this.playerHands[this.focusedHand].pop(),
			spliceRandom(this.deck, 1)[0],
		]);
		this.playerHands[this.focusedHand].push(spliceRandom(this.deck, 1)[0]);
		bi.update(this.gameMsg());
	}

	async gameLogic() {
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
			this.surrenderButton.setDisabled(true);
			if (bi.customId === customIds.surrender) {
				await this.endPlayerTurn(bi, true);
			} else if (bi.customId === customIds.continue) {
				const dealerHasBlackjack = Blackjack.hasBlackjack(this.dealerHand);
				if (dealerHasBlackjack) {
					this.endPlayerTurn(bi);
					return;
				}
				await bi.update(this.gameMsg());
			} else if (bi.customId === customIds.hit) {
				this.hit(bi);
			} else if (bi.customId === customIds.stand) {
				this.continueOrEnd(bi);
			} else if (bi.customId === customIds.doubleDown) {
				await this.doubleDown(bi);
			} else if (bi.customId === customIds.split) {
				await this.split(bi);
			} else if (bi.customId === customIds.endSession) {
				this.endSessionButton.setDisabled();
				this.sessionAborted = true;
				await this.interaction.editReply({
					components: this.gameMsgComponents,
				});
				await bi.reply({
					content: `Your session will end after this round.`,
				});
			}
		});

		this.mcompColl.on("end", () => {
			if (this.withinPlayerTurn) this.endPlayerTurn(this.interaction);
		});
	}

	static handValue(hand: Card[]): HandValue {
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

	static displayValue(value: HandValue): string {
		if (value.soft) return `${value.total - 10}/${value.total}`;
		return value.total.toString();
	}

	static displayOutcome(outcome: Outcome): string {
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

	setBetOutcomes(): void {
		this.betOutcomes = this.outcomes.map((outcome, i) => {
			if (outcome < 0) return -this.bets[i];
			if (outcome === 0) return 0;
			if (outcome === Outcome.Blackjack) return Math.ceil(this.bets[i] * 1.5);
			return this.bets[i];
		});
	}

	static displayBetOutcome(earnings?: number) {
		if (earnings === 0) return "**Push!** (You did not earn or lose any MD)";
		if (earnings > 0) return `You earned **${earnings} MD**!`;
		return `You lost **${-earnings} MD**!`;
	}

	static hasBlackjack(hand: Card[]): boolean {
		return hand.length === 2 && Blackjack.handValue(hand).total === 21;
	}
}

export default Blackjack;
