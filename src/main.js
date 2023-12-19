const scheduleUrl = "https://api-web.nhle.com/v1/schedule/now";
const fetch = require("node-fetch");
// otGames prevents the bot from sending duplicate messages about an overtime game.
let otGames = [];
let potentialOTgames = [];
let loggedGames = [];
// Keeps track of who got their picks right or wrong.
let correct = [];
let incorrect = [];
let home = "";
let away = "";
const mongoose = require("mongoose");
const nhlmap = require("../src/nhlmap");
const numbermap = require("../src/numbermap");
const streakmap = require("../src/streakmap");
const { Client, Intents, MessageEmbed } = require("discord.js");

global.Discord = require("discord.js");

require("dotenv").config();

const bot = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

bot.on("ready", () => {
  console.log("OTBot is live.");
});

// Sets up our MongoDB server.
mongoose
  .connect(process.env.MONGODB_SRV, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log("Connection to database is successful!");
  })
  .catch((err) => {
    console.log(err);
  });

// This setInterval function runs getSchedule() every 3 seconds so that we are receiving up to date data.
let runBot = setInterval(function () {
  getSchedule();
}, 3000);

// This function is the bulk of the OTBot process. It is responsible for all of the fetching and transporting of the game data.
async function getSchedule() {
  const response = await fetch(scheduleUrl);
  const schedule = await response.json();
  // Stops running the function if there's no games that day
  if (schedule.gameWeek[0] == undefined) {
    clearInterval(runBot);
    return;
  }
  // Uses the schedule API to get our game IDs to track live data.
  let games = schedule.gameWeek[0].games.map((game) => game.gamePk);
  games.sort();
  let gameUrls = games.map(
    (gamePk) => `https://api-web.nhle.com/v1/gamecenter/${gamePk}/play-by-play`
  );
  // Creates an array of game data json objects
  gameDataArray = [];

  for (let i = 0; i < schedule.totalGames; i++) {
    const gameResponse = await fetch(gameUrls[i]);
    const gameData = await gameResponse.json();
    gameDataArray.push(gameData);
  }

  // Scans all NHL games for overtime
  for (let i = 0; i < gameDataArray.length; i++) {
    // This is the channel the bot will send messages in.
    const channel = bot.channels.cache.get("819792691511558184");
    console.log(gameDataArray[i]);
    // Determines if a game is in overtime or not.
    if (gameDataArray[i].period == 4) {
      // Prevents the bot from sending messages multiple times about overtime.
      if (!otGames.includes(gameDataArray[i].id)) {
        let awayUsers = [];
        let homeUsers = [];
        otGames.push(gameDataArray[i].id);
        const home = gameDataArray[i].homeTeam.abbrev;
        const away = gameDataArray[i].awayTeam.abbrev;
        channel.send(
          `${home} takes on ${away} in overtime! Who is your pick? You have 5 minutes! React with the emotes below.  @everyone`
        );
        // Fetches the reactions from the OT games after 5 minutes.
        setTimeout(async () => {
          const messages = await channel.messages.fetch({ limit: 4 });
          let homeID;
          messages.forEach(function (value, key) {
            if (value.content.includes(home)) {
              homeID = value;
            }
          });
          console.log(homeID.content);
          // Collects reactions and pushes userIDs to their respective arrays.
          homeID.reactions.cache.filter((reaction) => {
            homeID.reactions
              .resolve(reaction)
              .users.fetch({ limit: 100 })
              .then((users) => {
                users.forEach(function (value, key) {
                  if (nhlmap.get(home) == reaction._emoji.name) {
                    homeUsers.push(value);
                  } else {
                    awayUsers.push(value);
                  }
                });
              });
          });
        }, 300000);
        // Calls the getWin() function until the game in question has ended.
        let over = setInterval(function () {
          getWin();
        }, 10000);
        async function getWin() {
          const res = await fetch(gameUrls[i]);
          const gameEnded = await res.json();
          // Continues the getWin() function once the game ends.
          if (
            (gameEnded.gameState == "OVER" ||
              gameEnded.gameState == "OFF" ||
              gameEnded.gameState == "FINAL") &&
            otGames.includes(gameEnded.id)
          ) {
            clearInterval(over);
            correct = [];
            incorrect = [];
            // Alerts the users to the final score and that their data has been logged.
            if (gameEnded.awayTeam.score >= gameEnded.homeTeam.score) {
              channel.send(
                `The ${away} have beaten the ${home} by a score of ${gameEnded.awayTeam.score} to ${gameEnded.homeTeam.score}! I am now logging everyone's scores. You can check using the records command.`
              );
              awayUsers.forEach((user) => {
                correct.push(user.id);
              });
              homeUsers.forEach((user) => {
                incorrect.push(user.id);
              });
              updateData(homeUsers.length + awayUsers.length - 2);
            } else {
              channel.send(
                `The ${home} have beaten the ${away} by a score of ${gameEnded.homeTeam.score} to ${gameEnded.awayTeam.score}! I am now logging everyone's scores. You can check using the records command.`
              );
              homeUsers.forEach((user) => {
                correct.push(user.id);
              });
              awayUsers.forEach((user) => {
                incorrect.push(user.id);
              });
              // This number aggregates the total number of voters and removes the bots emote reactions from the vote total.
              updateData(homeUsers.length + awayUsers.length - 2);
            }
          }
        }
      }
    }
    // Shoutout Niko @ https://stackoverflow.com/a/9640417
    // This function notifies users if a game is tied with less than 2 minutes left.
    let seconds = gameDataArray[i].clock.secondsRemaining;
    if (
      seconds < 120 &&
      gameDataArray[i].period == 4 &&
      gameDataArray[i].homeTeam.score == gameDataArray[i].awayTeam.score
    ) {
      potentialOTgames.push(gameDataArray[i].id);
      bot.channels.cache
        .get("895730626504822816")
        .send(
          `${home} and ${away}} are currently tied with ${gameDataArray[i].clock.timeRemaining} remaining. Keep an eye out! @everyone`
        );
    }
  }
}

