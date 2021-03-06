const scheduleUrl = "https://statsapi.web.nhl.com/api/v1/schedule";
const fetch = require("node-fetch");
let axios = require('axios');
// otGames prevents the bot from sending duplicate messages about an overtime game.
let otGames = [];
// Keeps track of who got their picks right or wrong.
let correct = [];
let incorrect = [];
let home = '';
let away = '';
const mongoose = require("mongoose");
const nhlmap = require("../src/nhlmap");
const numbermap = require("../src/numbermap");
const streakmap = require("../src/streakmap");
const { Client, Intents, MessageButton, MessageEmbed } = require('discord.js');

const button1 = new MessageButton()
    .setCustomId("previousbtn")
    .setLabel("Previous")
    .setStyle("DANGER");

const button2 = new MessageButton()
    .setCustomId("nextbtn")
    .setLabel("Next")
    .setStyle("SUCCESS");

const buttonList = [button1, button2];

global.Discord = require('discord.js');
const {
    MessageActionRow,
    Message
} = require("discord.js");

/**
 * Creates a pagination embed
 * @param {Message} msg
 * @param {MessageEmbed[]} pages
 * @param {MessageButton[]} buttonList
 * @param {number} timeout
 * @returns
 */
const paginationEmbed = async (msg, pages, buttonList, timeout = 120000) => {
    if (!msg && !msg.channel) throw new Error("Channel is inaccessible.");
    if (!pages) throw new Error("Pages are not given.");
    if (!buttonList) throw new Error("Buttons are not given.");
    if (buttonList[0].style === "LINK" || buttonList[1].style === "LINK")
        throw new Error(
            "Link buttons are not supported with discordjs-button-pagination"
        );
    if (buttonList.length !== 2) throw new Error("Need two buttons.");

    let page = 0;

    const row = new MessageActionRow().addComponents(buttonList);
    const curPage = await bot.channels.cache.get('767641477736038410').send({
        embeds: [pages[page].setFooter(`Page ${page + 1} / ${pages.length}`)],
        components: [row],
    });

    const filter = (i) =>
        i.customId === buttonList[0].customId ||
        i.customId === buttonList[1].customId;

    const collector = await curPage.createMessageComponentCollector({
        filter,
        time: timeout,
    });

    collector.on("collect", async (i) => {
        switch (i.customId) {
            case buttonList[0].customId:
                page = page > 0 ? --page : pages.length - 1;
                break;
            case buttonList[1].customId:
                page = page + 1 < pages.length ? ++page : 0;
                break;
            default:
                break;
        }
        await i.deferUpdate();
        await i.editReply({
            embeds: [pages[page].setFooter(`Page ${page + 1} / ${pages.length}`)],
            components: [row],
        });
        collector.resetTimer();
    });

    collector.on("end", () => {
        if (!curPage.deleted) {
            const disabledRow = new MessageActionRow().addComponents(
                buttonList[0].setDisabled(true),
                buttonList[1].setDisabled(true)
            );
            curPage.edit({
                embeds: [pages[page].setFooter(`Page ${page + 1} / ${pages.length}`)],
                components: [disabledRow],
            });
        }
    });

    return curPage;
};
module.exports = paginationEmbed;
require('dotenv').config();


const bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

bot.on('ready', () => {
    console.log("OTBot is live.");
});

// Sets up our MongoDB server.
mongoose.connect(process.env.MONGODB_SRV, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
}).then(() => {
    console.log('Connection to database is successful!')
}).catch((err) => {
    console.log(err);
});

// This setInterval function runs getSchedule() every 10 seconds so that we are receiving up to date data.
let runBot = setInterval(function () {
    getSchedule();
}, 3000);




