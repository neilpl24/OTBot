// Maps all possible streak values and its multipliers.
const streakmap = new Map();
streakmap.set(0, 1);
streakmap.set(1, 1);
streakmap.set(2, 1);
streakmap.set(3, 1.5);
streakmap.set(4, 2);
streakmap.set(5, 2.5);
streakmap.set(6, 3);
streakmap.set(7, 3.5);
for (let i = 8; i < 100; i++) {
    streakmap.set(i, 4);
}

module.exports = streakmap;