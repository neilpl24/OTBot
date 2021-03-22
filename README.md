# OTBot
OT Bot is a discord bot designed to enhance the exciting experience of NHL’s coveted 3 on 3 overtime. After an NHL game has reached the conclusion of regulation in a tie, OT Bot will notify participating users with a message saying that they have 5 minutes to lock in their pick for overtime. The bot will also provide a streaming link to the game in question. A correct pick will provide a 1.5 points to the winner on the server’s respective leaderboard, whereas an incorrect pick will subtract a point.
## Fetching NHL Data
Before I dive in, I would like to give a special thanks to .

Also, feel free to skip this section, this is just me going off on a tangent about the NHL's API and how fun it was to work with it.

The NHL keeps its scheduling data for each game on this link: https://statsapi.web.nhl.com/api/v1/schedule. This page is updated daily which allows the bot to go through the schedule path of JSON objects and loop through all the games to collect their IDs.
![img](https://imgur.com/0dn04N9.png)
This is extremely important because the NHL live data API is in this format: https://statsapi.web.nhl.com/api/v1/game/**gameIDgoeshere**/feed/live?site=en_nhl. The bot is able to loop through a list of URLs and now has a plethora of live data to work with. The live API the NHL uses is very up to date and has some really cool features that I hopefully can use to add some updates to this bot. Here is an example of some of the live data JSON objects in one of today's (03/22/2021) matchups, which features the Carolina Hurricanes and the Columbus Blue Jackets.

## Commands
OT Bot has a few commands that run using a message event listener while it simultaneously fetches data from ongoing games. 