// This function is the bulk of the OTBot process. It is responsible for all of the fetching and transporting of the game data.
async function getSchedule() {
    const response = await fetch(scheduleUrl);
    const schedule = await response.json();
    // Uses the schedule API to get our game IDs to track live data.
    if (schedule.dates[0] == undefined) {
        clearInterval(runBot);
        return;
    }
    let games = schedule.dates[0].games.map(game => game.gamePk);
    games.sort();
    let gameUrls = games.map(gamePk => `https://statsapi.web.nhl.com/api/v1/game/${gamePk}/feed/live?site=en_nhl`);
    let gameDataArray = [];

    // Creates an array of game data json objects 
    for (let i = 0; i < schedule.totalGames; i++) {
        const gameResponse = await fetch(gameUrls[i]);
        const gameData = await gameResponse.json();
        gameDataArray.push(gameData);
    }

    // Scans all NHL games for overtime
    for (let i = 0; i < gameDataArray.length; i++) {
        // This is the channel the bot will send messages in.
        const channel = bot.channels.cache.get('819792691511558184');
        // Determines if a game is in overtime or not.
        if ((gameDataArray[i].liveData.linescore.currentPeriod == 3 || gameDataArray[i].liveData.linescore.currentPeriod == 4) && gameDataArray[i].liveData.linescore.intermissionInfo.inIntermission) {
            if (!otGames.includes(gameDataArray[i].gameData.game.pk)) {
                let awayUsers = [];
                let homeUsers = [];
                otGames.push(gameDataArray[i].gameData.game.pk);
                const homeTeam = gameDataArray[i].liveData.linescore.teams.home;
                const awayTeam = gameDataArray[i].liveData.linescore.teams.away;
                home = homeTeam.team.name;
                away = awayTeam.team.name;
                channel.send(`The ${homeTeam.team.name} take on the ${awayTeam.team.name} in overtime! Who is your pick? You have 4 minutes! React with the emotes below. @everyone`);
                // Fetches the reactions from the OT games after 5 minutes.
                setTimeout(async () => {
                    const messages = await channel.messages.fetch({ limit: 4 });
                    let homeID;
                    messages.forEach(function (value, key) {
                        if (value.content.includes(home)) {
                            homeID = value;
                        }
                    });
                    // Collects reactions and pushes userIDs to their respective arrays.
                    homeID.reactions.cache.filter(reaction => {
                        homeID.reactions.resolve(reaction).users.fetch({ limit: 100 }).then(users => {
                            users.forEach(function (value, key) {
                                if (nhlmap.get(homeTeam.team.name) == reaction._emoji.name) {
                                    homeUsers.push(value);
                                } else {
                                    awayUsers.push(value);
                                }
                            });
                        })
                    });
                }, 240000);
                // Calls the getWin() function until the game in question has ended.
                let over = setInterval(function () {
                    getWin()
                }, 10000);
                async function getWin() {
                    const res = await fetch(gameUrls[i]);
                    const gameEnded = res.data;
                    // Continues the getWin() function once the game ends.
                    if (gameEnded.gameData.status.abstractGameState == "Final" && otGames.includes(gameEnded.gameData.game.pk)) {
                        clearInterval(over);
                        correct = [];
                        incorrect = [];
                        // Alerts the users to the final score and that their data has been logged.
                        if (gameEnded.liveData.linescore.teams.away.goals >= gameEnded.liveData.linescore.teams.home.goals) {
                            channel.send(`The ${gameEnded.liveData.linescore.teams.away.team.name} have beaten the ${gameEnded.liveData.linescore.teams.home.team.name} by a score of ${gameEnded.liveData.linescore.teams.away.goals} to ${gameEnded.liveData.linescore.teams.home.goals}! I am now logging everyone's scores. You can check using the records command.`);
                            awayUsers.forEach(user => {
                                correct.push(user.id);
                            });
                            homeUsers.forEach(user => {
                                incorrect.push(user.id);
                            });
                            updateData(homeUsers.length + awayUsers.length - 2);
                        } else {
                            channel.send(`The ${gameEnded.liveData.linescore.teams.home.team.name} have beaten the ${gameEnded.liveData.linescore.teams.away.team.name} by a score of ${gameEnded.liveData.linescore.teams.home.goals} to ${gameEnded.liveData.linescore.teams.away.goals}! I am now logging everyone's scores. You can check using the records command.`);;
                            homeUsers.forEach(user => {
                                correct.push(user.id);
                            });
                            awayUsers.forEach(user => {
                                incorrect.push(user.id);
                            });
                            // This number aggregates the total number of voters and removes the bots emote reactions from the vote total.
                            updateData(homeUsers.length + awayUsers.length - 2);
                        }
                    }
                }
            }
        }
    }
}

