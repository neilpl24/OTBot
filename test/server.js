require('dotenv').config();
const Express = require("express");
let app = Express();
app.use(Express.urlencoded({ extended: false }));
app.use(Express.json());
const port = 4000;
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
            }
        }, "intermissionInfo":
            { "inIntermission": true },
    },
    "gameData":
    {
        "game":
            { "pk": 10395867 },
        "status":
            { "abstractGameState": "Ongoing" }
    }
}

app.post('/getgame', async (request, response) => {
    response.send(gameOne);
});