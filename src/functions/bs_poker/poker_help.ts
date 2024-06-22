import {
	ActionRowBuilder,
	ComponentType,
	StringSelectMenuBuilder,
} from "discord.js";
import Subcommand from "../../core/Subcommand.js";
import helpEmbeds from "./bs_poker_help_embed.js";
import { emojiRaw } from "../basic_card_types.js";
import { handleMessageError } from "../util.js";

const pokerHelp = new Subcommand()
	.setCommandData(subcommand =>
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
	.setRun(async interaction => {
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
			.setCustomId("help_poker_rules")
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
			selectInteraction
				.update({
					embeds: [helpEmbeds[value]],
				})
				.catch(handleMessageError);
		});
	});

export default pokerHelp;
