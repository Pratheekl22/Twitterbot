// Wordnik key and inflection things
var WordnikAPIKey = '0nxyph37juaxtz2c5haq6i8wam1dl5wmykp0dbdxdwts25z6l';
var request = require('request');
var inflection = require('inflection');
var pluralize = inflection.pluralize;
var capitalize = inflection.capitalize;
var singularize = inflection.singularize;

// Global premade replies for the bot
var preMadeReplies;
var preMadeAnimalReplies;

// Blacklist
var wordfilter = require('wordfilter');

// Twitter Essentials
var Twit = require('twit');

// Image essentials
var fs = require('fs');
var path = require('path');

//File reader to read animals line by line
var readline = require('readline');

// Include configuration file
var T = new Twit(require('./config.js'));

Array.prototype.pick = function() {
    return this[Math.floor(Math.random()*this.length)];
}

/**
 * Gets random element from an array
 * @param arr array to extract random element from
 * @returns {*} randomly selected element from the array
 */
function randomFromArray(arr){
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Gathers all animals of one type in an array
 * Randomly chooses one of the animals to return
 * @param arr the array of animals
 * @param animal to choose a random from
 * @returns {*} A random animal of type animal
 */
function randomAnimalFromArray(arr, animal){
    let specAnimal = [];
    arr.forEach(function (animalArr) {
        if (animalArr.includes(animal)) {
            specAnimal.push(animalArr);
        }
    })

    // This will be the address of the animal in the images file
    return randomFromArray(specAnimal);
}

/**
 * Removes integers from file names in images
 * @param str the string to remove an int from
 * @returns {string} the string with no ints
 */
function removeInts(str) {
    let rtn = "";
    // Due to the naming convention of the file, going backwards is efficient
    for (let i = str.length - 1; i <= 0; i--) {
        if(isNaN(str.charAt(i).parseInt)) {
            rtn += str.charAt(i);
        }

        return rtn;
    }
}

/**
 * Creates and posts a tweet with an image and status
 * @param content the location of the image to upload
 * @param tweetText the status of the tweet
 */
function tweetWithImage(content, tweetText) {
    // First upload the image to Twitter
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

var images = [];
// Posts images
//ToDo Perhaps provide the name of the animal
function tweet() {
    console.log("Tweet event");
    // Fill images[] with image paths from the images file
    fs.readdir(__dirname + '/images', function (err, files) {
        if (err) {
            console.log("Error: " + err);
        } else {
            images = [];
            files.forEach(function (f) {
                images.push(f);
            });

            //Select a random image from the array and store its path
            let animal = randomFromArray(images);
            const img = path.join(__dirname, '/images/' + animal),
                content = fs.readFileSync(img, {encoding: 'base64'});
            let tweetText = preMadeReplies.pick();

            //tweetWithImage(content, tweetText);
            //Upload the image to twitter
        }
    })
}

var animals = []
//TODO stop @ when replied to
// Check if the user specified what animal they want to see
function respondToMention(tweet) {
    console.log("Mention event");
    let mentioner = '@' + tweet.user.screen_name;
    let reply = "";

    //if the bot detects an image is provided, it will consider retweeting it
    if (tweet.extended_entities !== undefined && tweet.retweet_count === 0) {
        console.log("User media detected");
        let x = tweet.text.toLowerCase();

        if(x.includes("rt")) {
            return;
        }
        //Verify the image provided is an animal we recognize
        const file = readline.createInterface({
            input: fs.createReadStream('C:\\Users\\Pratheek Lakkireddy\\IdeaProjects\\Twitterbot\\animals'),
            output: process.stdout,
            terminal: false
        });

        file.on('line', (line) => {
            if(line !== '' && x.includes(line.toLowerCase())) {
                console.log("Animal detected");
                T.post('statuses/retweet/' + tweet.id_str, {}, function (err, data, response) {
                    if (err) {
                        console.log('Error retweeting: ', err);
                    } else {
                        console.log("Status retweet successful!");
                    }
                })
            }
        });
        // If x is undefined, we do not know if the tweet text contains an animal
    } else {
        reply = mentioner + " " + preMadeReplies.pick();
        const img = path.join(__dirname, '/images/' + randomFromArray(images)),
            content = fs.readFileSync(img, {encoding: 'base64'});

        tweetWithImage(content, reply);
    }
}

//ToDo make this function work
// check if user has favorite animal, if they do show them that animal
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

//ToDo Maybe add an animal of the day method that posts a picture of the most
// talked about animal of that day, if we dont have one just say what it is
function runBot() {
    console.log(" "); // just for legible logs

        preMadeReplies = [
           "Hello" + " I hope you " + "enjoy" + " this animal picture!",
            "How's it going! You seem like you could use more animal " + "picture" + " in your life",
            "Who " + "loves" + " animals? I hope you do!"
        ];

    preMadeAnimalReplies = [
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

