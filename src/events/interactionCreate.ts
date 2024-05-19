import {
	ChatInputCommandInteraction,
	Client,
	Collection,
	EmbedBuilder,
	GuildMember,
	Interaction,
	PermissionResolvable,
	PermissionsBitField,
} from "discord.js";
import SlashCommand from "../core/SlashCommand.js";
import UserContextMenu from "../core/UserContextMenu.js";
import prettyMs from "pretty-ms";
const cooldowns = new Map();

export default (client: Client<true>) => {
	client.on("interactionCreate", async (interaction: Interaction) => {
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

		const command: SlashCommand | UserContextMenu = interaction.client[
			"commands"
		].get(interaction.commandName);

		if (isCommand && command instanceof SlashCommand)
			handlePermissionsCooldowns(interaction, command);

		// Interaction will be run by the SlashCommand or UserContextMenu.
		// Errors will be caught and handled by the catch block.
		(command as any).run(interaction).catch(async err => {
			if (err.code !== 10062) console.error(err);
			if (interaction.user.id === process.env.OWNER_ID) {
				const errorEmbed = new EmbedBuilder()
					.setTitle("**ERROR** ")
					.setDescription("```xl\n" + clean(err) + "\n```")
					.setColor(0xe48383);
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
		});
	});
};

async function handlePermissionsCooldowns(
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
			return;
		}
	}
	if (command.botPermissions?.length > 0) {
		const botPermissions = handleBotPermissions(
			interaction,
			command.botPermissions
		);
		if (!botPermissions.success) {
			await interaction.reply({
				content: botPermissions.content,
				ephemeral: true,
			});
			return;
		}
	}
}

function handleCooldowns(
	interaction: ChatInputCommandInteraction<"cached">,
	command: SlashCommand
) {
	const {
		builder: { name },
		cooldown: cooldown,
	} = command;
	if (!cooldowns.has(name)) cooldowns.set(name, new Collection());
	const currentTime = Date.now();
	const timeStamps = cooldowns.get(name);
	if (timeStamps.has(interaction.user.id)) {
		const expTime = timeStamps.get(interaction.user.id) + cooldown;
		if (currentTime < expTime) {
			const timeLeft = expTime - currentTime;
			return {
				content: `:clock: Please wait ${prettyMs(
					timeLeft
				)} before using command /${name}`,
				cooldown: true,
			};
		}
	}
	timeStamps.set(interaction.user.id, currentTime);
	return { cooldown: false };
}

function handleBotPermissions(
	interaction: ChatInputCommandInteraction<"cached">,
	botPermissions: PermissionResolvable[]
) {
	const me = interaction.guild.members.me as GuildMember;
	const missingPermissions = botPermissions.filter(
		permission => !me.permissions.has(permission)
	);
	if (missingPermissions.length > 0) {
		const formattedPermissions = new PermissionsBitField(missingPermissions)
			.toArray()
			.map(a => "`" + pascalCaseToWords(a) + "`")
			.join(", ");
		return {
			success: false,
			content: `Minco Penguin needs the following permissions to run this command: ${formattedPermissions}`,
		};
	}
	return { success: true };
}

function clean(text: any) {
	if (typeof text === "string")
		return text
			.replace(/`/g, "`" + String.fromCharCode(8203))
			.replace(/@/g, "@" + String.fromCharCode(8203));
	else return text;
}

function pascalCaseToWords(str: string) {
	return str.replace(/([A-Z])/g, " $1").trim();
}