const profileModel = require("../models/profileSchema")
// This function displays the amount of minutes left users have to lock in their pick via emote reaction.
// Message event listener
bot.on('message', message => {
    // Autogenerates reactions for the overtime game.
    if (message.content.includes('React with the emotes below') && message.author.id == '819643466720083989') {
        message.react(message.guild.emojis.cache.find(emoji => emoji.name === nhlmap.get(home)));
        message.react(message.guild.emojis.cache.find(emoji => emoji.name === nhlmap.get(away)));
        message.react(numbermap.get(4));
        let minsLeft = 3;
        let otTimer = setInterval(() => {
            message.reactions.cache.get(numbermap.get(minsLeft + 1)).remove();
            message.react(numbermap.get(minsLeft));
            minsLeft--;
            if (minsLeft == -1) {
                clearInterval(otTimer);
            }
        }, 60000);
    }

    asyncCommands();
    async function asyncCommands() {
        const prefix = process.env.PREFIX;
        const args = message.content.slice(prefix.length).split(/ +/);
        const command = args.shift().toLowerCase();
        if (!message.content.startsWith(prefix)) {
            return;
        }
        if (command === "commands") {
            message.channel.send('```Here are the following commands. Make sure to sign up via the OT command first!\n\n!ot ??? Signs a user up for OT bot.\n!record ??? Displays a users stats.\n!standings ??? Displays a standing of everyone participating in OT Bot challenge.```');
        }
        if (command === "standings") {
            let profiles = await profileModel.find();
            // We don't want the bot in the table.
            profiles = profiles.filter(profile => profile.userID != 819643466720083989);
            const record = profiles.map(profile => ({ id: profile.userID, wins: profile.wins, points: profile.points, losses: profile.losses }));
            // Adjust as needed to format table spacing between table data and user names
            record.sort((a, b) => {
                return a.points - b.points;
            });
            let place = 1;
            const firstStandingsEmbed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('First Page')
                .setDescription((await bot.users.fetch(record[record.length - 1].id)).username + ' leads the way!')
                .setImage("https://i.ibb.co/f4PYMqY/alec.jpg")
                .setFooter('Check your streaks and personal record using the !record command!');
            const secondStandingsEmbed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Second Page')
                .setDescription((await bot.users.fetch(record[record.length - 1].id)).username + ' leads the way!')
                .setImage('https://i.ibb.co/ZfH4qLs/kane.jpg')
                .setFooter('Check your streaks and personal record using the !record command!');
            const pages = [
                firstStandingsEmbed,
                secondStandingsEmbed,
            ];
            const timeout = 10000;
            for (let i = record.length - 1; i >= 5; i--) {
                let displayedUsername = (await bot.users.fetch(record[i].id)).username;
                firstStandingsEmbed.addField('' + place, `Username: ${displayedUsername}\nWins: ${record[i].wins}\nLosses: ${record[i].losses}\nPoints: ${record[i].points}`);
                place++;
            }
            for (let i = place; i >= 0; i--) {
                let displayedUsername = (await bot.users.fetch(record[i].id)).username;
                secondStandingsEmbed.addField('' + place, `Username: ${displayedUsername}\nWins: ${record[i].wins}\nLosses: ${record[i].losses}\nPoints: ${record[i].points}`);
                place++;
            }
            message.channel.send({ embeds: [firstStandingsEmbed] });
            const channel = bot.channels.cache.get('767641477736038410');
            let mostRecentMessage = channel.messages.fetch(channel.lastMessageId);
            paginationEmbed(mostRecentMessage, pages, buttonList, timeout);
        }
        if (command === "ot") {
            let profileData = await profileModel.findOne({ userID: message.author.id });
            let profile;
            // Creates a profile for a user if they are not in the MongoDB server.
            if (profileData == undefined) {
                profile = profileModel.create({
                    userID: message.author.id,
                    points: 0,
                    wins: 0,
                    losses: 0
                }).then(() => {
                    message.channel.send(`${message.author} has signed up for OTBot!`);
                    profile.save();
                });
            } else {
                message.channel.send(`You have already signed up for OTBot!`);
            }
        } else if (command === "record") {
            let profileData = await profileModel.findOne({ userID: message.author.id });
            if (profileData == undefined) {
                message.channel.send('```You have not signed up! Here are the following commands. Make sure to sign up via the OT command first!\n\n!ot ??? Signs a user up for OT bot.\n!record ??? Displays a users stats.\n!standings ??? Displays a standing of everyone participating in OT Bot challenge.```');
            } else {
                let status = "";
                if (profileData.wins > profileData.losses) {
                    status = "Fuckin champ behavior right here eh.";
                    if (profileData.streak >= 3) {
                        status = "BUDDY IS ON A HEATER BOYS WATCH OUT";
                    }
                } else {
                    status = "u are so fucking dogwater get it together";
                    if (profileData.streak >= 3) {
                        status = "ur still ass but keep it up";
                    }
                }
                message.channel.send('```Breakdown for ' + `${(await bot.users.fetch(message.author.id)).username}\n\n Wins: ${profileData.wins}\n Losses: ${profileData.losses}\n Points: ${profileData.points} \n Current Streak: ${profileData.streak}\n Status: ${status}` + '```');
            }
        } else if (command === "stop" && message.author.id === '443437518336163841') {
            clearInterval(runBot);
            message.channel.send(`OTBot has stopped fetching API data. How are you going to know the scores now???`);
        } else if (command === "reset" && message.author.id === '443437518336163841') {
            await profileModel.updateMany({
            }, { points: 0, wins: 0, losses: 0, streak: 0 });
            message.channel.send(`Standings reset. A new season has begun!`);
        }
    }
});
// This function takes our user data and uploads it to the MongoDB server.
async function updateData(numOfUsers) {
    // Creates a map for points, wins, and losses each.
    let pointsMap = new Map();
    let winMap = new Map();
    let loseMap = new Map();
    const allocatedPoints = Math.round(numOfUsers / (correct.length - 1) * 10) / 10;

    correct.forEach(async user => {
        winMap.set(user, 1);
        await profileModel.findOneAndUpdate({
            userID: user,
        },
            {
                $inc: {
                    streak: 1,
                },
            });
    });

    correct.forEach(async user => {
        let profileData = await profileModel.findOne({ userID: user });
        if (profileData == undefined) {
            profile = profileModel.create({
                userID: user,
                points: 0,
                wins: 0,
                losses: 0
            });
            profile.save();
        }
        const userStreakPoints = streakmap.get((await (profileModel.findOne({ userID: user }))).streak);
        pointsMap.set(user, Math.round((allocatedPoints * userStreakPoints) * 10) / 10);
        await profileModel.findOneAndUpdate({
            userID: user,
        },
            {
                $inc: {
                    points: pointsMap.get(user),
                },
            });
    });
    incorrect.forEach(async user => {
        loseMap.set(user, 1);
        await profileModel.findOneAndUpdate({
            userID: user,
        },
            {
                $set: {
                    streak: 0,
                },
            });
    });
    // Converts each map to an Array of key-value pair objects.
    let winValues = Array.from(winMap, ([name, value]) => ({ name, value }));
    let loseValues = Array.from(loseMap, ([name, value]) => ({ name, value }));
    // These loops update each participating user profile in the MongoDB server.
    for (let i = 0; i < winValues.length; i++) {
        await profileModel.findOneAndUpdate({
            userID: winValues[i].name,
        },
            {
                $inc: {
                    wins: winValues[i].value,
                },
            });
    }
    for (let i = 0; i < loseValues.length; i++) {
        await profileModel.findOneAndUpdate({
            userID: loseValues[i].name,
        },
            {
                $inc: {
                    losses: loseValues[i].value,
                },
            });
    }
}
bot.login(process.env.DISCORDJS_BOT_TOKEN);
