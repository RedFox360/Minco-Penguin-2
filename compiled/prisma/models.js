import { prisma } from "../main.js";
export function getProfile(userId) {
    return prisma.profile.upsert({
        where: {
            userId: userId,
        },
        update: {},
        create: {
            userId: userId,
            mincoDollars: 1000,
            bank: 0,
            bsPokerWins: 0,
            bsPokerGamesPlayed: 0,
            bsPokerRating: 0.0,
            bsCount: 0,
            bsSuccesses: 0,
        },
    });
}
export async function updateProfile(userId, data, upsert = true) {
    if (upsert)
        await getProfile(userId);
    return prisma.profile.update({
        where: {
            userId: userId,
        },
        data: data,
    });
}
//# sourceMappingURL=models.js.map