const profileModel = require("../models/profileSchema");
// This function displays the amount of minutes left users have to lock in their pick via emote reaction.
// Message event listener
bot.on("message", (message) => {
  // Autogenerates reactions displaying time left to vote for the overtime game.
  if (
    message.content.includes("React with the emotes below") &&
    message.author.id == "819643466720083989"
  ) {
    message.react(
      message.guild.emojis.cache.find(
        (emoji) => emoji.name === nhlmap.get(home)
      )
    );
    message.react(
      message.guild.emojis.cache.find(
        (emoji) => emoji.name === nhlmap.get(away)
      )
    );
    message.react(numbermap.get(5));
    let minsLeft = 4;
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
      message.channel.send(
        "```Here are the following commands. Make sure to sign up via the OT command first!\n\n!ot ‒ Signs a user up for OT bot.\n!record ‒ Displays a users stats.```"
      );
    }
    if (command === "ot") {
      let profileData = await profileModel.findOne({
        userID: message.author.id,
      });
      let profile;
      // Creates a profile for a user if they are not in the MongoDB server.
      if (profileData == undefined) {
        profile = profileModel.create({
          userID: message.author.id,
          points: 0,
          wins: 0,
          losses: 0,
        });
        message.channel.send(`${message.author} has signed up for OTBot!`);
      } else {
        message.channel.send(`You have already signed up for OTBot!`);
      }
    } else if (command === "record") {
      let profileData = await profileModel.findOne({
        userID: message.author.id,
      });
      if (profileData == undefined) {
        message.channel.send(
          "```You have not signed up! Here are the following commands. Make sure to sign up via the OT command first!\n\n!ot ‒ Signs a user up for OT bot.\n!record ‒ Displays a users stats.\n!standings ‒ Displays a standing of everyone participating in OT Bot challenge.```"
        );
      } else {
        let status = "";
        if (profileData.wins > profileData.losses) {
          status = "You're doing great!";
          if (profileData.streak >= 3) {
            status = "Gettin hot!";
          }
        } else {
          status = "You're pretty bad.";
          if (profileData.streak >= 3) {
            status = "ur still ass but keep it up";
          }
        }
        message.channel.send(
          "```Breakdown for " +
            `${(await bot.users.fetch(message.author.id)).username}\n\n Wins: ${
              profileData.wins
            }\n Losses: ${profileData.losses}\n Points: ${
              profileData.points
            } \n Current Streak: ${profileData.streak}\n Status: ${status}` +
            "```"
        );
      }
    } else if (
      command === "stop" &&
      message.author.id === "443437518336163841"
    ) {
      clearInterval(runBot);
      message.channel.send(
        `OTBot has stopped fetching API data. How are you going to know the scores now???`
      );
    } else if (
      command === "reset" &&
      message.author.id === "443437518336163841"
    ) {
      await profileModel.updateMany(
        {},
        { points: 0, wins: 0, losses: 0, streak: 0 }
      );
      message.channel.send(`Standings reset. A new season has begun!`);
    } else if (
      command === "standings" &&
      message.author.id === "443437518336163841"
    ) {
      let profiles = await profileModel.find();
      // We don't want the bot in the table.
      profiles = profiles.filter(
        (profile) => profile.userID != 819643466720083989
      );
      const record = profiles.map((profile) => ({
        id: profile.userID,
        wins: profile.wins,
        points: profile.points,
        losses: profile.losses,
      }));
      // Adjust as needed to format table spacing between table data and user names
      record.sort((a, b) => {
        return a.points - b.points;
      });
      let place = record.length;
      let ranking = 1;
      const firstStandingsEmbed = new MessageEmbed()
        .setColor("#0099ff")
        .setTitle("First Page")
        .setDescription(
          (await bot.users.fetch(record[record.length - 1].id)).username +
            " leads the way!"
        )
        .setImage("https://i.ibb.co/f4PYMqY/alec.jpg")
        .setFooter(
          "Check your streaks and personal record using the !record command!"
        );
      const secondStandingsEmbed = new MessageEmbed()
        .setColor("#0099ff")
        .setTitle("Second Page")
        .setImage("https://i.ibb.co/ZfH4qLs/kane.jpg")
        .setFooter(
          "Check your streaks and personal record using the !record command!"
        );
      for (let i = record.length - 1; i >= 7; i--) {
        let displayedUsername = (await bot.users.fetch(record[i].id)).username;
        firstStandingsEmbed.addField(
          "" + ranking,
          `Username: ${displayedUsername}\nWins: ${record[i].wins}\nLosses: ${record[i].losses}\nPoints: ${record[i].points}`
        );
        place--;
        ranking++;
      }
      for (let i = place - 1; i >= 0; i--) {
        let displayedUsername = (await bot.users.fetch(record[i].id)).username;
        secondStandingsEmbed.addField(
          "" + ranking,
          `Username: ${displayedUsername}\nWins: ${record[i].wins}\nLosses: ${record[i].losses}\nPoints: ${record[i].points}`
        );
        ranking++;
      }
      const standingsChannel = bot.channels.cache.get("892804270259331082");
      standingsChannel.send({ embeds: [firstStandingsEmbed] });
      standingsChannel.send({ embeds: [secondStandingsEmbed] });
    }
  }
});

