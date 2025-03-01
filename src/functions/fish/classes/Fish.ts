import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	Collection,
	ComponentType,
	EmbedBuilder,
	GuildTextBasedChannel,
	InteractionCollector,
	Message,
	MessageCollector,
	Snowflake,
	StringSelectMenuInteraction,
} from "discord.js";
import {
	createJIDeck,
	formatCardSideways,
	formatDeck,
} from "../../cards/basic_card_functions.js";
import {
	colors,
	deleteSoon,
	hasAdminForGames,
	msToRelTimestamp,
	removeC,
	replyThenDelete,
} from "../../util.js";
import FishPlayerCollection from "./FishPlayerCollection.js";
import {
	CardsPerHalfSuit,
	customIds,
	customIdValues,
	FakeUser,
	gameLength,
	HalfSuit,
	HalfSuitCallCollection,
	timeToMakeCall,
} from "../fish_types.js";
import {
	deckHasCard,
	extrapolateCard,
	formatHalfSuitCall,
	halfSuitSelectMenuRow,
	hasOtherCardInSameHalfSuit,
	nonDisjointCards,
} from "../fish_functions.js";
import FishPlayer from "./FishPlayer.js";
import { channelsWithActiveGames } from "../../../main.js";

const callButton = new ButtonBuilder()
	.setCustomId(customIds.call)
	.setLabel("Call")
	.setStyle(ButtonStyle.Success);
const viewCardsButton = new ButtonBuilder()
	.setCustomId(customIds.viewCards)
	.setLabel("View Cards")
	.setStyle(ButtonStyle.Secondary);
const viewTableButton = new ButtonBuilder()
	.setCustomId(customIds.viewTable)
	.setLabel("Table")
	.setStyle(ButtonStyle.Secondary);
const disjointButton = new ButtonBuilder()
	.setCustomId(customIds.disjoint)
	.setLabel("Disjoint")
	.setStyle(ButtonStyle.Danger);
const abortCallButton = new ButtonBuilder()
	.setCustomId(customIds.abortCall)
	.setLabel("Abort")
	.setStyle(ButtonStyle.Danger);
const abortDJButton = new ButtonBuilder()
	.setCustomId(customIds.abortDJ)
	.setLabel("Abort")
	.setStyle(ButtonStyle.Danger);

const bottomRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	viewCardsButton,
	viewTableButton,
	callButton,
	disjointButton
);

function idToAskId(id: Snowflake) {
	return `ask_fish${id}`;
}

function cIdIsAskFish(customId: string) {
	return /^ask_fish\d+$/.test(customId);
}

function askCidToId(customId: string) {
	return customId.slice(8);
}

function idToDisjointId(id: Snowflake) {
	return `disjoint_fish${id}`;
}

function cIdIsDisjointFish(customId: string) {
	return /^disjoint_fish\d+$/.test(customId);
}

function disjointCidToId(customId: string) {
	return customId.slice(13);
}

function idToCallCid(id: Snowflake) {
	return `call_fish${id}`;
}

function cIdIsCallFish(customId: string) {
	return /^call_fish\d+$/.test(customId);
}

function callCidToId(customId: string) {
	return customId.slice(9);
}

export default class Fish {
	private readonly players: FishPlayerCollection;
	private msgColl: MessageCollector;
	private mcompColl: InteractionCollector<ButtonInteraction>;
	private ongoingAskId: Snowflake | null = null;
	private ongoingAskMessage: Message<true> | null = null;
	private ongoingCall: boolean = false;
	private currentTurnMessage: Message<true>;

	public constructor(
		private readonly channel: GuildTextBasedChannel,
		private hostId: Snowflake,
		team0: readonly FakeUser[],
		team1: readonly FakeUser[]
	) {
		this.players = FishPlayerCollection.fromUsers(team0, team1);
	}

	private setupCollectors() {
		this.mcompColl = this.channel.createMessageComponentCollector({
			time: gameLength,
			componentType: ComponentType.Button,
			filter: i =>
				customIdValues.includes(i.customId) || cIdIsAskFish(i.customId),
		});
		this.msgColl = this.channel.createMessageCollector({
			time: gameLength,
		});
		this.mcompColl.on(
			"collect",
			(buttonInteraction: ButtonInteraction<"cached">) => {
				this.buttonCollect(buttonInteraction);
			}
		);
		this.msgColl.on("collect", async (msg: Message<true>) => {
			this.messageCollect(msg);
		});
	}

	private endCollectors() {
		this.mcompColl.stop();
		this.msgColl.stop();
		channelsWithActiveGames.delete(this.channel.id);
	}

	private endGameSuccess(winner: 0 | 1) {
		this.endCollectors();
		this.channel.send({
			embeds: [
				new EmbedBuilder()
					.setAuthor({ name: "Fish" })
					.setTitle(`Team ${winner + 1} has won!`)
					.setColor(colors.green),
			],
			components: [],
		});
	}

