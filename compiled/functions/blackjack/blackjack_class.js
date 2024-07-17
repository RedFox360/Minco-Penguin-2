import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, } from "discord.js";
import { createBasicDeck, formatDeck } from "../cards/basic_card_functions.js";
import { colors, invalidNumber, spliceRandom, sleep } from "../util.js";
import { getProfile, updateProfile } from "../../prisma/models.js";
var Outcome;
(function (Outcome) {
    Outcome[Outcome["DealerBlackjack"] = -4] = "DealerBlackjack";
    Outcome[Outcome["Loss"] = -3] = "Loss";
    Outcome[Outcome["Bust"] = -2] = "Bust";
    Outcome[Outcome["Surrender"] = -1] = "Surrender";
    Outcome[Outcome["Draw"] = 0] = "Draw";
    Outcome[Outcome["DealerBust"] = 1] = "DealerBust";
    Outcome[Outcome["Win"] = 2] = "Win";
    Outcome[Outcome["Blackjack"] = 3] = "Blackjack";
})(Outcome || (Outcome = {}));
const blackjackRatio = 1.5;
const timeToPlayGame = 240000;
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
    constructor(interaction, startingBet, isSession, rounds, deck, totalEarnings = 0, cardCount = 0) {
        this.interaction = interaction;
        this.startingBet = startingBet;
        this.isSession = isSession;
        this.rounds = rounds;
        this.cardCount = cardCount;
        this.focusedHand = 0;
        this.currentCompState = "game";
        this.session = 0;
        this.sessionAborted = false;
        this.newDeckCreated = true;
        this.totalEarnings = 0;
        this.playerHands = [];
        this.dealerHand = [];
        this.outcomes = [];
        this.betOutcomes = [];
        this.bets = [startingBet];
        if (deck?.length > 20) {
            this.deck = deck;
            this.newDeckCreated = false;
        }
        else {
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
        this.editBetButton = new ButtonBuilder()
            .setLabel("Edit Bet")
            .setCustomId(customIds.editBet)
            .setStyle(ButtonStyle.Secondary);
    }
    get gameMsgComponents() {
        const row1 = new ActionRowBuilder().addComponents(this.hitButton, this.standButton, this.doubleDownButton, this.splitButton);
        const row2 = new ActionRowBuilder().addComponents(this.surrenderButton);
        if (this.isSession) {
            row2.addComponents(this.endSessionButton, this.editBetButton);
        }
        else {
            row2.addComponents(howToPlayButton);
        }
        this.currentCompState = "game";
        return [row1, row2];
    }
    get surrenderComponents() {
        this.currentCompState = "surrender";
        const rows = [
            new ActionRowBuilder().addComponents(this.surrenderButton, this.continueButton),
        ];
        if (this.isSession)
            rows.push(new ActionRowBuilder().addComponents(this.endSessionButton, this.editBetButton));
        return rows;
    }
    get blackjackComponents() {
        this.currentCompState = "blackjack";
        return [
            new ActionRowBuilder().addComponents(this.continueButton),
        ];
    }
    get currentComponents() {
        switch (this.currentCompState) {
            case "game":
                return this.gameMsgComponents;
            case "surrender":
                return this.surrenderComponents;
            case "blackjack":
                return this.blackjackComponents;
            default:
                return null;
        }
    }
    gameMsg(earned) {
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
    fromBlackjackMsg(earned) {
        this.currentCompState = "blackjack";
        return {
            embeds: [this.getEmbed(earned)],
            components: this.blackjackComponents,
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
            }
            else if (card.value <= 6) {
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
        if (this.withinPlayerTurn)
            return [this.dealerHand[0], null];
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
    getEmbed(earned) {
        let description = "*Game in Progress*";
        let color = colors.blurple;
        if (!this.withinPlayerTurn) {
            color =
                earned > 0 ? colors.green : earned === 0 ? colors.yellow : colors.red;
        }
        if (this.withinPlayerTurn) {
            if (this.bets.length > 1)
                description = `Bet: **${this.bets.join("+")}** (${this.totalBet} MD)`;
            else
                description = `Bet: **${this.bets[0]} MD**`;
        }
        else if (earned != null) {
            description = `${Blackjack.displayBetOutcome(earned)}`;
        }
        if (this.isSession) {
            if (this.newDeckCreated)
                description += "\n*New Deck Created*";
            description += `\nRound \`${this.session + 1}\` | Card Count: \`${this.cardCount}\`\nTotal Earnings: \`${this.totalEarnings} MD\``;
        }
        const fields = this.playerHands.map((hand, i) => {
            const handVal = Blackjack.handValue(hand);
            let fieldValue = "";
            if (this.isSplit && this.focusedHand === i && this.withinPlayerTurn) {
                fieldValue += ":green_circle: `Focused`\n";
            }
            if (!this.withinPlayerTurn &&
                this.outcomes[i] != null &&
                this.betOutcomes[i] != null) {
                fieldValue += `${Blackjack.displayOutcome(this.outcomes[i])}\n`;
            }
            fieldValue += `${formatDeck(hand)}\nTotal: **${Blackjack.displayValue(handVal)}**`;
            return {
                name: this.isSplit ? `Your Hand ${i + 1}` : "Your Hand",
                value: fieldValue,
            };
        });
        fields.push({
            name: "Minco Penguin",
            value: `${formatDeck(this.visibleDealerHand)}\nTotal: **${Blackjack.displayValue(Blackjack.handValue(this.visibleDealerHand))}**`,
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
    deal() {
        this.playerHands.push(spliceRandom(this.deck, 2));
        this.dealerHand.push(...spliceRandom(this.deck, 2));
        this.activateSplitButton();
    }
    activateSplitButton() {
        const enableButton = this.currentHand.length === 2 &&
            this.currentHand[0].value === this.currentHand[1].value;
        this.splitButton.setDisabled(!enableButton);
    }
    get currentHand() {
        return this.playerHands[this.focusedHand];
    }
    setOutcomes() {
        const dealerHandTotal = Blackjack.handValue(this.dealerHand).total;
        const dealerHasBlackjack = Blackjack.hasBlackjack(this.dealerHand);
        const playerHasOneBlackjack = this.playerHands.length === 1 &&
            Blackjack.hasBlackjack(this.playerHands[0]);
        if (playerHasOneBlackjack) {
            this.outcomes = [dealerHasBlackjack ? Outcome.Draw : Outcome.Blackjack];
        }
        else {
            this.outcomes = this.playerHands.map(hand => {
                const handVal = Blackjack.handValue(hand).total;
                if (dealerHasBlackjack)
                    return Outcome.DealerBlackjack;
                if (handVal === dealerHandTotal)
                    return Outcome.Draw;
                if (handVal > 21)
                    return Outcome.Bust;
                if (dealerHandTotal > 21)
                    return Outcome.DealerBust;
                if (handVal > dealerHandTotal)
                    return Outcome.Win;
                if (handVal < dealerHandTotal)
                    return Outcome.Loss;
                return 0;
            });
        }
    }
    async endPlayerTurn(bi, surrendered = false, fromBlackjack = false) {
        const dealToDealer = !surrendered &&
            this.playerHands.some(hand => Blackjack.handValue(hand).total <= 21 && !Blackjack.hasBlackjack(hand));
        if (dealToDealer) {
            while (Blackjack.handValue(this.dealerHand).total < 17) {
                this.dealerHand.push(spliceRandom(this.deck, 1)[0]);
            }
        }
        if (surrendered) {
            this.outcomes = [Outcome.Surrender];
            this.betOutcomes = [-Math.floor(this.startingBet / 2)];
        }
        else {
            this.setOutcomes();
            this.setBetOutcomes();
        }
        const earned = this.moneyEarned();
        await updateProfile(this.interaction.user.id, {
            mincoDollars: {
                increment: earned,
            },
        }, false);
        this.mcompColl?.stop?.();
        if (this.isSession) {
            this.updateCardCount();
            this.totalEarnings += earned;
            let blackjackInteraction;
            if (fromBlackjack) {
                const fbmsg = await this.interaction.editReply(this.fromBlackjackMsg(earned));
                try {
                    blackjackInteraction = await fbmsg.awaitMessageComponent({
                        componentType: ComponentType.Button,
                        filter: i => i.user.id === this.interaction.user.id &&
                            i.customId === customIds.continue,
                        time: 30000,
                        idle: 0,
                    });
                }
                catch (e) {
                    await this.interaction.channel.send({
                        content: `You took too long to continue, so the session will end now.\nTotal earnings: **${this.totalEarnings} MD**.`,
                    });
                    return;
                }
                fbmsg.edit({
                    components: [],
                });
            }
            else {
                await this.interaction.editReply(this.gameMsg(earned));
            }
            const interaction = blackjackInteraction ?? bi;
            if (!this.sessionAborted && this.session < this.rounds - 1) {
                interaction
                    .deferReply()
                    .then(async () => {
                    const nextGame = new Blackjack(interaction, this.startingBet, true, this.rounds, this.deck, this.totalEarnings, this.cardCount);
                    nextGame.session = this.session + 1;
                    await sleep(1000);
                    await nextGame.gameLogic();
                })
                    .catch(() => {
                    interaction.channel.send(`This Blackjack session timed out, so it has been aborted.\nTotal earnings: **${this.totalEarnings} MD**.`);
                });
            }
            else {
                await interaction.reply({
                    content: `${this.interaction.user}, your session has ended.\nTotal earnings: **${this.totalEarnings} MD**.`,
                });
            }
            return;
        }
        if (bi.isButton())
            bi.update(this.gameMsg(earned));
        else if (bi.isCommand())
            bi.editReply(this.gameMsg(earned));
    }
    continueOrEnd(bi) {
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
    hit(bi) {
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
    async doubleDown(bi) {
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
    async split(bi) {
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
    async editBet(bi) {
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
                time: 30000,
                filter: m => {
                    if (m.author.id !== bi.user.id)
                        return false;
                    const bet = parseInt(m.content);
                    if (invalidNumber(bet))
                        return false;
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
        }
        catch (err) {
            bi.followUp({
                content: `${bi.user}, you took too long to respond, so your bet will not be updated.`,
            });
        }
    }
    async endSession(bi) {
        this.endSessionButton.setDisabled();
        this.sessionAborted = true;
        await this.interaction.editReply({
            components: this.currentComponents,
        });
        await bi.reply({
            content: `Your session will end after this round.`,
        });
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
        const msg = await this.interaction.editReply(dealerHas10OrAce ? this.surrenderMsg() : this.gameMsg());
        this.mcompColl = msg.createMessageComponentCollector({
            filter: i => i.user.id === this.interaction.user.id &&
                customIdValues.includes(i.customId),
            time: timeToPlayGame,
            componentType: ComponentType.Button,
        });
        this.mcompColl.on("collect", async (bi) => {
            if (!bi.inCachedGuild())
                return;
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
            }
            else if (bi.customId === customIds.hit) {
                this.hit(bi);
            }
            else if (bi.customId === customIds.stand) {
                this.continueOrEnd(bi);
            }
            else if (bi.customId === customIds.doubleDown) {
                await this.doubleDown(bi);
            }
            else if (bi.customId === customIds.split) {
                await this.split(bi);
            }
        });
        this.mcompColl.on("end", () => {
            if (this.withinPlayerTurn)
                this.endPlayerTurn(this.interaction);
        });
    }
    static handValue(hand) {
        let soft = false;
        let hasAce = false;
        let total = hand.reduce((acc, card) => {
            if (!card || !card.value)
                return acc;
            if (card.value === 14) {
                hasAce = true;
                return acc + 1;
            }
            if (card.value > 10)
                return acc + 10;
            return acc + card.value;
        }, 0);
        if (total < 12 && hasAce) {
            total += 10; // soft total
            soft = true;
        }
        return { total, soft };
    }
    static displayValue(value) {
        if (value.soft)
            return `${value.total - 10}/${value.total}`;
        return value.total.toString();
    }
    static displayOutcome(outcome) {
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
    setBetOutcomes() {
        this.betOutcomes = this.outcomes.map((outcome, i) => {
            if (outcome < 0)
                return -this.bets[i];
            if (outcome === 0)
                return 0;
            if (outcome === Outcome.Blackjack)
                return Math.ceil(this.bets[i] * blackjackRatio);
            return this.bets[i];
        });
    }
    static displayBetOutcome(earnings) {
        if (earnings === 0)
            return "**Push!** (You did not earn or lose any MD)";
        if (earnings > 0)
            return `You earned **${earnings} MD**!`;
        return `You lost **${-earnings} MD**!`;
    }
    static hasBlackjack(hand) {
        return hand.length === 2 && Blackjack.handValue(hand).total === 21;
    }
}
//# sourceMappingURL=blackjack_class.js.map