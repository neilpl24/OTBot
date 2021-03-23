# OTBot
OT Bot is a discord bot designed to enhance the exciting experience of NHL’s coveted 3 on 3 overtime. After an NHL game has reached the conclusion of regulation in a tie, OT Bot will notify participating users with a message saying that they have 5 minutes to lock in their pick for overtime. The bot will also provide a streaming link to the game in question. A correct pick will provide a 1.5 points and a win to the winner on the server’s respective leaderboard, whereas an incorrect pick will subtract a point and add a loss.
## Fetching NHL Data
Before I dive in, I would like to give a special thanks to .

Also, feel free to skip this section, this is just me going off on a tangent about the NHL's API and how fun it was to work with it.

The NHL keeps its scheduling data for each game on this link: https://statsapi.web.nhl.com/api/v1/schedule. This page is updated daily which allows the bot to go through the schedule path of JSON objects and loop through all the games to collect their IDs.

<img src="https://imgur.com/0dn04N9.png" width="500">

This is extremely important because the NHL live data API is in this format: /api/v1/game/**gameIDgoeshere**/feed/live?site=en_nhl. 

The bot is able to loop through a list of URLs and now has a plethora of live data to work with. The live API the NHL uses is very up to date and has some really cool features that I hopefully can use to add some updates to this bot. Here is an example of some of the live data JSON objects in one of today's (03/22/2021) matchups, which features the Carolina Hurricanes and the Columbus Blue Jackets. 

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
In order to keep track of users and their record of picks, I added an external server in MongoDB and linked it to OTBot. I will dive deeper into this process and how it gets updated in the demo section. Huge shoutout to [CodeLyon](https://www.youtube.com/watch?v=8no3SktqagY) for the tutorial on the setup.

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
<img src="https://imgur.com/a/9JDwqwH.png" width="500">

If I try to run the !ot command again, I will be notified by the bot that I have already signed up. This handles a potential error.
![](https://media.giphy.com/media/wjsFMD02n0RdrypN9j/giphy.gif)

### !record




