import {
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
	User,
} from "discord.js";
import FishPlayer from "./FishPlayer";
import { createBasicDeck } from "../../cards/basic_card_functions";
import { colors } from "../../util";

const gameLength = 3_600_000;

const customIds = {
	call: "call_fish",
	viewCards: "view_cards_fish",
};
const customIdValues = Object.values(customIds);

const callButton = new ButtonBuilder()
	.setCustomId(customIds.call)
	.setLabel("Call")
	.setStyle(ButtonStyle.Danger);
const viewCardsButton = new ButtonBuilder()
	.setCustomId(customIds.viewCards)
	.setLabel("View Cards")
	.setStyle(ButtonStyle.Secondary);

export default class Fish {
	private readonly players: Collection<Snowflake, FishPlayer>;
	private msgColl: MessageCollector;
	private mcompColl: InteractionCollector<ButtonInteraction>;
	private currentPlayerId: Snowflake;
	private ongoingCall: boolean = false;

	public constructor(
		private readonly channel: GuildTextBasedChannel,
		private hostId: Snowflake,
		players: readonly User[]
	) {
		for (const player of players) {
			const playerN = new FishPlayer(player.id, player.username);
			this.players.set(player.id, playerN);
		}
	}

	private get currentPlayer() {
		return this.players.get(this.currentPlayerId);
	}

	private async turn() {
		this.channel.send({
			content: `<@${this.currentPlayerId}>, it is your turn. Please select a member of the opposing team using the buttons below, then type the card you wish to ask them for.`,
		});
	}

	private async messageCollect(msg: Message<true>) {}

	private async buttonCollect(interaction: ButtonInteraction) {}

	public async gameLogic() {
		this.msgColl = this.channel.createMessageCollector({
			time: gameLength,
		});
		this.mcompColl = this.channel.createMessageComponentCollector({
			time: gameLength,
			componentType: ComponentType.Button,
			filter: i => customIdValues.includes(i.customId),
		});
		const deck = createBasicDeck();
		for (const player of this.players.values()) {
			player.dealCards(deck);
		}
		const starter = this.players.findKey(p =>
			p.hand.some(x => x.suit === "S" && x.value === 14)
		);
		const welcomeEmbed = new EmbedBuilder()
			.setTitle("Welcome to a game of Fish!")
			.setDescription(
				`<@${starter}> will begin the game as they have the Ace of Spades.`
			)
			.setColor(colors.blurple);
		this.channel.send({ embeds: [welcomeEmbed] });
		this.currentPlayerId = starter;
		this.msgColl.on("collect", (msg: Message<true>) => {
			this.messageCollect(msg);
		});
		this.mcompColl.on("collect", (buttonInteraction: ButtonInteraction) => {
			this.buttonCollect(buttonInteraction);
		});
		this.turn();
	}
}