	private generateAskButtons(player: FishPlayer, useDisjointCodes = false) {
		const row = new ActionRowBuilder<ButtonBuilder>();
		const opponents = this.players.opponents(player.id);
		for (const opponent of opponents.values()) {
			const button = new ButtonBuilder()
				.setLabel(opponent.username)
				.setCustomId(
					useDisjointCodes
						? idToDisjointId(opponent.id)
						: idToAskId(opponent.id)
				)
				.setStyle(ButtonStyle.Secondary);
			if (opponent.out || player.disjoint.includes(opponent.id))
				button.setDisabled();
			row.addComponents(button);
		}
		return row;
	}

	private generateCallButtons(teamNumber: 0 | 1) {
		const row = new ActionRowBuilder<ButtonBuilder>();
		const team = teamNumber === 0 ? this.players.team0 : this.players.team1;
		for (const player of team.values()) {
			row.addComponents(
				new ButtonBuilder()
					.setLabel(player.username)
					.setCustomId(idToCallCid(player.id))
					.setStyle(ButtonStyle.Secondary)
			);
		}
		row.addComponents(abortCallButton);
		return row;
	}
	private async halfSuitButtons(
		selectInteraction: StringSelectMenuInteraction
	) {
		const suit = selectInteraction.values[0] as HalfSuit;
		if (!suit) return;
		const cards = CardsPerHalfSuit[suit];
		const player = this.players.get(selectInteraction.user.id);
		if (!player) return;
		const row = this.generateCallButtons(player.team);
		const givenCall: HalfSuitCallCollection = new Collection();
		for (const card of cards) {
			const msg = await this.channel.send({
				content: `Who has the **${formatCardSideways(card)}**?`,
				components: [row],
			});
			try {
				const buttonInteraction = await msg.awaitMessageComponent({
					componentType: ComponentType.Button,
					time: timeToMakeCall,
					filter: i => i.user.id === player.id && cIdIsCallFish(i.customId),
					idle: 0,
				});
				if (buttonInteraction.customId === customIds.abortCall) {
					buttonInteraction.update({
						content: "Call aborted.",
						components: [],
					});
					return;
				}
				const playerId = callCidToId(buttonInteraction.customId);
				if (!this.players.has(playerId)) {
					this.channel.send({
						content: "There was an error in calling. Aborting...",
						components: [],
					});
					return;
				}
				givenCall.ensure(player.id, () => []).push(card);
				buttonInteraction.update({
					content: `Selected ${this.players.get(
						playerId
					)} as having the **${formatCardSideways(card)}**.`,
					components: [],
				});
			} catch {
				msg.edit({
					content: "Call timed out. Aborting...",
					components: [],
				});
				return;
			}
		}
		const verification = this.players.verifyHalfSuitCall({
			suit,
			call: givenCall,
		});
		if (verification.works) {
			this.channel.send({
				embeds: [
					new EmbedBuilder()
						.setTitle("Valid Call")
						.setDescription(
							`The call was valid and ${player}'s team gains a point.`
						)
						.addFields({
							name: "Call",
							value: formatHalfSuitCall(verification.trueCall),
						})
						.setColor(colors.green),
				],
			});
			this.players.incrementScore(player.team);
			const teamApp =
				player.team === 0 ? this.players.team0Table : this.players.team1Table;
			teamApp.push(suit);
		} else {
			this.channel.send({
				embeds: [
					new EmbedBuilder()
						.setTitle("Invalid Call")
						.setDescription(
							`The call was invalid. The opposing team gains a point.`
						)
						.addFields(
							{
								name: "Given Call",
								value: formatHalfSuitCall(givenCall),
							},
							{
								name: "Correct Call",
								value: formatHalfSuitCall(verification.trueCall),
							}
						)
						.setColor(colors.red),
				],
			});
			this.players.incrementScore(player.team === 0 ? 1 : 0);
			const teamApp =
				player.team === 0 ? this.players.team1Table : this.players.team0Table;
			teamApp.push(suit);
		}
		if (this.players.team0Table.length >= 5) {
			this.endGameSuccess(0);
		} else if (this.players.team1Table.length >= 5) {
			this.endGameSuccess(1);
		}
		this.players.removeSuitFromPlayers(suit);
	}

