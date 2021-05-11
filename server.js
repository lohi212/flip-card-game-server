const express = require('express');
const bodyParser = require('body-parser');
const redis = require("redis");
const client = redis.createClient();
const _ = require("lodash");
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json({ limit: '50mb' }));

app.get('/',(req,res) => {
    res.json("hello world!")
})

app.post('/save-user-score', (req, res) => {
    const { score, username } = req.body;
    const body = {
        score:`${score}`,
        username:`${username}`
    }

    client.set(username, score);
    
    client.sadd(['users', username], function(err, reply) {
        if (err) {
            console.log(err);
        }
    });

    res.json({source:'cache',data:body})
});

app.get('/get-leaderboard', (req, res) => {

    client.smembers('users', function(err, keys) {
        const promiseArr = keys.map(key => new Promise((resolve, reject) => {
            client.get(key, (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ name: key, score: data });
                    }
            })
        }));
        
        Promise.all(promiseArr)
            .then(data => {
                const orderedArray = _.sortBy(data, o => parseInt(o.score))
                res.json(orderedArray.reverse());
            });
    });
});

app.post('/update-score', (req,res) => {
    const {username} = req.body;
    client.incr(username, function(err, reply) {
        res.json(reply);
    });
   
})

app.listen(4000, () => {
    console.log('server started on PORT:', 4000);
    client.on("error", function(error) {
        console.error('Failed connecting to redis', error);
    });
});
