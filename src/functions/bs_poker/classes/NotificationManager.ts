import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type GuildTextBasedChannel,
	type Message,
} from "discord.js";
import type StateManager from "./StateManager.js";
import { customIds } from "../bs_poker_types.js";
import { msToRelTimestamp } from "../../util.js";

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

export default class NotificationManager {
	private notifText: string;
	private notification: Message;
	private notifTimeout: NodeJS.Timeout;

	public constructor(
		private readonly channel: GuildTextBasedChannel,
		private readonly state: StateManager
	) {}

	private getMsgForNotif() {
		return `${
			this.state.currentCall
				? `${
						this.state.currentCall.player
				  } has called **${this.state.formatCurrentCall()}**.\n`
				: ""
		}${this.state.currentPlayer}, it is your turn.`;
	}

	private getNotifRow(disabled: boolean) {
		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			viewCardsButton,
			viewGameInfoButton
		);
		if (this.state.currentCall)
			row.addComponents(disabled ? bsButtonDisabled : bsButton);
		return row;
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
				content: `${this.state.currentPlayer} failed to make a call in time. They gain a card and a new round will start now.`,
			});
			this.state.currentPlayer.cardsEntitled += 1;
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