	private async callCollect(buttonInteraction: ButtonInteraction<"cached">) {
		const timeUp = msToRelTimestamp(timeToMakeCall);
		const msg = await buttonInteraction.reply({
			embeds: [
				new EmbedBuilder()
					.setAuthor({
						name: buttonInteraction.member.displayName,
						iconURL: buttonInteraction.user.displayAvatarURL(),
					})
					.setTitle("Call")
					.setDescription(
						`Please use the menu below to select a half suit to call ${timeUp}.
Once you select a half suit, you will be prompted to select the player in your team who has each card in that half suit.
If you wish to abort the call, press the "Abort" button.`
					)
					.setColor(colors.blurple),
			],
			components: [halfSuitSelectMenuRow],
			fetchReply: true,
		});
		this.ongoingCall = true;
		msg
			.awaitMessageComponent({
				componentType: ComponentType.StringSelect,
				time: timeToMakeCall,
				filter: i =>
					i.customId === customIds.callFishSelect &&
					i.user.id === buttonInteraction.user.id,
			})
			.then(selectInteraction => {
				msg.edit({
					content: `You have selected the half suit:
${formatDeck(CardsPerHalfSuit[selectInteraction.values[0] as HalfSuit])}`,
				});
				this.halfSuitButtons(selectInteraction);
			})
			.catch(() => {
				msg.edit({
					content: `Call timed out.`,
				});
			})
			.finally(() => {
				this.ongoingCall = false;
			});
	}

	private async askForCardMessage(
		buttonInteraction: ButtonInteraction<"cached">
	) {
		const playerId = askCidToId(buttonInteraction.customId);
		if (!this.players.has(playerId)) {
			await buttonInteraction.reply({
				content: "There was an error in asking. Please try again.",
			});
			return;
		}
		this.ongoingAskId = playerId;
		const timeUp = msToRelTimestamp(timeToMakeCall);
		this.ongoingAskMessage = await buttonInteraction.reply({
			content: `Please type the card you wish to ask <@${playerId}> for ${timeUp}.`,
			fetchReply: true,
		});
	}

	private async callDisjoint(buttonInteraction: ButtonInteraction) {
		const player = this.players.get(buttonInteraction.user.id);
		if (player.disjoint.length >= 3) {
			await buttonInteraction.reply({
				content:
					"You are already disjoint with all members of the opposing team.",
				ephemeral: true,
			});
			return;
		}
		const row = this.generateAskButtons(player, true);
		row.addComponents(abortDJButton);
		const msg = await buttonInteraction.reply({
			content: `${buttonInteraction.user}, please select a member of the opposing team to call disjoint with.`,
			components: [row],
			fetchReply: true,
		});
		try {
			const newBi = await msg.awaitMessageComponent({
				time: timeToMakeCall,
				idle: 0,
				componentType: ComponentType.Button,
				filter: i => {
					return (
						i.user.id === buttonInteraction.user.id &&
						(cIdIsDisjointFish(i.customId) || i.customId === customIds.abortDJ)
					);
				},
			});
			if (newBi.customId === customIds.abortDJ) {
				await newBi.reply({
					content: "Disjoint call aborted.",
					ephemeral: true,
				});
				msg.delete();
				return;
			}
			const callWith = this.players.get(disjointCidToId(newBi.customId));
			if (!callWith) {
				await newBi.reply({
					content: "There was an error in calling disjoint. Please try again.",
					ephemeral: true,
				});
				return;
			}
			const { matchingCards, nonMatchingCards } = nonDisjointCards(
				player.hand,
				callWith.hand
			);
			await newBi.deferUpdate();
			if (matchingCards.length === 0) {
				await this.channel.send({
					content: `:green_circle: ${player}, you are disjoint with ${callWith}. You may no longer ask each other for cards.`,
				});
			} else {
				await this.channel.send({
					content: `:red_circle: ${player}, you are not disjoint with ${callWith}. You will give them the following cards in order to be disjoint. 
${formatDeck(matchingCards)}
Now, you may no longer ask each other for cards.`,
				});
				player.hand = nonMatchingCards;
				callWith.hand.push(...matchingCards);
			}
			player.disjoint.push(callWith.id);
			callWith.disjoint.push(player.id);
			msg.delete();
		} catch {
			msg.delete();
		}
		if (player.out) {
			this.players.setFirstAvailablePlayer();
			await this.channel.send({
				content: `${player}, you are now disjoint with all members of the opposing team. The turn will pass to <@${this.players.currentPlayerId}>.`,
			});
			await this.turn();
		}
	}

