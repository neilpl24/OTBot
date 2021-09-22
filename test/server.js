require('dotenv').config();
const Express = require("express");
let app = Express();
app.use(Express.urlencoded({ extended: false }));
app.use(Express.json());
const port = 80;
app.listen(port, () => {
    try {
        console.log('Fake NHL data is Online');
    } catch (error) {
        console.log(error);
    }
});
let gameOne = {
    "liveData":
    {
        "linescore": {
            "currentPeriod": 3,
            "teams": {
                "home":
                {
                    "team":
                        { "name": "Carolina Hurricanes" },
                    "goals": 3
                },
                "away":
                {
                    "team":
                        { "name": "New Jersey Devils" },
                    "goals": 3
                }
            },
            "intermissionInfo":
                { "inIntermission": true }
        },
    },
    "gameData":
    {
        "game":
            { "pk": 10395867 },
        "status":
            { "abstractGameState": "Ongoing" }
    }
}

let finishedGameOne = {
    "liveData":
    {
        "linescore": {
            "currentPeriod": 4,
            "teams": {
                "home":
                {
                    "team":
                        { "name": "Carolina Hurricanes" },
                    "goals": 4
                },
                "away":
                {
                    "team":
                        { "name": "New Jersey Devils" },
                    "goals": 3
                }
            },
            "intermissionInfo":
                { "inIntermission": false }
        },
    },
    "gameData":
    {
        "game":
            { "pk": 10395867 },
        "status":
            { "abstractGameState": "Final" }
    }
}

let gameTwo = {
    "liveData":
    {
        "linescore": {
            "currentPeriod": 3,
            "teams": {
                "home":
                {
                    "team":
                        { "name": "Washington Capitals" },
                    "goals": 8
                },
                "away":
                {
                    "team":
                        { "name": "Boston Bruins" },
                    "goals": 8
                }
            },
            "intermissionInfo":
                { "inIntermission": true }
        },
    },
    "gameData":
    {
        "game":
            { "pk": 10395869 },
        "status":
            { "abstractGameState": "Ongoing" }
    }
}

let finishedGameTwo = {
    "liveData":
    {
        "linescore": {
            "currentPeriod": 5,
            "teams": {
                "home":
                {
                    "team":
                        { "name": "Washington Capitals" },
                    "goals": 8
                },
                "away":
                {
                    "team":
                        { "name": "Boston Bruins" },
                    "goals": 9
                }
            },
            "intermissionInfo":
                { "inIntermission": false }
        },
    },
    "gameData":
    {
        "game":
            { "pk": 10395869 },
        "status":
            { "abstractGameState": "Final" }
    }
}

app.get('/getgame', async (request, response) => {
    response.send(gameTwo);
});

app.get('/getfinishedgame', async (request, response) => {
    response.send(finishedGameTwo);
});