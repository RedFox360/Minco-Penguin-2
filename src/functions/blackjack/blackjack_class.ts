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
	Interaction,
	InteractionCollector,
} from "discord.js";
import { Card } from "../basic_card_types.js";
import {
	createBasicDeck,
	formatDeck,
	spliceRandom,
} from "../basic_card_functions.js";
import { colors } from "../util.js";
import { getProfile, updateProfile } from "../../prisma/models.js";

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
	mcompColl: InteractionCollector<ButtonInteraction>;
	outcomes: Outcome[];
	betOutcomes: number[];

	constructor(
		public interaction: ChatInputCommandInteraction<"cached">,
		public startingBet: number
	) {
		this.playerHands = [];
		this.dealerHand = [];
		this.outcomes = [];
		this.betOutcomes = [];
		this.bets = [startingBet];
		this.deck = createBasicDeck();
		this.hitButton = new ButtonBuilder()
			.setLabel("Hit")
			.setCustomId("hit")
			.setStyle(ButtonStyle.Primary);
		this.standButton = new ButtonBuilder()
			.setLabel("Stand")
			.setCustomId("stand")
			.setStyle(ButtonStyle.Success);
		this.doubleDownButton = new ButtonBuilder()
			.setLabel("Double Down")
			.setCustomId("double_down")
			.setStyle(ButtonStyle.Secondary);
		this.splitButton = new ButtonBuilder()
			.setLabel("Split")
			.setCustomId("split")
			.setStyle(ButtonStyle.Secondary);
		this.surrenderButton = new ButtonBuilder()
			.setLabel("Surrender")
			.setCustomId("surrender")
			.setStyle(ButtonStyle.Secondary);
	}

	get gameMsgComponents() {
		return [
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				this.hitButton,
				this.standButton,
				this.doubleDownButton,
				this.splitButton
			),
			new ActionRowBuilder<ButtonBuilder>().addComponents(
				this.surrenderButton,
				howToPlayButton
			),
		];
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

		const fields: APIEmbedField[] = [];

		fields.push(
			...this.playerHands.map((hand, i) => {
				const handVal = Blackjack.handValue(hand);
				let fieldValue = "";
				if (this.isSplit && this.focusedHand === i && this.withinPlayerTurn) {
					fieldValue += ":green_circle: `Focused`\n";
				}
				if (!this.withinPlayerTurn && this.outcomes[i] && this.betOutcomes[i]) {
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

		return new EmbedBuilder()
			.setColor(color)
			.setTitle("Blackjack")
			.setDescription(description)
			.setFields(fields);
	}

	gameMsg(earned?: number) {
		return {
			embeds: [this.getEmbed(earned)],
			components: this.gameMsgComponents,
		};
	}

	deal() {
		this.playerHands.push(spliceRandom(this.deck, 2));
		this.dealerHand.push(...spliceRandom(this.deck, 2));

		if (
			Blackjack.hasBlackjack(this.playerHands[0]) ||
			Blackjack.hasBlackjack(this.dealerHand)
		) {
			return true;
		}
		this.activateSplitButton();
		return false;
	}

	activateSplitButton() {
		this.splitButton.setDisabled(
			this.playerHands[0][0].value !== this.playerHands[0][1].value
		);
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

	async endPlayerTurn(bi: Interaction, surrendered = false) {
		this.doubleDownButton.setDisabled(true);
		this.splitButton.setDisabled(true);
		this.hitButton.setDisabled(true);
		this.standButton.setDisabled(true);
		this.surrenderButton.setDisabled(true);
		// deal to dealer
		const dealToDealer = this.playerHands.some(
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

		if (bi.isButton()) await bi.update(this.gameMsg(earned));
		else if (bi.isCommand()) await bi.editReply(this.gameMsg(earned));
	}

	continueOrEnd(bi: ButtonInteraction) {
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

	hit(bi: ButtonInteraction) {
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

	async doubleDown(bi: ButtonInteraction) {
		const profile = await getProfile(bi.user.id);
		const betNeeded = this.bets[this.focusedHand];
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

	async split(bi: ButtonInteraction) {
		const profile = await getProfile(bi.user.id);
		const betNeeded = this.bets[this.focusedHand];
		if (profile.mincoDollars < betNeeded) {
			bi.reply({
				content: `You need **${betNeeded} MD** to split.`,
				ephemeral: true,
			});
			return;
		}
		this.bets.push(betNeeded);
		this.playerHands.push([this.playerHands[0].pop()]);
		bi.update(this.gameMsg());
	}

	async gameLogic() {
		const hasBlackjack = this.deal();
		if (hasBlackjack) {
			await this.endPlayerTurn(this.interaction);
			return;
		}

		const msg = await this.interaction.editReply(this.gameMsg());

		this.mcompColl = msg.createMessageComponentCollector({
			filter: i => i.user.id === this.interaction.user.id,
			time: timeToPlayGame,
			componentType: ComponentType.Button,
		});

		this.mcompColl.on("collect", async bi => {
			if (bi.customId === "hit") {
				this.hit(bi);
			} else if (bi.customId === "stand") {
				this.continueOrEnd(bi);
			} else if (bi.customId === "double_down") {
				await this.doubleDown(bi);
			} else if (bi.customId === "split") {
				await this.split(bi);
			} else if (bi.customId === "surrender") {
				await this.endPlayerTurn(bi, true);
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
