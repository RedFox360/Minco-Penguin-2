import {
	ChatInputCommandInteraction,
	Client,
	Collection,
	EmbedBuilder,
	Events,
	Interaction,
} from "discord.js";
import SlashCommand from "../core/SlashCommand.js";
import UserContextMenu from "../core/UserContextMenu.js";
import prettyMs from "pretty-ms";
import { colors } from "../functions/util.js";
import { slashCommands } from "../main.js";
const cooldowns = new Map();
const developerIds = process.env.OWNER_ID.split(",");

export default (client: Client<true>) => {
	client.on(Events.InteractionCreate, async (interaction: Interaction) => {
		const isCommand = interaction.isChatInputCommand();
		const isContextMenu = interaction.isUserContextMenuCommand();

		if (!isCommand && !isContextMenu) return;

		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content: "Sorry, I can only be used in servers.",
				ephemeral: true,
			});
			return;
		}

		if (!interaction.guild.available) {
			try {
				await interaction.user.send(
					"Minco Penguin cannot talk in the server you just sent a command in due to an outage."
				);
			} catch {
				console.log(
					`Server Outage in ${interaction.guildId}\nBot failed to DM the user`
				);
			}
		}

		const command: SlashCommand | UserContextMenu = slashCommands.get(
			interaction.commandName
		);

		const handleError = async err => {
			if (err.code !== 10062) console.error(err);
			if (developerIds.includes(interaction.user.id)) {
				const errorEmbed = new EmbedBuilder()
					.setTitle("**ERROR** ")
					.setDescription("```xl\n" + clean(err) + "\n```")
					.setColor(colors.red);
				interaction
					.reply({
						embeds: [errorEmbed],
						ephemeral: true,
					})
					.catch(() => {
						console.error("Unknown interaction");
					});
			} else {
				interaction
					.reply({
						content: "An error occured",
						ephemeral: true,
					})
					.catch(() => {
						console.error("Unknown interaction");
					});
			}
		};
		if (isCommand && command instanceof SlashCommand) {
			const mayContinue = await displayCooldowns(interaction, command).catch(
				handleError
			);

			// Interaction will be run by the SlashCommand or UserContextMenu.
			// Errors will be caught and handled by the catch block.
			if (mayContinue) command.run(interaction).catch(handleError);
		}
	});
};

async function displayCooldowns(
	interaction: ChatInputCommandInteraction<"cached">,
	command: SlashCommand
) {
	if (command.cooldown) {
		const cooldown = handleCooldowns(interaction, command);
		if (cooldown?.cooldown) {
			await interaction.reply({
				content: cooldown.content,
				ephemeral: true,
			});
			return false;
		}
	}
	return true;
}

function handleCooldowns(
	interaction: ChatInputCommandInteraction<"cached">,
	command: SlashCommand
) {
	const {
		builder: { name: commandName },
		cooldown: cooldown,
	} = command;
	if (!cooldowns.has(commandName)) cooldowns.set(commandName, new Collection());
	const currentTime = Date.now();
	const timeStamps = cooldowns.get(commandName);
	if (timeStamps.has(interaction.user.id)) {
		const expTime = timeStamps.get(interaction.user.id) + cooldown;
		if (currentTime < expTime) {
			const timeLeft = expTime - currentTime;
			return {
				content: `:clock: Please wait ${prettyMs(
					timeLeft
				)} before using command /${commandName}`,
				cooldown: true,
			};
		}
	}
	timeStamps.set(interaction.user.id, currentTime);
	return { cooldown: false };
}

function clean(text: any) {
	if (typeof text === "string")
		return text
			.replace(/`/g, "`" + String.fromCharCode(8203))
			.replace(/@/g, "@" + String.fromCharCode(8203));
	else return text;
}