	private async buttonCollect(buttonInteraction: ButtonInteraction<"cached">) {
		if (buttonInteraction.customId === customIds.viewTable) {
			await buttonInteraction.reply({
				embeds: [
					new EmbedBuilder()
						.setTitle("Game Info")
						.addFields(
							{
								name: "Players",
								value: this.players.formatTeamsAndHandLengths(),
							},
							{
								name: "Team 1",
								value: this.players.formatTeamTableCards(0),
							},
							{
								name: "Team 2",
								value: this.players.formatTeamTableCards(1),
							}
						)
						.setColor(colors.green),
				],
				ephemeral: true,
			});
			return;
		}
		const player = this.players.get(buttonInteraction.user.id);
		if (!player) {
			await buttonInteraction.reply({
				content: "You are not in the game.",
				ephemeral: true,
			});
			return;
		}
		if (buttonInteraction.customId === customIds.call) {
			if (this.ongoingAskId) {
				await buttonInteraction.reply({
					content:
						"You cannot call while someone is trying to ask someone for a card.",
					ephemeral: true,
				});
			}
			await this.callCollect(buttonInteraction);
			return;
		}
		if (cIdIsAskFish(buttonInteraction.customId)) {
			if (this.ongoingCall) {
				await buttonInteraction.reply({
					content: "You cannot ask for a card while a call is ongoing.",
					ephemeral: true,
				});
				return;
			}
			if (buttonInteraction.user.id !== this.players.currentPlayerId) {
				await buttonInteraction.reply({
					content: "It is not your turn.",
					ephemeral: true,
				});
				return;
			}
			await this.askForCardMessage(buttonInteraction);
			return;
		}
		if (buttonInteraction.customId === customIds.viewCards) {
			await buttonInteraction.reply({
				content: `**Your cards:**\n${this.players
					.get(buttonInteraction.user.id)
					.formatHand()}`,
				ephemeral: true,
			});
			return;
		}
		if (buttonInteraction.customId === customIds.disjoint) {
			await this.callDisjoint(buttonInteraction);
			return;
		}
	}

	private async turn() {
		const turnMessageRef = this.currentTurnMessage;
		if (this.currentTurnMessage) {
			this.currentTurnMessage.edit({ components: [] });
			setTimeout(() => {
				turnMessageRef.delete();
			}, 60_000);
		}
		this.ongoingAskId = null;
		this.ongoingAskMessage = null;
		const row = this.generateAskButtons(this.players.currentPlayer);
		this.currentTurnMessage = await this.channel.send({
			content: `<@${this.players.currentPlayerId}>, it is your turn.`,
			components: [row, bottomRow],
		});
	}

	private async askCollect(msg: Message<true>) {
		if (msg.author.id !== this.players.currentPlayerId) return;
		const card = extrapolateCard(msg.content);
		if (!card) return;
		if (
			deckHasCard(this.players.currentPlayer.hand, card) ||
			!hasOtherCardInSameHalfSuit(this.players.currentPlayer.hand, card)
		) {
			replyThenDelete(
				msg,
				`ILLEGAL CALL. You must ask for a card that
1. you have another card of the same half suit in your hand.
2. you do not have.
Please try asking again.`
			);
			setTimeout(() => {
				msg.delete();
			}, 20_000);
			this.ongoingAskMessage.delete();
			return;
		}
		const targetPlayer = this.players.get(this.ongoingAskId);
		if (!targetPlayer) return;
		if (deckHasCard(targetPlayer.hand, card)) {
			this.players.currentPlayer.hand.push(card);
			removeC(
				targetPlayer.hand,
				x => x.suit === card.suit && x.value === card.value
			);
			const content = `:green_circle: ${targetPlayer} had the ${formatCardSideways(
				card
			)}. They give it to ${this.players.currentPlayer}.`;
			this.ongoingAskMessage
				.edit({
					content,
				})
				.then(deleteSoon)
				.catch(() => {
					this.channel.send({ content }).then(deleteSoon);
				});
		} else {
			const content = `:red_circle: ${targetPlayer} did not have the ${formatCardSideways(
				card
			)}. It is now ${targetPlayer}'s turn.`;
			this.ongoingAskMessage
				.edit({
					content,
				})
				.then(deleteSoon)
				.catch(() => {
					this.channel.send({ content }).then(deleteSoon);
				});
			this.players.currentPlayerId = targetPlayer.id;
		}
		this.turn();
	}

	private async messageCollect(msg: Message<true>) {
		if (
			msg.content === "abort" &&
			hasAdminForGames(msg.author.id, msg.member.permissions, this.hostId)
		) {
			this.endCollectors();
			msg.reply("Game aborted.");
		}
		if (this.ongoingAskId) {
			this.askCollect(msg);
		}
	}

	public async gameLogic() {
		const deck = createJIDeck();
		this.players.deal(deck);
		this.players.setFirstPlayer();
		const welcomeEmbed = new EmbedBuilder()
			.setTitle("Welcome to a game of Fish!")
			.setDescription(
				`${this.players.formatTeamsAndHandLengths()}

<@${
					this.players.currentPlayerId
				}> will begin the game as they have the Ace of Spades.`
			)
			.setColor(colors.blurple);
		this.channel.send({ embeds: [welcomeEmbed] });
		this.setupCollectors();
		this.turn();
	}
}
