// Wordnik key and inflection things
var WordnikAPIKey = '0nxyph37juaxtz2c5haq6i8wam1dl5wmykp0dbdxdwts25z6l';
var request = require('request');

// Global premade replies for the bot
var preMadeReplies;
var preMadeAnimalReplies;

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

    console.log(specAnimal);
    if (specAnimal.length === 0) {
        // We do not have the requested animal
        console.log("We do not have the requested animal");
        return randomFromArray(arr);
    }
    // This will be the address of the animal in the images file
    return randomFromArray(specAnimal);
}

/**
 * Removes integers from file names in images
 * @param str the string to remove an int from
 * @returns {string} the string with no ints
 */
function removeInts(str) {
    let rtn = str.slice(0, str.indexOf('.'));
    for (let i = 0; i < rtn.length; i++) {
        if (rtn.charAt(i) <= 0 || rtn.charAt(i) > 0) {
            rtn = rtn.slice(0, i);
            break;
        }
    }

    return rtn;
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
/**
 * Tweets a random image from the images folder every hour
 * Occasionally provides the name of the animal, occasionally does not
 */
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

            //Half the time we will provide the name of the animal, half the time we will not
             if (Math.random() <= .5) {
                 let tweetText = preMadeReplies.pick();
                 //Upload the image to twitter
                 tweetWithImage(content, tweetText);
             } else {
                let tweetText = preMadeAnimalReplies.pick() + removeInts(animal);
                tweetWithImage(content, tweetText);
            }
        }
    })
}

//hi
/**
 * Responds to being mentioned based on cases
 * If media is provided and the user states it is an animal, then
 * the bot will retweet it, if media is provided and the user does not
 * state an animal we recognize, we will not interact with the tweet
 * If the user does not provide media, we will tweet @ them with an
 * animal picture
 * @param tweet the tweet that mentioned us
 */
function respondToMention(tweet) {
    console.log("Mention event");
    let mentioner = '@' + tweet.user.screen_name;
    let reply = "";
    let x = tweet.text.toLowerCase();

    // Do not interact with replies (for spam purposes)
    if (tweet.in_reply_to_status_id != null) {
        return;
    }

    const file = readline.createInterface({
        input: fs.createReadStream('animals'),
        output: process.stdout,
        terminal: false
    });

    //if the bot detects an image is provided, it will consider retweeting it
    if (tweet.extended_entities !== undefined && tweet.retweet_count === 0) {
        console.log("User media detected");


        // if a tweet has already been retweeted, do not retweet it again
        if (x.includes("rt")) {
            return;
        }

        //Verify the image provided is an animal we recognize
        file.on('line', (line) => {
            // If we do recognize the animal, go ahead and retweet the image
            if (line !== '' && x.includes(line.toLowerCase())) {
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
    } else {
        let tweeted = false;

        // Same as above, verify if we recognize the animal provided
        file.on('line', (line) => {
            // If we do recognize the animal, look for that animal in the iamges array
            if (line !== '' && x.includes(line.toLowerCase())) {
                console.log("User specified animal - searching in images" );
                reply = mentioner + " " + preMadeAnimalReplies.pick() + line;
                const img = path.join(__dirname, '/images/' + randomAnimalFromArray(images, line)),
                content = fs.readFileSync(img, {encoding: 'base64'});
                // Since we are going to keep reading from the file, we only want to tweet once
                if (!tweeted) {
                    tweetWithImage(content, reply);
                    tweeted = true;
                }
            }

            if (line === '' && !tweeted) {
                // If an animal was not specified, we will just give them a random one
                console.log("Could not find animal - providing random one");
                reply = mentioner + " " + preMadeReplies.pick();
                const img = path.join(__dirname, '/images/' + randomFromArray(images)),
                    content = fs.readFileSync(img, {encoding: 'base64'});
                tweetWithImage(content, reply);
            }
        })
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
    })
}

/**
 * Defines two arrays that add personality to the bot by changing its replies
 * Runs tweet, and watches for mention and follow events
 */
function runBot() {
    console.log(" "); // just for legible logs

        preMadeReplies = [
           "Hello! " + " I hope you " + "enjoy" + " this animal picture!",
            "How's it going! You seem like you could use more animal" + " pictures" + " in your life",
            "Who " + "loves" + " animals? I hope you do!",
            "Animals are awesome, aren't they?"
        ];

    preMadeAnimalReplies = [
        "Hello, " + " I hope you " + "enjoy" + " this picture of the majestic ",
        "I absolutely adore animals, how do you feel about the ",
        "Do you like animals? How do you feel about the great "
    ];

    tweet();
    var stream = T.stream('statuses/filter', { track: '@AnimalBot444' });
    stream.on('tweet', respondToMention);
    stream.on('follow', tweetWhenFollowed);
}

// Run the bot
runBot();
setInterval(runBot, 1000 * 60 * 60);

