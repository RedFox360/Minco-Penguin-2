import { Message, TimestampStyles, time } from "discord.js";

export const colors = {
	blurple: 0x7289da,
	green: 0x76d7c4,
	red: 0xf1948a,
	yellow: 0xf7dc6f,
} as const;

/**
 * Min is inclusive, max is exclusive
 */
export function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min)) + min;
}

export function timeToRelativeTimestamp(timeMS: number) {
	const beginTime = Math.floor((Date.now() + timeMS) / 1000);
	return time(beginTime, TimestampStyles.RelativeTime);
}

export function absTimeToRelativeTimestamp(unixTimeMS: number) {
	const beginTime = Math.floor(unixTimeMS / 1000);
	return time(beginTime, TimestampStyles.RelativeTime);
}

// array will be modified in place
export function removeByValue<T>(arr: T[], value: T) {
	const index = arr.indexOf(value);
	if (index !== -1) {
		arr.splice(index, 1);
	}
}

export function shuffleArrayInPlace(arr: any[]) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	}
}

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
