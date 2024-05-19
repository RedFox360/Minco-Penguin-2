import {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
} from "discord.js";

export const cooldownMax = 18_000;
export const cooldownMin = 3;

type FuncHelper<T> = (
	interaction: NonNullable<T>
) => unknown | Promise<unknown>;
export type RunFunc = FuncHelper<
	ChatInputCommandInteraction<"cached">
>;
export type AutocompleteFunc = FuncHelper<AutocompleteInteraction>;
