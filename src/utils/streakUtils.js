export const getLeetCodeDay = (dateInput) => {
    const d = dateInput ? new Date(dateInput) : new Date();
    // get UTC time
    const utcMs = d.getTime();
    // add IST offset (5.5 hours)
    const istMs = utcMs + (5.5 * 60 * 60 * 1000);
    // subtract 6 hours to shift the day boundary to 6:00 AM IST
    const shiftedMs = istMs - (6 * 60 * 60 * 1000);
    
    const shiftedDate = new Date(shiftedMs);
    
    // We only care about the UTC year/month/date of this shifted time
    return `${shiftedDate.getUTCFullYear()}-${String(shiftedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(shiftedDate.getUTCDate()).padStart(2, '0')}`;
};

export const calculateNewStreak = (currentStreak, lastSolveIsoString) => {
    if (!lastSolveIsoString || currentStreak === 0) {
        return { newStreak: 1, isBroken: false, isAlreadySolvedToday: false };
    }

    const todayDay = getLeetCodeDay(new Date());
    const lastDay = getLeetCodeDay(lastSolveIsoString);

    if (todayDay === lastDay) {
        return { newStreak: currentStreak, isBroken: false, isAlreadySolvedToday: true };
    }

    const todayDate = new Date(todayDay);
    const lastDate = new Date(lastDay);
    const diffTime = Math.abs(todayDate - lastDate);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
        return { newStreak: currentStreak + 1, isBroken: false, isAlreadySolvedToday: false };
    } else {
        return { newStreak: 1, isBroken: true, isAlreadySolvedToday: false };
    }
};

export const isStreakBroken = (currentStreak, lastSolveIsoString) => {
    if (!lastSolveIsoString || currentStreak === 0) return false;

    const todayDay = getLeetCodeDay(new Date());
    const lastDay = getLeetCodeDay(lastSolveIsoString);

    const todayDate = new Date(todayDay);
    const lastDate = new Date(lastDay);
    const diffTime = Math.abs(todayDate - lastDate);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 1;
};
