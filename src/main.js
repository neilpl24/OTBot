const scheduleUrl = "https://statsapi.web.nhl.com/api/v1/schedule";
const fetch = require("node-fetch");
let otGames = [];
let correct = [];
let incorrect = [];
const mongoose = require("mongoose");

require('dotenv').config();

const { Client } = require('discord.js');

const bot = new Client();



bot.on('ready', () => {
    console.log("OTBot is live.");
});

// Sets up our MongoDB server.
mongoose.connect(process.env.MONGODB_SRV, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
}).then(()=>{
    console.log('Connection to database is successful!')
}).catch((err) => {
    console.log(err);
});
// This setInterval function runs getSchedule() every 10 seconds so that we are receiving up to date data.
let runBot = setInterval(function(){
 getSchedule()}, 3000);



async function getSchedule(){
    const response = await fetch(scheduleUrl);
    const schedule = await response.json();
    let games = [];

    // Uses the schedule API to get our game IDs to track live data.
    for(let i=0; i<schedule.totalGames; i++) {
        games.push(schedule.dates[0].games[i].gamePk);
        games.sort();
    }
    gameUrls = [];
    gameDataArray = [];

    // Creates an array of game data json objects 
    for(let i=0; i<schedule.totalGames; i++) {
        gameUrls.push(`https://statsapi.web.nhl.com/api/v1/game/${games[i]}/feed/live?site=en_nhl`);
        const gameResponse = await fetch(gameUrls[i]);
        const gameData = await gameResponse.json();
        gameDataArray.push(gameData);

    }
    // Scans all NHL games for overtime
    for(let i=0; i<gameDataArray.length; i++) {
        const channel = bot.channels.cache.get('819792691511558184');
        if((gameDataArray[i].liveData.linescore.currentPeriod == 3 || gameDataArray[i].liveData.linescore.currentPeriod == 4)&& gameDataArray[i].liveData.linescore.intermissionInfo.inIntermission) {
            if(!otGames.includes(gameDataArray[i].gameData.game.pk)) {
                let awayUsers = [];
                let homeUsers = [];
                otGames.push(gameDataArray[i].gameData.game.pk);
                const homeTeam = gameDataArray[i].liveData.linescore.teams.home;
                const awayTeam = gameDataArray[i].liveData.linescore.teams.away;

                channel.send(`GET READY...IT'S TIME!!!! The ${homeTeam.team.name} take on the ${awayTeam.team.name}! Who is your pick! React with a '✅' to lock your pick in for the ${homeTeam.team.name} or react with a ☑️ to lock your pick in for the ${awayTeam.team.name} ! You have 2 minutes!`);
                    // Fetches the reactions from the OT games after 2 minutes.
                    setTimeout(() => {
                        channel.messages.fetch({ limit: 2 }).then(messages => {
                            let homeID = messages.get(messages.keyArray()[0]);
                        // This for loop is a precaution for when games go into overtime within 2 minutes of each other.
                        for(let i=0; i<2; i++) {
                            if(messages.get(messages.keyArray()[i]).content.includes(homeTeam.team.name)) {
                                homeID = messages.get(messages.keyArray()[i]);
                                break;
                            }
                        }
                        if(homeID.reactions.resolve('✅').users != undefined) {
                            homeID.reactions.resolve('✅').users.fetch({limit:100}).then(users => {
                                users.forEach(function(value, key) {
                                    homeUsers.push(value);
                                });
                            });
                        }
                        if(homeID.reactions.resolve('☑️').users != undefined) {
                            homeID.reactions.resolve('☑️').users.fetch({limit:100}).then(users => {
                                users.forEach(function(value, key) {
                                    awayUsers.push(value);
                                });
                            });
                        }
                    });
                 }, 120000);
                // Calls the getWin() function until the game in question has ended.
                let over = setInterval(function(){
                    getWin()}, 10000);
                async function getWin() {
                    const res = await fetch(gameUrls[i]);
                    const gameEnded = await res.json();
                    if(gameEnded.gameData.status.abstractGameState == "Final" && otGames.includes(gameEnded.gameData.game.pk)) {
                        clearInterval(over);
                        if(gameEnded.liveData.linescore.teams.away.goals >= gameEnded.liveData.linescore.teams.home.goals) {
                            channel.send(`The ${gameEnded.liveData.linescore.teams.away.team.name} have beaten the ${gameEnded.liveData.linescore.teams.home.team.name} by a score of ${gameEnded.liveData.linescore.teams.away.goals} to ${gameEnded.liveData.linescore.teams.home.goals}! I am now logging everyone's scores. You can check using the records command.`);
                            awayUsers.forEach(user => {
                                correct.push(user.id);
                                });
                            homeUsers.forEach(user => {
                                incorrect.push(user.id);
                                });
                                updateData();
                        } else {
                            channel.send(`The ${gameEnded.liveData.linescore.teams.home.team.name} have beaten the ${gameEnded.liveData.linescore.teams.away.team.name} by a score of ${gameEnded.liveData.linescore.teams.home.goals} to ${gameEnded.liveData.linescore.teams.away.goals}! I am now logging everyone's scores. You can check using the records command.`);;
                            homeUsers.forEach(user => {
                                correct.push(user.id);
                            });
                            awayUsers.forEach(user => {
                                incorrect.push(user.id);
                            });
                            updateData();
                        }
                    }
                }
            }
        } 
    }
}

