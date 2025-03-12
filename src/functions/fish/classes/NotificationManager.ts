import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ComponentType,
	GuildTextBasedChannel,
	InteractionCollector,
	Snowflake,
} from "discord.js";
import {
	customIds,
	customIdValues,
	gameLength,
	timeToChooseHalfSuitToMakeCall,
} from "../fish_types.js";
import FishPlayerCollection from "./FishPlayerCollection.js";
import { msToRelTimestamp } from "../../util.js";
import { halfSuitSelectMenuRow } from "../fish_functions.js";

const callButton = new ButtonBuilder()
	.setCustomId(customIds.call)
	.setLabel("Call")
	.setStyle(ButtonStyle.Danger);
const viewCardsButton = new ButtonBuilder()
	.setCustomId(customIds.viewCards)
	.setLabel("View Cards")
	.setStyle(ButtonStyle.Secondary);

const bottomRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
	callButton,
	viewCardsButton
);

function interpolatePlayerIdToCustomId(id: Snowflake) {
	return `ask_fish${id}`;
}

function assertCustomIdIsAskFish(customId: string) {
	return /^ask_fish\d+$/.test(customId);
}

function extrapolateCustomIdToPlayerId(customId: string) {
	return customId.slice(8);
}

export default class NotificationManager {
	private mcompColl: InteractionCollector<ButtonInteraction>;
	public ongoingAskId: Snowflake | null = null;
	public ongoingCall: boolean = false;

	public constructor(
		private readonly players: FishPlayerCollection,
		private readonly channel: GuildTextBasedChannel
	) {}

	public setupCollectors() {
		this.mcompColl = this.channel.createMessageComponentCollector({
			time: gameLength,
			componentType: ComponentType.Button,
			filter: i => customIdValues.includes(i.customId),
		});
		this.mcompColl.on("collect", (buttonInteraction: ButtonInteraction) => {
			this.buttonCollect(buttonInteraction);
		});
	}

	private async onCall(buttonInteraction: ButtonInteraction) {
		const timeUp = msToRelTimestamp(timeToChooseHalfSuitToMakeCall);
		const msg = await buttonInteraction.reply({
			content: `Please use the menu below to select a half suit to call ${timeUp}.`,
			components: [halfSuitSelectMenuRow],
		});
		msg.awaitMessageComponent({
			componentType: ComponentType.StringSelect,
			time: timeToChooseHalfSuitToMakeCall,
			filter: i =>
				i.customId === "call_fish" && i.user.id === buttonInteraction.user.id,
		});
		this.ongoingCall = true;
	}

	private async buttonCollect(buttonInteraction: ButtonInteraction) {
		if (assertCustomIdIsAskFish(buttonInteraction.customId)) {
			const playerId = extrapolateCustomIdToPlayerId(
				buttonInteraction.customId
			);
			if (!this.players.has(playerId)) return;
			this.ongoingAskId = playerId;
			const timeUp = msToRelTimestamp(timeToChooseHalfSuitToMakeCall);
			await buttonInteraction.reply({
				content: `Please type the card you wish to ask <@${playerId}> for ${timeUp}.`,
			});
			return;
		}
		if (buttonInteraction.customId === customIds.call) {
			this.onCall(buttonInteraction);
			return;
		}
		if (buttonInteraction.customId === customIds.viewCards) {
			await buttonInteraction.reply({
				content: `**Your cards:**\n${this.players.currentPlayer.formatHand()}`,
				ephemeral: true,
			});
			return;
		}
	}

	public turn() {
		this.ongoingAskId = null;
		const opponents =
			this.players.currentPlayer.team === 0
				? this.players.team1
				: this.players.team0;
		const row = new ActionRowBuilder<ButtonBuilder>();
		for (const player of opponents.values()) {
			row.addComponents(
				new ButtonBuilder()
					.setLabel(player.user.username)
					.setCustomId(interpolatePlayerIdToCustomId(player.id))
					.setStyle(ButtonStyle.Secondary)
			);
		}
		return this.channel.send({
			content: `<@${this.players.currentPlayer}>, it is your turn. Please select a member of the opposing team using the buttons below, then type the card you wish to ask them for.`,
			components: [row, bottomRow],
		});
	}
}
