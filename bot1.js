// Wordnik key and some inflection things
var WordnikAPIKey = '0nxyph37juaxtz2c5haq6i8wam1dl5wmykp0dbdxdwts25z6l';
var request = require('request');
var inflection = require('inflection');
var pluralize = inflection.pluralize;
var capitalize = inflection.capitalize;
var singularize = inflection.singularize;
var preMadeReplies;	// store prebuilt strings here.

// Blacklist
var wordfilter = require('wordfilter');

// Twitter Essentials
var Twit = require('twit');

// Image essentials
var fs = require('fs');
var path = require('path');

// Include configuration file
var T = new Twit(require('./config.js'));

// Picks random item from array
function randomFromArray(arr){
    return arr[Math.floor(Math.random() * arr.length)];
}

function tweetWithImage(content, tweetText) {
    T.post('media/upload', {media_data: content}, function (err, data, response) {
        if (err) {
            console.log('Error uploading: ', err);
        } else {
            console.log('Successful upload! Tweeting now - ');

            // Now post the image with the status
            T.post('statuses/update', {
                status: tweetText,
                media_ids: new Array(data.media_id_string)
            }, function (err, data, response) {
                if (err) {
                    console.log('Error tweeting: ', err);
                } else {
                    console.log("Image and Status tweet successful!");
                }
            })
        }
    })
}

//Since tweet is the first thing that runs, images will be defined and available to all methods
var images = [];
// Posts images
//ToDo Perhaps provide the name of the animal
function tweet() {
    console.log("Tweet event");
    fs.readdir(__dirname + '/images', function (err, files) {
        if (err) {
            console.log("Error: " + err);
        } else {
            images = [];
            files.forEach(function (f) {
                images.push(f);
            });

            //Select a random image from the array and store its path
            const img = path.join(__dirname, '/images/' + randomFromArray(images)),
                content = fs.readFileSync(img, {encoding: 'base64'});
            let tweetText = preMadeReplies.pick();

            tweetWithImage(content, tweetText);
            //Upload the image to twitter

        }
    })
}


//TODO retweet when an animal image is provided
function respondToMention(tweet) {
    console.log("Mention event");
    //Select a random image from the array and store its path
    const img = path.join(__dirname, '/images/' + randomFromArray(images)),
        content = fs.readFileSync(img, {encoding: 'base64'});
    let mentioner = '@' + tweet.user.screen_name;

    reply = mentioner + " " + preMadeReplies.pick();

    tweetWithImage(content, reply);
}

function tweetWhenFollowed(follow) {
    console.log("Follow event");
    //Select a random image from the array and store its path
    const img = path.join(__dirname, '/images/' + randomFromArray(images)),
        content = fs.readFileSync(img, {encoding: 'base64'});

    // Who followed the bot, what their ID and screen name are
    let name = '@' + follow.user.screen_name;

    let reply = name + " " + preMadeReplies.pick();
    tweetWithImage(content, reply);
}


//ToDo Fix this an implement it in the premade replies array
function getSyn(word) {
    request("https://api.wordnik.com/v4/word.json/" + word + "/relatedWords?useCanonical=false&relationshipTypes=synonym&limitPerRelationshipType=10&api_key="
        + WordnikAPIKey, function (err, response, data) {
        if (err != null) {
            return;
        }

        var json = JSON.parse(data);
        if (debug) {
            console.log(json[0]);
        }
    })
}

function runBot() {
    console.log(" "); // just for legible logs

        preMadeReplies = [
           "Hello" + " I hope you " + "enjoy" + " this animal picture!",
            "How's it going! You seem like you could use more animal " + "picture" + " in your life",
            "Who " + "loves" + " animals? I hope you do!"
        ];

    tweet();
    var stream = T.stream('statuses/filter', { track: '@AnimalBot444' });
    stream.on('tweet', respondToMention);
    stream.on('follow', tweetWhenFollowed);
}

// Run the bot
runBot();
setInterval(runBot, 1000 * 60 * 60);