const profileModel = require("../models/profileSchema")
// Message event listener
bot.on('message', message => {
    if(message.content.includes(`GET READY...IT'S TIME!!!!`)) {
        message.react('✅');
        message.react('☑️');
    }
    createProfile();
    async function createProfile(){
        const prefix = process.env.PREFIX;
        const args = message.content.slice(prefix.length).split(/ +/);
        const command = args.shift().toLowerCase();
        if(!message.content.startsWith(prefix)) {
            return;
        }
        if(command === "ot") {
            let profileData = await profileModel.findOne({userID: message.author.id});
            let profile;
            if(profileData == undefined) {
                profile = profileModel.create({
                userID: message.author.id,
                points: 0,
                wins: 0,
                losses: 0
                }).then(() =>{
                        message.channel.send(`${message.author} has signed up for OTBot!`);
                        profile.save();
                });
            } else {
                message.channel.send(`You have already signed up for OTBot!`);
            }
        } else if(command === "record") {
            let profileData = await profileModel.findOne({userID: message.author.id});
            if(profileData == undefined) {
                message.channel.send(`${message.author}, you have not signed up for OT Bot so you do not have a record. Use the command !ot to sign up.`);
            } else if(profileData.wins > profileData.losses) {
                message.channel.send(`${message.author} has ${profileData.wins} wins and ${profileData.losses} losses. Looking like the Hurricanes with that record...keep it up!`);
            } else {
                message.channel.send(`${message.author} has ${profileData.wins} wins and ${profileData.losses} losses. Looking like the Red Wings with that record right now...yikes.`);
            }
        } else if(command === "stop" && message.author.id === '443437518336163841') {
            clearInterval(runBot);
            message.channel.send(`OTBot has stopped fetching API data. How are you going to know the scores now???`);
        }
    }   
});
// This function takes our user data and uploads it to the MongoDB server.
function updateData() {
    console.log("Logging Data");
    let map = new Map();
    let winMap = new Map();
    let loseMap = new Map();
    correct.forEach(user => {
        if(map.has(user)) {
            map.set(user, map.get(user)+1.5);
        } else {
            map.set(user, 1.5);
        }
    });

    incorrect.forEach(user => {
        if(map.has(user)) {
            map.set(user, map.get(user)-1);
        } else {
            map.set(user, -1);
        }
    });

    correct.forEach(user => {
        if(winMap.has(user)) {
            winMap.set(user, winMap.get(user)+1);
        } else {
            winMap.set(user, 1);
        }
    })

    incorrect.forEach(user => {
        if(loseMap.has(user)) {
            loseMap.set(user, loseMap.get(user)+1);
        } else {
            loseMap.set(user, 1);
        }
    })

    let values = Array.from(map, ([name, value]) => ({ name, value }));
    let winValues = Array.from(winMap, ([name, value]) => ({ name, value }));
    let loseValues = Array.from(loseMap, ([name, value]) => ({ name, value }));
    async function update() {
        for(let i=0; i<values.length; i++) {
            const updateProfile = await profileModel.findOneAndUpdate({
                userID: values[i].name,
            },
            {
                $inc: {
                    points: values[i].value,
                },
            });
        }
    for(let i=0; i<winValues.length; i++) {
        const updateProfile = await profileModel.findOneAndUpdate({
            userID: winValues[i].name,
        },
        {
            $inc: {
                wins: winValues[i].value,
            },
        });
    }
    for(let i=0; i<loseValues.length; i++) {
        const updateProfile = await profileModel.findOneAndUpdate({
            userID: loseValues[i].name,
        },
        {
            $inc: {
                losses: loseValues[i].value,
            },
        });
    }
}
    update();
}
bot.login(process.env.DISCORDJS_BOT_TOKEN);
