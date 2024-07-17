import { ActionRowBuilder, ButtonBuilder, ButtonStyle, } from "discord.js";
import { customIds } from "../bs_poker_types.js";
import { msToRelTimestamp } from "../../util.js";
const timeToMakeCall = 60000;
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
    constructor(channel, state) {
        this.channel = channel;
        this.state = state;
    }
    getMsgForNotif() {
        return `${this.state.currentCall
            ? `${this.state.currentCall.player} has called **${this.state.formatCurrentCall()}**.\n`
            : ""}${this.state.currentPlayer}, it is your turn.`;
    }
    getNotifRow(disabled) {
        const row = new ActionRowBuilder().addComponents(viewCardsButton, viewGameInfoButton);
        if (this.state.currentCall)
            row.addComponents(disabled ? bsButtonDisabled : bsButton);
        return row;
    }
    async sendNewNotif(onTimeout) {
        const timeUp = msToRelTimestamp(timeToMakeCall);
        const nt = this.getMsgForNotif();
        this.notifText = nt;
        const msg = await this.channel.send({
            content: nt + ` Please type your call ${timeUp}.`,
            components: [this.getNotifRow(false)],
        });
        this.notifTimeout = setTimeout(() => {
            if (this.state.aborted)
                return;
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
    async disableNotif() {
        await this.notification.edit({
            content: this.notifText,
            components: [this.getNotifRow(true)],
        });
        this.clearNotifTimeout();
    }
    clearNotifTimeout() {
        clearTimeout(this.notifTimeout);
    }
}
//# sourceMappingURL=NotificationManager.js.map