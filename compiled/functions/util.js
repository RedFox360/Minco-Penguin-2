import { RESTJSONErrorCodes, TimestampStyles, time } from "discord.js";
export const colors = {
    blurple: 0x7289da,
    green: 0x76d7c4,
    red: 0xf1948a,
    yellow: 0xf7dc6f,
    brightGreen: 0xb8ff8b,
    orange: 0xffa845,
};
/**
 * Min is inclusive, max is exclusive
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
export function msToRelTimestamp(timeMS) {
    const beginTimeSecs = Math.floor((Date.now() + timeMS) / 1000);
    return time(beginTimeSecs, TimestampStyles.RelativeTime);
}
export function absTimeToRelTimestamp(unixTimeMS) {
    const beginTimeSecs = Math.floor(unixTimeMS / 1000);
    return time(beginTimeSecs, TimestampStyles.RelativeTime);
}
/**
 * removes the first instance of the value in the array
 * returns true if it existed & was removed and false if it did not exist
 */
export function removeByValue(arr, value) {
    const index = arr.indexOf(value);
    if (index === -1)
        return false;
    arr.splice(index, 1);
    return true;
}
/**
 * shuffles the array into a random order
 */
export function shuffleArrayInPlace(arr) {
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
export function replyThenDelete(message, text, timeoutMS = 20000) {
    message
        .reply({
        content: text,
    })
        .then(msg => {
        setTimeout(() => {
            msg.delete();
        }, timeoutMS);
    });
}
/**
 * a certain amount of random elements are removed from the array and returned
 * array is modified in place with the elements removed
 */
export function spliceRandom(arr, count = 1) {
    const spliced = [];
    for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * arr.length);
        spliced.push(arr.splice(index, 1)[0]);
    }
    return spliced;
}
export function chunkArray(array, chunkSize) {
    const tempArray = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        const myChunk = array.slice(i, i + chunkSize);
        tempArray.push(myChunk);
    }
    return tempArray;
}
export function clean(text) {
    if (typeof text === "string")
        return text
            .replace(/`/g, "`" + String.fromCharCode(8203))
            .replace(/@/g, "@" + String.fromCharCode(8203));
    else
        return text;
}
export function invalidNumber(x) {
    return Number.isNaN(x) || x == null;
}
export function median(x) {
    const sorted = x.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}
export function handleMessageError(err) {
    if (err.code === RESTJSONErrorCodes.UnknownMessage ||
        err.code === RESTJSONErrorCodes.UnknownInteraction) {
        console.log("Message already deleted/edited");
    }
    else {
        console.error(err);
    }
}
export function countInArray(arr, callback) {
    let count = 0;
    for (const x of arr) {
        if (callback(x))
            count += 1;
    }
    return count;
}
//# sourceMappingURL=util.js.map