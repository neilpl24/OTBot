// Maps all possible streak values and its multipliers.
const streakmap = new Map();
streakmap.set(0, 1);
streakmap.set(1, 1);
streakmap.set(2, 1);
streakmap.set(3, 1.2);
streakmap.set(4, 1.4);
streakmap.set(5, 1.6);
streakmap.set(6, 1.8);
streakmap.set(7, 2.0);
for (let i = 8; i < 100; i++) {
    streakmap.set(i, 2.0);
}

module.exports = streakmap;