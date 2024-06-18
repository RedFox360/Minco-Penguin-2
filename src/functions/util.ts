import { Message, TimestampStyles, time } from "discord.js";

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
 */
export function removeByValue<T>(arr: T[], value: T) {
	const index = arr.indexOf(value);
	if (index !== -1) {
		arr.splice(index, 1);
	}
}

/**
 * shuffles the array into a random order
 */
export function shuffleArrayInPlace(arr: any[]) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	}
}

/**
 * sends a message and deletes it after a certain amount of time (default = 20s)
 * @param timeout time in milliseconds
 */
export function replyThenDelete(
	message: Message,
	text: string,
	timeout = 20_000
) {
	message
		.reply({
			content: text,
		})
		.then(msg => {
			setTimeout(() => {
				msg.delete();
			}, timeout);
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

export function chunkArray<T>(myArray: T[], chunkSize: number): T[][] {
	const tempArray = [];

	for (let index = 0; index < myArray.length; index += chunkSize) {
		const myChunk = myArray.slice(index, index + chunkSize);
		// do something if you want with the group
		tempArray.push(myChunk);
	}

	return tempArray;
}

export function clean(text: any) {
	if (typeof text === "string")
		return text
			.replace(/`/g, "`" + String.fromCharCode(8203))
			.replace(/@/g, "@" + String.fromCharCode(8203));
	else return text;
}

export function invalidNumber(x: any) {
	return Number.isNaN(x) || x == null;
}

export function median(x: number[]) {
	const sorted = x.sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0
		? sorted[mid]
		: (sorted[mid - 1] + sorted[mid]) / 2;
}
