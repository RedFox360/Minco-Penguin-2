import {
	type ApplicationCommandOptionChoiceData,
	type Message,
	type MessagePayload,
	type MessageReplyOptions,
	type Snowflake,
	GuildMember,
	PermissionsBitField,
	RESTJSONErrorCodes,
	TimestampStyles,
	inlineCode,
	time,
} from "discord.js";
import { promisify } from "util";

export const colors = {
	blurple: 0x7289da,
	green: 0x76d7c4,
	red: 0xf1948a,
	yellow: 0xf7dc6f,
	brightGreen: 0xb8ff8b,
	orange: 0xffa845,
} as const;

/**
 * Min is inclusive, max is exclusive
 */
export function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min)) + min;
}

export function msToRelTimestamp(timeMS: number) {
	const beginTimeSecs = Math.floor((Date.now() + timeMS) / 1000);
	return time(beginTimeSecs, TimestampStyles.RelativeTime);
}

export function absTimeToRelTimestamp(unixTimeMS: number) {
	const beginTimeSecs = Math.floor(unixTimeMS / 1000);
	return time(beginTimeSecs, TimestampStyles.RelativeTime);
}

/**
 * removes the first instance of the value in the array
 * returns true if it existed & was removed and false if it did not exist
 */
export function removeByValue<T>(arr: T[], value: T): boolean {
	const index = arr.indexOf(value);
	if (index === -1) return false;
	arr.splice(index, 1);
	return true;
}

export function removeC<T>(arr: T[], callback: (x: T) => boolean): boolean {
	const index = arr.findIndex(callback);
	if (index === -1) return false;
	arr.splice(index, 1);
	return true;
}

/**
 * shuffles the array into a random order
 */
export function shuffleArray(arr: any[]) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	}
}

/**
 * sends a message and deletes it after a certain amount of time (default = 20s)
 * @param timeoutMS time in milliseconds (default = 20,000)
 */
export function replyThenDelete(
	message: Message,
	text: string | MessagePayload | MessageReplyOptions,
	timeoutMS = 20_000
) {
	message.reply(text).then(msg => {
		setTimeout(() => {
			msg.delete();
		}, timeoutMS);
	});
}

/**
 * a certain amount of random elements are removed from the array and returned
 * array is modified in place with the elements removed
 */
export function spliceRandom<T>(arr: T[], count = 1): T[] {
	const spliced: T[] = [];
	for (let i = 0; i < count; i++) {
		const index = Math.floor(Math.random() * arr.length);
		spliced.push(arr.splice(index, 1)[0]);
	}
	return spliced;
}

export function randomElement<T>(arr: readonly T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

export function chunkArray<T>(array: readonly T[], chunkSize: number): T[][] {
	const tempArray: T[][] = [];

	for (let i = 0; i < array.length; i += chunkSize) {
		const myChunk = array.slice(i, i + chunkSize);
		tempArray.push(myChunk);
	}

	return tempArray;
}

const zeroWidthSpace = "\u200b";
export function clean(text: any) {
	if (typeof text === "string")
		return text
			.replace(/`/g, "`" + zeroWidthSpace)
			.replace(/@/g, "@" + zeroWidthSpace);
	else return text;
}

export function invalidNumber(x: any): boolean {
	return isNaN(x) || x == null;
}

export function median(x: number[]): number {
	// x is sorted in place, sorted is just a reference to x
	const sorted = x.sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0
		? sorted[mid]
		: (sorted[mid - 1] + sorted[mid]) / 2;
}

export function handleMessageError(err: any) {
	if (
		err.code === RESTJSONErrorCodes.UnknownMessage ||
		err.code === RESTJSONErrorCodes.UnknownInteraction
	) {
		console.log("Message already deleted/edited");
	} else {
		console.error(err);
	}
}

export function countInArray<T>(
	arr: Iterable<T>,
	callback: (element: T) => boolean
): number {
	let count = 0;
	for (const el of arr) {
		if (callback(el)) count += 1;
	}
	return count;
}

export function formatBool(bool: boolean) {
	return bool ? "**True**" : "**False**";
}

function autocompleteFilter(
	autocompleteName: string,
	autocompleteValue: string
): boolean {
	const name = autocompleteName.toLowerCase();
	const value = autocompleteValue.trim().toLowerCase();
	return name.startsWith(value) || name.includes(value) || value.includes(name);
}

export function autocomplete(
	autocompleteData: readonly ApplicationCommandOptionChoiceData[],
	value: string
) {
	const matching = autocompleteData.filter(a =>
		autocompleteFilter(a.name, value)
	);
	return matching.slice(0, 25);
}

interface TableItem {
	name: string;
	pad: number;
}
interface TableReturnData {
	top: string;
	rows: string[];
}

export function asciiTable(
	items: readonly Readonly<TableItem>[],
	data: readonly (readonly string[])[]
): TableReturnData {
	const top = items.map(item => item.name.padEnd(item.pad)).join("");
	const rows = data.map(row => {
		const rowFormatted = row
			.map((cell, i) => {
				const item = items[i];
				return cell.padEnd(item.pad);
			})
			.join("");
		return inlineCode(rowFormatted);
	});
	return {
		top,
		rows,
	};
}

const ownerId = process.env.OWNER_ID;
export function hasAdminForGames(
	userId: Snowflake,
	userPermissions: Readonly<PermissionsBitField>,
	checkId: Snowflake
) {
	return (
		userId === ownerId ||
		userId === checkId ||
		userPermissions.has(PermissionsBitField.Flags.ManageMessages)
	);
}

export function isAlt(member: GuildMember) {
	if (member.guild.id === process.env.MAIN_GUILD_ID)
		return member.roles.cache.has(process.env.ALT_ROLE_ID);
	return false;
}

export const sleep = promisify(setTimeout);

const LN_DAILY = 0.07223050775;
export function logDaily(mincoDollars: number): number {
	return Math.log(mincoDollars / 1000) / LN_DAILY;
}

export function arraysEqual<T>(
	arr1: readonly T[],
	arr2: readonly T[],
	comparisonFn: (a: T, b: T) => boolean = (a, b) => a === b
): boolean {
	if (arr1.length !== arr2.length) return false;
	for (let i = 0; i < arr1.length; i++) {
		if (!comparisonFn(arr1[i], arr2[i])) return false;
	}
	return true;
}

export function cache<T>(callback: () => T): () => T {
	let value: T;
	return () => {
		if (value === undefined) value = callback();
		return value;
	};
}

export function deleteSoon(message: Message, timeMS = 40_000) {
	setTimeout(() => {
		if (message.deletable) message.delete();
	}, timeMS);
}
