# OTBot
OT Bot is a discord bot designed to enhance the exciting experience of NHL’s coveted 3 on 3 overtime. After an NHL game has reached the conclusion of regulation in a tie, OT Bot will notify participating users with a message saying that they have 5 minutes to lock in their pick for overtime. The bot will also provide a streaming link to the game in question. All participants will contribute a point to the pot spread which will be distributed amongst the winners (Ex. 2 vote winning team, 4 vote losing team, each winner gets 3 points.)
Before I dive in, I would like to give a special thanks to Chris Beardy for directing me to several NHL API links and projects and helping me navigate through the lengthy directories. This sped up the experimentation process and allowed me to dive straight in!

Also, feel free to skip this section, this is just me going off on a tangent about the NHL's API and how fun it was to work with it.

The NHL keeps its scheduling data for each game on this link: https://statsapi.web.nhl.com/api/v1/schedule. This page is updated daily which allows the bot to go through the schedule path of JSON objects and loop through all the games to collect their IDs.

<img src="https://imgur.com/0dn04N9.png" width="500">

This is extremely important because the NHL live data API is in this format: /api/v1/game/**gameIDgoeshere**/feed/live?site=en_nhl. 

The bot can loop through a list of URLs and now has a plethora of live data to work with. The live API the NHL uses is very up-to-date and has some cool features that I hopefully can use to add some updates to this bot. Here is an example of some of the live data JSON objects in one of today's (03/22/2021) matchups, which features the Carolina Hurricanes and the Columbus Blue Jackets. 

<img src="https://imgur.com/6sDUAfA.jpg" width="500"><img src="https://imgur.com/2Zc89ad.png" width="500">

At the time of these screenshots, the Hurricanes were up 1-0 and the game was in the first intermission. We see here that our API data reflects that.

OTBot's accuracy heavily relies on the timing of the data, so I added a setInterval function to retrieve live game data every 3 seconds.

```javascript
let runBot = setInterval(function(){
 getSchedule()}, 3000);
```


## Commands
OT Bot has a few commands that run using a message event listener while it simultaneously fetches data from ongoing games. 
### !ot
To keep track of users and their record of picks, I added an external server in MongoDB and linked it to OTBot. I will dive deeper into this process and how it gets updated in the demo section. Huge shoutout to [CodeLyon](https://www.youtube.com/watch?v=8no3SktqagY) for the tutorial on the setup.

The !ot command signs a user up to participate in the OT picks challenge by creating an ID for them in the MongoDB database. Here is a demonstration.

![](https://media.giphy.com/media/h8ClkXlFAAZuABRPDQ/giphy.gif)

After running this command, a new user profile with my userID and some initalized fields will appear in the MongoDB server. Here is a snippet of the code behind the scenes and its result.
```javascript
let profileData = await profileModel.findOne({userID: message.author.id});
let profile;
if(profileData == undefined) {
   profile = profileModel.create({
   userID: message.author.id,
   points: 0,
   wins: 0,
   losses: 0
``` 
<img src="https://imgur.com/N3w7Y0L.png" width="500">

If I try to run the !ot command again, I will be notified by the bot that I have already signed up. This handles a potential error.

![](https://media.giphy.com/media/wjsFMD02n0RdrypN9j/giphy.gif)

### !record
We will get to see the !record command in its proper form later on in this README, but it does contain a cool error handling feature that can direct users who have not done the !ot command to sign up for OTBot. Here is a little demo.

![](https://media.giphy.com/media/rc57NG12a1AENI9tk9/giphy.gif)

## Demonstration
Now that I've laid down the foundations of the bot, I am going to go through a real simulation of it. Today's (03/22/2021) overtime game I am going to use will be the New York Islanders' 2-1 win over the Philadelphia Flyers.

Once any game goes to overtime, OTBot will send a message in the read-only overtime channel as seen below. As you can see, the bot reacts to the message with two checkmarks, which serve as options for which team to pick.

<img src="https://imgur.com/Ws0r2Fc.png" width="500"><img src="https://imgur.com/9sRL41l.jpg" width="500">

I have now added team logos instead of checkmarks, and there is a countdown. So now overtime messages will look like this (ignore the time, this was a test run).

![](https://media.giphy.com/media/sUIBv0bXW5tKMnl7CK/giphy.gif)

In this simulation, I chose the Flyers. Another user in the test server chose the Islanders. Due to the delay between the start of the 3rd period intermission and message sent, users have two minutes to put their picks in instead of the five minute intermission period. While we wait for the game to end, this is what is happening behind the scenes.
```javascript
 let over = setInterval(function(){
     getWin()}, 10000);
     async function getWin() {
          const res = await fetch(gameUrls[i]);
          const gameEnded = await res.json();
          if(gameEnded.gameData.status.abstractGameState == "Final" && otGames.includes(gameEnded.gameData.game.pk)) {
                   clearInterval(over);
                   // extra stuff down here
```

OTBot fetches the game data every 10 seconds until the requirements for a game to end are fulfilled. In this case, the getWin() function continued once [Anthony Beauvillier](https://streamable.com/2tnm17) scored a beautiful wraparound goal to win the game in overtime for the Islanders ([Thanks u/AnthonyCostantini](https://www.reddit.com/r/hockey/comments/mb3guq/taub_anthony_beauvillier_wins_it_in_ot_with_a/)). As soon as this happens, OTBot sends a message and the users who put their picks in have their records updated.

<img src="https://imgur.com/kjnwya2.jpg" width="500"><img src="https://imgur.com/8Ba6BNd.png" width="500">

Now I can check my record with the !record command! As you can see, fellow tester frost picked the correct team. He has a positive record, so his response message was a happy one, whereas mine was not.

![](https://media.giphy.com/media/xXyxpsSp0XexnAjDiP/giphy.gif)

Sorry for the Red Wings disrespect. Here is the code behind that message.
```javascript
message.channel.send(`${message.author} has ${profileData.wins} wins and ${profileData.losses} losses. Looking like the Red Wings with that record right now...yikes.`);
```
## Final Words
I really enjoyed working on this project, thank you to those who helped me break this bot several times! If anyone would like to join our server and play (we will be running it during the Stanley Cup Playoffs as well), send me a message on here or on Linkedin. Thank you so much for reading this if you made it down here.

