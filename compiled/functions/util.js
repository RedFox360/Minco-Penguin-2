import { PermissionsBitField, RESTJSONErrorCodes, TimestampStyles, inlineCode, time, } from "discord.js";
import { promisify } from "util";
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
export function removeC(arr, callback) {
    const index = arr.findIndex(callback);
    if (index === -1)
        return false;
    arr.splice(index, 1);
    return true;
}
/**
 * shuffles the array into a random order
 */
export function shuffleArray(arr) {
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
export function spliceRandom(arr, count = 1) {
    const spliced = [];
    for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * arr.length);
        spliced.push(arr.splice(index, 1)[0]);
    }
    return spliced;
}
export function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
export function chunkArray(array, chunkSize) {
    const tempArray = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        const myChunk = array.slice(i, i + chunkSize);
        tempArray.push(myChunk);
    }
    return tempArray;
}
const zeroWidthSpace = "\u200b";
export function clean(text) {
    if (typeof text === "string")
        return text
            .replace(/`/g, "`" + zeroWidthSpace)
            .replace(/@/g, "@" + zeroWidthSpace);
    else
        return text;
}
export function invalidNumber(x) {
    return isNaN(x) || x == null;
}
export function median(x) {
    // x is sorted in place, sorted is just a reference to x
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
    for (const el of arr) {
        if (callback(el))
            count += 1;
    }
    return count;
}
export function formatBool(bool) {
    return bool ? "**True**" : "**False**";
}
function autocompleteFilter(autocompleteName, autocompleteValue) {
    const name = autocompleteName.toLowerCase();
    const value = autocompleteValue.trim().toLowerCase();
    return name.startsWith(value) || name.includes(value) || value.includes(name);
}
export function autocomplete(autocompleteData, value) {
    const matching = autocompleteData.filter(a => autocompleteFilter(a.name, value));
    return matching.slice(0, 25);
}
export function asciiTable(items, data) {
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
export function hasAdminForGames(userId, userPermissions, checkId) {
    return (userId === ownerId ||
        userId === checkId ||
        userPermissions.has(PermissionsBitField.Flags.ManageMessages));
}
export function isAlt(member) {
    if (member.guild.id === process.env.MAIN_GUILD_ID)
        return member.roles.cache.has(process.env.ALT_ROLE_ID);
    return false;
}
export const sleep = promisify(setTimeout);
const LN_DAILY = 0.07223050775;
export function logDaily(mincoDollars) {
    return Math.log(mincoDollars / 1000) / LN_DAILY;
}
export function arraysEqual(arr1, arr2, comparisonFn = (a, b) => a === b) {
    if (arr1.length !== arr2.length)
        return false;
    for (let i = 0; i < arr1.length; i++) {
        if (!comparisonFn(arr1[i], arr2[i]))
            return false;
    }
    return true;
}
export function cache(callback) {
    let value;
    return () => {
        if (value === undefined)
            value = callback();
        return value;
    };
}
export function deleteSoon(message, timeMS = 40000) {
    setTimeout(() => {
        if (message.deletable)
            message.delete();
    }, timeMS);
}
//# sourceMappingURL=util.js.map