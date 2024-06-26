import { EmbedBuilder } from "discord.js";
import prettyMs from "pretty-ms";
import SlashCommand from "../core/SlashCommand.js";
const ping = new SlashCommand()
    .setCommandData(builder => builder.setName("ping").setDescription("Ping the bot"))
    .setRun(async (interaction) => {
    const deferredReply = await interaction.deferReply({
        fetchReply: true,
    });
    const latency = Math.round(interaction.client.ws.ping);
    const execTime = deferredReply.createdTimestamp - interaction.createdTimestamp;
    let status;
    let color;
    if (execTime <= 200) {
        status = "speed";
        color = 0x117864;
    }
    else if (execTime <= 500) {
        status = "online";
        color = 0x48c9b0;
    }
    else if (execTime <= 2000) {
        status = "slightly lagging";
        color = 0xf7dc6f;
    }
    else if (execTime <= 5000) {
        status = "lagging";
        color = 0xff9433;
    }
    else {
        status = "severely lagging";
        color = 0xe74c3c;
    }
    const pingEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(":robot: Pong!")
        .setAuthor({
        name: interaction.member?.displayName ?? interaction.user.username,
        iconURL: interaction.member.displayAvatarURL(),
    })
        .addFields({ name: "Status", value: status }, {
        name: "Execution Time",
        value: prettyMs(execTime),
    }, { name: "Client Latency", value: prettyMs(latency) }, {
        name: "Client Uptime",
        value: prettyMs(interaction.client.uptime),
    })
        .setFooter({
        text: "Bot made by @obvsam",
    });
    await interaction.editReply({
        embeds: [pingEmbed],
    });
});
export default ping;
//# sourceMappingURL=ping.js.map