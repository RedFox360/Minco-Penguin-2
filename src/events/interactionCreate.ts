import {
	type ChatInputCommandInteraction,
	type Client,
	type Interaction,
	type Snowflake,
	type RepliableInteraction,
	Collection,
	EmbedBuilder,
	Events,
	RESTJSONErrorCodes,
} from "discord.js";
import SlashCommand from "../core/SlashCommand.js";
import UserContextMenu from "../core/UserContextMenu.js";
import prettyMS from "pretty-ms";
import { clean, colors } from "../functions/util.js";
import { slashCommands } from "../main.js";
// Map: {commandName -> [Map: userId -> timestamp]}
const cooldowns = new Collection<string, Map<Snowflake, number>>();
const ownerId = process.env.OWNER_ID;

export default (client: Client<true>) => {
	client.on(Events.InteractionCreate, async (interaction: Interaction) => {
		const isCommand = interaction.isChatInputCommand();
		const isContextMenu = interaction.isUserContextMenuCommand();

		if (!isCommand && !isContextMenu) return;

		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				content: "Sorry, Minco Penguin can only be used in servers.",
				ephemeral: true,
			});
			return;
		}

		if (!interaction.guild.available) {
			interaction.user
				.send({
					content:
						"Minco Penguin cannot talk in the server you just sent a command in due to an outage.",
				})
				.catch(() => {
					console.log(
						`Server Outage in ${interaction.guildId}\nBot failed to DM the user`
					);
				});
			return;
		}

		const command: SlashCommand | UserContextMenu = slashCommands.get(
			interaction.commandName
		);

		if (isCommand && command instanceof SlashCommand) {
			const mayContinue = await displayCooldowns(interaction, command).catch(
				err => handleError(interaction, err)
			);

			// Interaction will be run by the SlashCommand or UserContextMenu.
			// Errors will be caught and handled by the catch block.
			if (mayContinue)
				command.run(interaction).catch(err => handleError(interaction, err));
		} else if (isContextMenu && command instanceof UserContextMenu) {
			command.run(interaction).catch(err => handleError(interaction, err));
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
	const currentTime = Date.now();
	const timeStamps = cooldowns.ensure(commandName, () => new Map());
	if (timeStamps.has(interaction.user.id)) {
		const expTime = timeStamps.get(interaction.user.id) + cooldown;
		if (currentTime < expTime) {
			const timeLeft = expTime - currentTime;
			return {
				content: `:clock: Please wait ${prettyMS(
					timeLeft
				)} before using command /${commandName}`,
				cooldown: true,
			};
		}
	}
	timeStamps.set(interaction.user.id, currentTime);
	return { cooldown: false };
}

async function handleError(interaction: RepliableInteraction, err: any) {
	if (err?.code !== RESTJSONErrorCodes.UnknownInteraction) console.error(err);
	if (interaction.user.id === ownerId) {
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
				content: "An error occurred",
				ephemeral: true,
			})
			.catch(() => {
				console.error("Unknown interaction");
			});
	}
}
