import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type GuildTextBasedChannel,
	type Message,
} from "discord.js";
import { type ReadonlyStateManager } from "./StateManager.js";
import { customIds } from "../bs_poker_types.js";
import { msToRelTimestamp } from "../../util.js";
import { type ReadonlyPlayerCollection } from "./PlayerCollection.js";

const timeToMakeCall = 60_000;
const viewCardsButton = new ButtonBuilder()
	.setCustomId(customIds.viewCards)
	.setLabel("View Cards")
	.setStyle(ButtonStyle.Secondary);
const bsButton = new ButtonBuilder()
	.setCustomId(customIds.bs)
	.setLabel("BS")
	.setStyle(ButtonStyle.Danger);
const viewGameInfoButton = new ButtonBuilder()
	.setCustomId(customIds.viewGameInfo)
	.setLabel("Game Info")
	.setStyle(ButtonStyle.Secondary);
const bsButtonDisabled = new ButtonBuilder(bsButton.toJSON()).setDisabled(true);

const rowWithoutBS = new ActionRowBuilder<ButtonBuilder>().addComponents(
	viewCardsButton,
	viewGameInfoButton
);

const rowWithBS = new ActionRowBuilder<ButtonBuilder>().addComponents(
	viewCardsButton,
	viewGameInfoButton,
	bsButton
);

const rowWithBSDisabled = new ActionRowBuilder<ButtonBuilder>().addComponents(
	viewCardsButton,
	viewGameInfoButton,
	bsButtonDisabled
);

export default class NotificationManager {
	private notifText: string;
	private notification: Message;
	private notifTimeout: NodeJS.Timeout;

	public constructor(
		private readonly channel: GuildTextBasedChannel,
		private readonly state: ReadonlyStateManager,
		private readonly players: ReadonlyPlayerCollection
	) {}

	private getMsgForNotif() {
		return `${
			this.state.currentCall
				? `${
						this.state.currentCall.player
				  } has called **${this.state.formatCurrentCall()}**.\n`
				: ""
		}${this.players.currentPlayer}, it is your turn.`;
	}

	private getNotifRow(disabled: boolean) {
		if (this.state.currentCall) {
			return disabled ? rowWithBSDisabled : rowWithBS;
		}
		return rowWithoutBS;
	}

	public async sendNewNotif(onTimeout: () => unknown) {
		const timeUp = msToRelTimestamp(timeToMakeCall);
		const nt = this.getMsgForNotif();
		this.notifText = nt;

		const msg = await this.channel.send({
			content: nt + ` Please type your call ${timeUp}.`,
			components: [this.getNotifRow(false)],
		});

		this.notifTimeout = setTimeout(() => {
			if (this.state.aborted) return;
			msg.edit({
				content: nt,
				components: [this.getNotifRow(true)],
			});
			this.channel.send({
				content: `${this.players.currentPlayer} failed to make a call in time. They gain a card and a new round will start now.`,
			});
			this.players.currentPlayer.cardsEntitled += 1;
			onTimeout();
		}, timeToMakeCall);

		this.notification = msg;
	}

	public async disableNotif() {
		await this.notification.edit({
			content: this.notifText,
			components: [this.getNotifRow(true)],
		});
		this.clearNotifTimeout();
	}

	public clearNotifTimeout() {
		clearTimeout(this.notifTimeout);
	}
}