// This function takes our user data and uploads it to the MongoDB server.
async function updateData(numOfUsers, multiplier) {
  const response = await fetch(scheduleUrl);
  const schedule = await response.json();
  let games = schedule.gameWeek[0].games.map((game) => game.gamePk);
  games.sort();
  let gameUrls = games.map(
    (gamePk) => `https://api-web.nhle.com/v1/gamecenter/${gamePk}/play-by-play`
  );
  for (let i = 0; i < schedule.totalGames; i++) {
    const res = await fetch(gameUrls[i]);
    const gameEnded = await res.json();
    // Continues the getWin() function once the game ends.
    if (
      gameEnded.gameState == "OFF" &&
      otGames.includes(gameEnded.id) &&
      !loggedGames.includes(gameEnded.id)
    ) {
      loggedGames.push(gameEnded.id);
      multiplier = Number(gameEnded.period) - 3;
    }
  }

  // Creates a map for points, wins, and losses each.
  let pointsMap = new Map();
  let winMap = new Map();
  let loseMap = new Map();
  const allocatedPoints = Math.round(
    (((multiplier * numOfUsers) / (correct.length - 1)) * 10) / 10
  );
  bot.channels.cache
    .get("819792691511558184")
    .send(
      `The amount of points each winner receieved (not accounting for streak multipliers) is ${allocatedPoints} points! The game went to ${multiplier} OT, so there is a ${multiplier}x multiplier!`
    );

  correct.forEach(async (user) => {
    winMap.set(user, 1);
    await profileModel.findOneAndUpdate(
      {
        userID: user,
      },
      {
        $inc: {
          streak: 1,
        },
      }
    );
  });

  correct.forEach(async (user) => {
    let profileData = await profileModel.findOne({ userID: user });
    if (profileData == undefined) {
      profile = profileModel.create({
        userID: user,
        points: 0,
        wins: 0,
        losses: 0,
      });
      profile.save();
    }
    const userStreakPoints = streakmap.get(
      (await profileModel.findOne({ userID: user })).streak
    );
    pointsMap.set(
      user,
      Math.round(allocatedPoints * userStreakPoints * 10) / 10
    );
    await profileModel.findOneAndUpdate(
      {
        userID: user,
      },
      {
        $inc: {
          points: pointsMap.get(user),
        },
      }
    );
  });
  incorrect.forEach(async (user) => {
    loseMap.set(user, 1);
    await profileModel.findOneAndUpdate(
      {
        userID: user,
      },
      {
        $set: {
          streak: 0,
        },
      }
    );
  });
  // Converts each map to an Array of key-value pair objects.
  let winValues = Array.from(winMap, ([name, value]) => ({ name, value }));
  let loseValues = Array.from(loseMap, ([name, value]) => ({ name, value }));
  // These loops update each participating user profile in the MongoDB server.
  for (let i = 0; i < winValues.length; i++) {
    await profileModel.findOneAndUpdate(
      {
        userID: winValues[i].name,
      },
      {
        $inc: {
          wins: winValues[i].value,
        },
      }
    );
  }
  for (let i = 0; i < loseValues.length; i++) {
    await profileModel.findOneAndUpdate(
      {
        userID: loseValues[i].name,
      },
      {
        $inc: {
          losses: loseValues[i].value,
        },
      }
    );
  }
  let profiles = await profileModel.find();
  // We don't want the bot in the table.
  profiles = profiles.filter((profile) => profile.userID != 819643466720083989);
  const record = profiles.map((profile) => ({
    id: profile.userID,
    wins: profile.wins,
    points: profile.points,
    losses: profile.losses,
  }));
  // Adjust as needed to format table spacing between table data and user names
  record.sort((a, b) => {
    return a.points - b.points;
  });
  let place = record.length;
  let ranking = 1;
  // Creates the messages used in the standings channel
  const firstStandingsEmbed = new MessageEmbed()
    .setColor("#0099ff")
    .setTitle("First Page")
    .setDescription(
      (await bot.users.fetch(record[record.length - 1].id)).username +
        " leads the way!"
    )
    .setImage("https://i.ibb.co/f4PYMqY/alec.jpg")
    .setFooter(
      "Check your streaks and personal record using the !record command!"
    );
  const secondStandingsEmbed = new MessageEmbed()
    .setColor("#0099ff")
    .setTitle("Second Page")
    .setImage("https://i.ibb.co/ZfH4qLs/kane.jpg")
    .setFooter(
      "Check your streaks and personal record using the !record command!"
    );
  for (let i = record.length - 1; i >= 7; i--) {
    let displayedUsername = (await bot.users.fetch(record[i].id)).username;
    firstStandingsEmbed.addField(
      "" + ranking,
      `Username: ${displayedUsername}\nWins: ${record[i].wins}\nLosses: ${record[i].losses}\nPoints: ${record[i].points}`
    );
    place--;
    ranking++;
  }
  for (let i = place - 1; i >= 0; i--) {
    let displayedUsername = (await bot.users.fetch(record[i].id)).username;
    secondStandingsEmbed.addField(
      "" + ranking,
      `Username: ${displayedUsername}\nWins: ${record[i].wins}\nLosses: ${record[i].losses}\nPoints: ${record[i].points}`
    );
    ranking++;
  }
  const standingsChannel = bot.channels.cache.get("892804270259331082");
  standingsChannel.send({ embeds: [firstStandingsEmbed] });
  standingsChannel.send({ embeds: [secondStandingsEmbed] });
}
bot.login(process.env.DISCORDJS_BOT_TOKEN);
