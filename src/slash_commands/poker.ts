import {
	ActionRowBuilder,
	ComponentType,
	EmbedBuilder,
	StringSelectMenuBuilder,
} from "discord.js";
import SlashCommand from "../core/SlashCommand.js";
import { emojiRaw } from "../functions/basic_card_types.js";
import helpEmbeds from "../functions/bs_poker/bs_poker_help.js";
import { getProfile } from "../prisma/models.js";
import { colors } from "../functions/util.js";

const poker = new SlashCommand()
	.setCommandData(builder =>
		builder
			.setName("poker")
			.setDescription("BS Poker additional commands")
			.addSubcommand(subcommand =>
				subcommand
					.setName("help")
					.setDescription("Get information on how to play BS Poker.")
					.addStringOption(option =>
						option
							.setName("category")
							.setDescription("The category of help you want to view")
							.setRequired(false)
							.setChoices([
								{
									name: "Bot Help",
									value: "0",
								},
								{
									name: "BS Poker Rules",
									value: "1",
								},
								{
									name: "Poker Calls",
									value: "2",
								},
								{
									name: "How to Make A Call",
									value: "3",
								},
								{
									name: "Special Cards",
									value: "4",
								},
							])
					)
			)
			.addSubcommand(subcommand =>
				subcommand
					.setName("stats")
					.setDescription("View your wins and games played in BS Poker.")
					.addUserOption(option =>
						option
							.setName("user")
							.setDescription("The user to view stats for.")
							.setRequired(false)
					)
			)
	)
	.setRun(async interaction => {
		const subcommand = interaction.options.getSubcommand();
		if (subcommand === "help") {
			const category = interaction.options.getString("category");
			if (category) {
				const value = parseInt(category);
				await interaction.reply({
					embeds: [helpEmbeds[value]],
					ephemeral: true,
				});
				return;
			}

			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId("help-rules")
				.setPlaceholder("Please make a selection")
				.addOptions([
					{
						label: "Bot Help",
						description: "How to start a game of BS Poker using the bot",
						value: "0",
						emoji: emojiRaw.hearts,
					},
					{
						label: "BS Poker Rules",
						description: "The rules of BS Poker",
						value: "1",
						emoji: emojiRaw.clubs,
					},
					{
						label: "Poker Calls",
						description: "The different types of calls in BS Poker",
						value: "2",
						emoji: emojiRaw.diamonds,
					},
					{
						label: "How to Make A Call",
						description: "How to make a call in BS Poker",
						value: "3",
						emoji: emojiRaw.spades,
					},
					{
						label: "Special Cards",
						description: "Special cards in BS Poker",
						value: "4",
						emoji: emojiRaw.joker,
					},
				])
				.setMinValues(1)
				.setMaxValues(1);

			const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
				selectMenu
			);

			const msg = await interaction.reply({
				embeds: [helpEmbeds[0]],
				ephemeral: true,
				components: [row],
			});

			const collector = msg.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				time: 60_000,
			});

			collector.on("collect", selectInteraction => {
				const value = parseInt(selectInteraction.values[0]);
				selectInteraction.update({
					embeds: [helpEmbeds[value]],
				});
			});
		} else if (subcommand === "stats") {
			const member =
				interaction.options.getMember("user") || interaction.member;
			const profile = await getProfile(member.id);
			const wins = profile.bsPokerWins;
			const gamesPlayed = profile.bsPokerGamesPlayed;
			const winPerc = Math.floor((wins / gamesPlayed) * 100);
			const embed = new EmbedBuilder()
				.setColor(colors.brightGreen)
				.setAuthor({
					iconURL: member.user.displayAvatarURL(),
					name: `${member.displayName}'s BS Poker Stats`,
				})
				.setDescription(
					`Wins: **${profile.bsPokerWins}**\nGames Played: **${profile.bsPokerGamesPlayed}**\nWin Rate: **${winPerc}%**`
				);
			await interaction.reply({ embeds: [embed] });
		}
	});

export default poker;
