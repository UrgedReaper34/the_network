/* 
PREAMBLE (includes important context)
Hi! This is my program to automate the ardous task of grinding a virtual currency that my friends and I played about 3~ years ago.
I was inspired to make this because the thought of running commands over and over again manually sounded tiring to me. 
Instead of manually running commands like my other friends, I wrote a script to type them out for me.
Then I realised, I could make this run 24/7 and make it generate currency all the time even as I slept.
Then after that, I also realised I could run this script to use multiple accounts to grind currency and transfer them all to my main account.
Hence this is the final product after weeks of work gathering data, constructing it and debugging it. 

At its height, this program controlled 25 user accounts simultaneously while also running another bot account to manage the 25 user accounts.

I don't use this anymore because not only does it not make the game fun to play anymore (when you have everything, the joy of playing this game fades away) but it is also very unfair to the other players that actually obtained their currency via regular means.
Thus, its wildly outdated (last edit was 3 years ago) and doesnt work anymore. Running this will also probably throw errors because I did not include login details for my accounts.

I know its a 1800+ character long file (which is not best practice looking back 3 years down the road) so please bear with me. I'll try to annotate what each function does along the way.

Thats the main part of my intro. Here's a brief rundown of the environment this script operates in:

This runs in nodejs on an AWS Linux EC2 instance (t2.micro, if you're interested)
The game itself is a popular text-based Discord game that works by the user sending a command to a Discord bot that manages the game (which is called Dank Memer), which will acknowledge and edit your balance according to whatever action you took.
This script uses the discord.js api to interact with the Discord environment.

Although by right the discord.js API was meant for BOT users (discord bots) to interact with HUMAN users in Discord, I added a tiny bit of code to make it be able to control HUMAN accounts.
This was necessary as "Dank Memer" only allows human users to interact with it.

A typical command issued by the user would look like this:
See appendix_1.png
Thus every command sent would generate a little bit of money. Sometimes, it would give you items that you could sell.

The bots would be controlled by a management bot. An example interaction can be seen in the images attached:
A query on the bots status
appendix_2.png
An error log message
appendix_3.png

I'll go more into detail on this at each specific function.

How the command and control system is structured is:
Each bot has a status code (7 exist!)
After every task, the bot will check its status code. It will then execute the specific function associated with that status code.
This status code can be overwritten at any time, via the management bot or via the terminal.

Here are the rough status codes and their meaning:
0: paused
1: running (ie running commands on Dank Memer)
2: terminating (in the process of shutting down)
3: shut down
4: copycat mode (the bots will repeat whatever I say)
5: paused due to alternation (this is so that Dank Memer wouldn't catch on that these bots aren't actual humans)
6: item transfer

Each bot is ran by a recursive function (not the best choice in hindsight) which is spawned in by the main() function.
The recursive function is called worker() and its where most of the action happens.

That's basically the main context, feel free to scroll down and examine each individual function.
Any additional commentary that is not originally part of this file will be denoted by a + in the front.

*/
const Discord = require("discord.js")

//modified the library, edited /node_modules/discord.js/src/rest/RequestHandler.js:93 to not throw any error
//Annoying
var dotenv = require('dotenv');
const {
    env
} = require('process');
const readline = require("readline");
dotenv.config();
var startStatus = true;
const fs = require("fs")
//const cloneDeep = require('lodash.clonedeep')
var events = require('events');
var eventEmitter = new events.EventEmitter()
//+ This variable lists the possible commands each bot can choose to take and their appropriate callbacks.
var commandList = {
    "command1": {
        "name": "pls beg",
        "handler": function(response) {
            return new Promise((resolve) => {
                resolve("false")
                return "false"
            })
        }
    },
    /*"command2": {
        "name": "pls search",
        //sample response **Where do you want to search?**\nPick from the list below and type the name in chat.\n`street`, `couch`, `sink`"
        "handler": function (response){

            var content = response.substring(response.lastIndexOf("\n") + 2)
                        content = content.replace(/[^\x00-\x7F]/g,"")
                        content = content.trim().replace(/`/g, "").split(",")
                        return content[0]
        }
    },

    "command3": {
        "name": "pls pm",
        //sample response **Where do you want to search?**\nPick from the list below and type the name in chat.\n`street`, `couch`, `sink`
        "handler": function (param){
            return "f"
        }
    },*/
    //orignally command4
    "command2": {
        "name": "pls fish",
        //+ This is a sample minigame that Dank Memer would send. The "handler" is the callback which the bot would use to play the minigame in order to win some valuable items.
        "handler": function(param) {
            return new Promise((resolve) => {
                param.replace(/[^\x00-\x7F]/g, "")

                sleep(1000).then(() => {
                    if (param.search("too strong") != -1) {
                        commandMinigame(param, "fish").then((results) => {
                            resolve(results)
                            return results
                        })




                    } else if (param.search("don't") != -1) {
                        resolve("pls buy pole")
                        return "pls buy pole"

                    } else {

                        resolve("false")
                        return "false"
                    }
                })
            })

        }
    },
    //originally command5
    "command3": {
        "name": "pls hunt",
        //+ This is a sample minigame that Dank Memer would send. The "handler" is the callback which the bot would use to play the minigame in order to win some valuable items.
        //@Zenitsu Agatsuma Holy fricking shizz god forbid you find something innocent like a duck, ITS A DRAGON! Type the phrase below in the next 10 seconds or you're toast! Type `o﻿h﻿ ﻿l﻿o﻿o﻿k﻿ ﻿a﻿ ﻿d﻿r﻿a﻿g﻿o﻿n﻿`
        "handler": function(parameter) {
            return new Promise((resolve) => {
                var param = JSON.stringify(parameter).replace(/^[a-zA-Z0-9_`]+( +[a-zA-Z0-9_`]+)*$/g, '')

                sleep(5500).then(() => {
                    if (param.search("DRAGON") != -1) {
                        var solution = param.substring(param.indexOf("`") + 1, param.lastIndexOf("`"))
                        if (solution.trim().length == 0) {
                            console.log("Error in dragon minigamehandler")
                            resolve("Error in dragon minigamehandler")
                            return "Error in dragon minigamehandler";

                        } else {
                            resolve(solution)
                            return solution;

                        }


                    } else if (param.search("You don't have a hunting rifle") != -1) {
                        resolve("pls buy rifle")
                        return "pls buy rifle"
                    } else {

                        resolve("false")
                        return "false"
                    }
                })
            })

        }
    },
    /*
    "command6": {
        "name": "pls hl",
        "handler": function (param){
            return "low"
        }
    },
    */
    //orignally command7
    "command4": {
        "name": "pls dig",
        "handler": function(param) {
            return new Promise((resolve) => {
                param.replace(/[^\x00-\x7F]/g, "")

                sleep(1000).then(() => {
                    if (param.search("uncover") != -1) {
                        commandMinigame(param, "dig").then((results) => {
                            resolve(results)
                            return results
                        })




                    } else if (param.search("don't") != -1) {
                        resolve("pls buy shovel")
                        return "pls buy shovel"

                    } else {

                        resolve("false")
                        return "false"
                    }
                })
            })

        }


    }

};

const {
    resolve
} = require("path");

//+ A promise based sleep function with the ability to store the timeout data in a database.
function sleep(ms, profileNo, id) {
    if (profileNo != undefined) {
        //We are given a profile to store timeout data
        return new Promise((resolve) => {
            var arr = getProfile(profileNo).timeout;
            arr.push({
                id: setTimeout(resolve, ms)
            })
            writeList("timeout", arr, profileNo);
        });
    } else {
        return new Promise((resolve) => {
            setTimeout(resolve, ms)
        });
    }
}
//+ Used for purely decorative purposes to color my console warnings and errors.
const colors = {
    Reset: "\x1b[0m",
    BOLD: "\x1b[1m",
    Faint: "\x1b[2m",
    ITALIC: "\x1b[3m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",

    Black: "\x1b[30m",
    //red
    ERROR: "\x1b[31m",
    //green
    SYSTEM: "\x1b[32m",
    //yellow
    YELLOW: "\x1b[33m",
    //blue
    USERDATA: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",

    BgBlack: "\x1b[40m",
    BgERROR: "\x1b[41m",
    BgSYSTEM: "\x1b[42m",
    BgWARN: "\x1b[43m",
    BgUSERDATA: "\x1b[44m",
    BgMagenta: "\x1b[45m",
    BgCyan: "\x1b[46m",
    BgWhite: "\x1b[47m"

};
//+ These are the user IDs of users who are allowed to issue commands to the management bot. In this case, me and my other account.
var cachedUsers = ["784315445926428682"]
var allowedUsers = ["784315445926428682", "780954860265930844"]

function commandMinigame(parameter, mode) {
    /* + An interesting function. Dank Memer makes you play a minigame when you run the command "pls work". There are 5 possible minigames that Dank Memer could issue you.
    This function analyses each message and tells the bot what action it should take to win the minigame, and sometimes even runs the action for the bot itself. */
    return new Promise((resolve) => {
        var param = parameter.toLowerCase()
        var basetext = param.toLowerCase();

        param.replace(/[^\x00-\x7F]/g, "")
        var wordDict, sentenceDict, start, end, type;
        //+ These lines of code arent actually used as the function these serve have been implemented in the callbacks in the commandList dataset instead. I have commented them out.
        /*if(mode == "fish"){
            wordDict = ["whale", "ocean", "swim", "water", "trout", "sink", "fishy", "jellyfish", "squid"]
            sentenceDict = ["big bait catches big fish", 'woah a big one', "the fish says glub", "hook line and sinker", "hook line sinker", "this is very fishy", "get the camera ready mom"]
            start = basetext.indexOf("quickly") + 7;
            end = basetext.indexOf("to catch") 
            
        } else if(mode == "dig"){
            wordDict = ["soil", "trowel", "uncover", "unearth", "ground", "scoop", "dirty", "excavate", "spider", "burrow"]
            sentenceDict = ["i am a dwarf and i diggy the hole", "i have never dug up a body", "i will dig all day and night", "i hope i find some treasure", "digging is my passion"]
            start = basetext.indexOf("quickly") + 7;
            end = basetext.indexOf("to uncover") 
           

        } else {
            console.log(colors.ERROR, `Invalid type passed to commandMinigameHandler`, colors.Reset)
            resolve("false")
            return false;
        }*/

        //+ This identifies the type of minigame Dank Memer sent.
        type = basetext.substring(start, end)
        type = type.substring(0, type.indexOf("the")).trim()


        var type = basetext.substring(start, end)
        type = type.substring(0, type.indexOf("the")).trim()
        console.log("type")
        console.log(type)
        var selector = []


        switch (type) {
            case "reverse":
                //+ Dank Memer gives you a word and you have to type it in reverse. IE "open" becomes "nepo"
                // start from the front, get second position letter and place it in front of the first letter
                var content = basetext.substring(basetext.indexOf("`") + 1, basetext.lastIndexOf("`"))

                content = content.replace(/[^\x00-\x7F]/g, "")
                var count = 1;
                while (count < content.length) {
                    var transplantLetter = content.substring(count, count + 1)
                    content = content.substring(0, count) + content.substring(count + 1)
                    var content = transplantLetter + content;
                    count++;
                }
                resolve(content)
                return content;
                break;
            case "re-type":
                //+ Retype the word given. Pretty easy
                var content = basetext.substring(basetext.indexOf("`") + 1, basetext.lastIndexOf("`"));

                content = content.replace(/[^\x00-\x7F]/g, "")
                resolve(content)
                return content;
                break;

            case "guess":
                //+ Guess the missing word in a sentence. Dank Memer would give you a sentence like "I feel ____ today." and you would have to guess that word.
                //+ I collected a dataset of all the possible sentences Dank Memer could give. The bot would then match letter by letter the sentence it was analysing with the sentences in the dataset.
                //+ If it got a match, it would identify the word it needed to substitute in and return it.
                console.log("guessing")
                var content = basetext.substring(basetext.indexOf("`") + 1, basetext.lastIndexOf("`")) + " ";

                content = content.replace(/[^\x00-\x7F]/g, "")
                //console.log(content)
                var guess = content.substring((content.indexOf("_") - 2), content.lastIndexOf("_") + 1)
                //console.log(guess)
                //remove guessword from string or itll mess up split()
                //insert placeholder 
                content = content.substring(0, content.lastIndexOf("_") + 2) + "^" + content.substring(content.lastIndexOf("_") + 1);
                //console.log("inserted placeholder")
                //console.log(content)
                //removing guessword
                content = content.substring(0, (content.indexOf("_") - 2)) + content.substring((content.lastIndexOf("_") + 2))

                content = content.trim()
                //console.log("content with placeholder pre-split")
                //console.log(content)
                content = content.split(" ");

                //console.log("content with placeholder after split")
                //console.log(content)
                content.splice(content.indexOf("^"), 1, guess)
                //console.log("Reinserting guessword")
                //console.log(content)


                var count = 0;
                var matchedIndex;
                var solution;

                while (count < sentenceDict.length) {
                    var matches = 0;

                    var currSent = sentenceDict[count].split(" ");

                    //sentence iteration loop

                    if (content.length == currSent.length) {
                        //length match
                        var count1 = 0;
                        //word iteration loop
                        while (count1 < currSent.length) {
                            //see how many matches (identical words) we get
                            if (content[count1].includes("_")) {
                                matchedIndex = count1;
                                solution = currSent[count1];



                            } else {
                                if (content[count1].toLowerCase() == currSent[count1].toLowerCase()) {
                                    //We got a match

                                    matches++;
                                }

                            }
                            count1++;


                        } //word iteration loop

                    }
                    if (matches > 1) {
                        //Identified correct sentence
                        console.log(solution)
                        resolve(solution)
                        return solution;
                        break;
                    }
                    count++;
                }
                break;
            case "unscramble":
                //+ Unscrambles a word. Dank Memer would give you a jumbled up word and you would have to unscramble that word.
                //+ I collected a dataset of all the possible words Dank Memer could give. The bot would then match letter by letter the word it was analysing with the words in the dataset.
                //+ If it got a match, it would return the correct word.
                var content = basetext.substring(basetext.indexOf("`") + 1, basetext.lastIndexOf("`"))
                //  console.log(content)
                content = content.replace(/[^\x00-\x7F]/g, "")
                var count = 0;
                var matchedIndex;
                var solution;
                content = content.split("")
                while (count < wordDict.length) {
                    var matches = 0;

                    var currSent = wordDict[count].split("");

                    //word iteration loop

                    if (content.length == currSent.length) {
                        //length match
                        var count1 = 0;
                        //character iteration loop
                        while (count1 < currSent.length) {
                            //see how many matches (identical letters) we get

                            if (currSent.find(function(element, index) {
                                    if (element == content[count1]) {

                                        return true;
                                    }
                                })) {
                                //We got a match

                                matches++;

                            }


                            count1++;


                        } //word iteration loop

                    }
                    if (matches >= content.length - 1) {
                        //Identified correct sentence
                        resolve(wordDict[count])
                        return wordDict[count];
                        break;
                    }
                    count++;
                }

                break;



            default:
                console.log(colors.ERROR, `Invalid type passed to commandMinigameHandler`, colors.Reset)
                resolve("false")
                return false;

        }
        resolve("false")
        return false;

    })
}
//+ Very important variable. It contains all the info on each bot account (its login info, its status code etc)
var tokenList;
//+ Reads the login info and other data on all the bot accounts and puts it into tokenList.
fs.readFile("set2.json", {
    encoding: "utf-8"
}, function(err, data) {
    if (typeof err == "text") {
        console.log(colors.ERROR, err, colors.Reset)
    } else {
        tokenList = JSON.parse(data)
        var i = 0;

        var edited = [];

        function generateSequence(n) {
            //+ This generates a random sequence in which commands would be run.
            return new Promise((resolve) => {
                var no = Number(n);
                var count = 1;
                var numArray = [];
                while (count <= no) {
                    numArray.push(count)
                    count++;

                }

                count = 1;
                var availSelection = numArray;

                var randArray = [];
                var item;

                while (count <= no) {

                    item = availSelection[Math.floor(Math.random() * availSelection.length)]
                    randArray.push(item);
                    availSelection.splice(availSelection.indexOf(item), 1)

                    count++;
                }

                resolve(randArray);

            })
        }
        var interval = new Array;
        interval[0] = undefined;

        var itemList = ["ant", "bank", "boar", "blue", "bread", "candy", "coinbomb", "cookie", "deer", "diaper", "duck", "exoticfish", "fish", "garbage", "jellyfish", "junk", "kraken", "ladybug", "legendary", "poster", "sbag", "rabbit", "rarefish", "seaweed", "skunk", "stickbug", "worm", "dragon", "baby", "memepills"]
        var managementDataset = {
            //+ This is the relay, and how the bot accounts would communicate with the management bot. 
            //+ This is normally used to pass along info like messages or errors so the management bot could log these errors into a Discord channel.
            relay: "",
            statusCode: "1",
            /*
            Codes:
            1: OK
            2: Medium Error encountered
            3: Fatal error encountered
            */

            changeEvent: function(param) {
                eventEmitter.emit("relayUpdate")

            },
            /**
             * @param {any} input
             */
            //+ This would listen to any changes made to the relay variable.
            set setRelay(input) {
                this.relay = input.substring(0, input.length - 1);
                this.statusCode = input.substring(input.length - 1);
                this.changeEvent(input);
            },
            get getRelay() {
                return this.relay;
            },
            registerListener: function(listener) {
                this.changeEvent = listener;
            }

        }
        var managementDataHandler = {
            set(target, property, value) {
                if (property == "relay") {

                    target.changeEvent(value)


                }
                if (property == "statusCode") {


                    target.statusCode = value;
                }
            }
        }
        var managementData = new Proxy(managementDataset, managementDataHandler)

        function ButtonHandler(message, buttonID, profileNo, toggle) {
            //+ Another important function. This manages how each bot presses buttons. Since discord.js had no methods for pressing buttons built into it, I had to make my own mini API wrapper for it.
            //+ Most of the mechanism behind how this works was derived from reverse engineering http requests made by the Discord app in Chrome Devtools.
            //+ This "toggle" you can see in some of my functions is to set it to either return a promise or not. Most of the time its set to return a promise.
            if (toggle == true) {
                return new Promise((resolve, reject) => {
                    var profileCache = getProfile(profileNo);
                    //perform checks
                    //+ This makes sure each request to click a button has the required information needed to make the API request
                    if (message.hasOwnProperty("channel") && message.hasOwnProperty("components")) {
                        if (message.components.length != 0) {
                            //success
                        } else {
                            console.log(colors.ERROR, `No components provided in message to ButtonHandler: id ${profileNo}`, colors.Reset)
                            reject(`No components provided in message to ButtonHandler: id ${profileNo}`)
                            return false;

                        }
                    } else {
                        console.log(colors.ERROR, `Invalid message passed to buttonHandler: id ${profileNo}`, colors.Reset)
                        reject(`Invalid message passed to ButtonHandler: id ${profileNo}`)
                        return false;
                    }
                    //+ HTTP Payload
                    var payload = {
                        "application_id": "270904126974590976",
                        "channel_id": message.channel.id,
                        //customid is actually different between buttons
                        "data": {
                            "component_type": 2,
                            "custom_id": buttonID
                        },
                        "guild_id": message.guild.id,
                        "message_flags": 0,
                        "message_id": message.id,
                        "type": 3,
                    };
                    //+ The headers for the request. It pretends to be a legitimate user client and not an external script
                    var headers = {
                        'accept': '*/*',
                        'accept-encoding': 'gzip, deflate, br',
                        'accept-language': 'en-GB',
                        'authorization': profileCache.token,
                        'content-type': 'application/json',
                        'user-agent': 'Mozilla/5.0 (Linux; Android 6.0.1; SHIELD Tablet K1 Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/55.0.2883.91 Safari/537.36',
                        'x-debug-options': 'bugReporterEnabled',
                        'origin': 'https://discord.com',
                        'referer': `https://discord.com/channels/${message.guild.id}/${message.channel.id}`,
                        'sec-ch-ua': '"Google Chrome";v="93", " Not;A Brand";v="99", "Chromium";v="93"',
                        'sec-ch-ua-mobile': "?0",
                        'sec-fetch-dest': 'empty',
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-site': 'same-origin',


                    };
                    //+ Posting the request
                    axios.post('https://discord.com/api/v9/interactions', payload, {
                            headers
                        })
                        .then(response => {
                            resolve("Success")
                            return false;
                        })
                        .catch((e) => {
                            reject("Error occured in buttonHandler")
                            console.log(colors.ERROR, e, colors.Reset)
                            return e;
                        });
                })
            } else {
                //synchronous
                var profileCache = getProfile(profileNo);
                //perform checks
                if (message.hasOwnProperty("channel") && message.hasOwnProperty("components")) {
                    if (message.components.length != 0) {
                        //success
                    } else {
                        console.log(colors.ERROR, `No components provided in message to ButtonHandler: id ${profileNo}`)
                        return false;
                    }
                } else {
                    console.log(colors.ERROR, `Invalid message passed to buttonHandler: id ${profileNo}`)
                    return false;
                }
                var payload = {
                    "application_id": "270904126974590976",
                    "channel_id": message.channel.id,
                    //customid is actually different between buttons
                    "data": {
                        "component_type": 2,
                        "custom_id": buttonID
                    },
                    "guild_id": message.guild.id,
                    "message_flags": 0,
                    "message_id": message.id,
                    "type": 3,
                };
                var headers = {
                    'accept': '*/*',
                    'accept-encoding': 'gzip, deflate, br',
                    'accept-language': 'en-GB',
                    'authorization': profileCache.token,
                    'content-type': 'application/json',
                    'user-agent': 'Mozilla/5.0 (Linux; Android 6.0.1; SHIELD Tablet K1 Build/MRA58K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/55.0.2883.91 Safari/537.36',
                    'x-debug-options': 'bugReporterEnabled',
                    'origin': 'https://discord.com',
                    'referer': `https://discord.com/channels/${message.guild.id}/${message.channel.id}`,
                    'sec-ch-ua': '"Google Chrome";v="93", " Not;A Brand";v="99", "Chromium";v="93"',
                    'sec-ch-ua-mobile': "?0",
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',


                };
                axios.post('https://discord.com/api/v9/interactions', payload, {
                        headers
                    })
                    .then(response => {
                        return false;
                    })
                    .catch(() => {
                        console.log(colors.ERROR, e, colors.Reset)
                        return e;
                    });
            }



        }

        function main() {
            //+ Where the real action begins.
            if (startStatus == true) {
                var count = 1;
                //spawns workers for each account
                //+ While loop iterates over every account found in tokenList (the account database)
                while (count <= Object.keys(tokenList).length) {
                    console.log(`Spawning instance ${count}`)

                    //+ Starts the function to spawn the function that spawns the recursive function
                    separator(count)
                    count++;
                    //check every 5mins if the worker has hanged

                    continue


                }

            }


        }

        function separator(no) {
            //+ Starts the function to spawn the recursive function
            workerHandler(no)
        }


        /*
        Status guide
        0: inactive/pause
        1: running
        2: terminating
        3: exit
        4: copycat
        5: alternating
        */
        function keepAlive(profileNo) {
            //+ This function peridically checks the timestamp when each bot last checked in. If it hasnt checked in for more than 3 minutes, this function will attempt to restart it.
            var profileCache = tokenList[`account${profileNo}`];
            try {
                var currentTime = new Date();
                var minutes;
                if (profileCache.relay != "") {
                    if (profileCache.relay.getHours() == currentTime.getHours()) {
                        minutes = profileCache.relay.getMinutes()

                    } else {
                        //If the hours are different
                        if (profileCache.relay.getHours() == currentTime.getHours() - 1) {
                            minutes = (profileCache.relay.getMinutes() - 60) * -1
                        } else {
                            //Definite crash more than an hour ago
                            minutes = -3;
                        }
                    }

                    if (profileCache.status != "3") {
                        //Is the worker supposed to be running?
                        if (minutes + 2 < currentTime.getMinutes()) {
                            //Crash or hang detected
                            //+ This logs the bot account out.
                            profileCache.client.destroy()
                            writeList("status", profileNo, "0")
                            sleep(3000).then(() => {
                                //+ THis starts the bot account's instance again.
                                workerHandler(profileNo)
                                sleep(15000).then(() => {

                                    if (tokenList[`account${profileNo}`].status != "0") {
                                        managementData.relay = `Crash detected at ${currentTime.getHours()}${currentTime.getMinutes()}, but the user, ${profileCache.name} has been restored to a running state.2`
                                    } else {
                                        managementData.relay = `Fatal crash detected at ${currentTime.getHours()}${currentTime.getMinutes()}. User, ${profileCache.name} requires human intervention to restore.3`
                                    }
                                })

                            })

                        } else {
                            managementData.relay = `${profileCache.name} has been checked for hangs at ${currentTime.getHours()}${currentTime.getMinutes()}. Everything is OK.`;
                        }
                    }
                } else {
                    //wait for next check to be done
                    managementData.relay = `Unable to determine a hang for instance ${profileCache.name}. Waiting for next check to be done...`;
                }
            } catch (e) {
                managementData.relay = `Error occured in antihang function for instance ${profileCache.name}:\n ${e}`
            }
            return;
        }

        function workerHandler(profileNo) {
            //+ Instantiates a private scope for each recursive function (worker()) to work in.
            var res = 0;
            setInterval(function() {
                keepAlive(profileNo)
            }, 600000)
            //extract account info from tokenList
            //+ client in this case refers to the client that the bot uses to interact with the discord API
            var client = new Discord.Client({
                _tokenType: ''
            });
            var finishTyping;
            var history = 0;
            var profile = getProfile(profileNo)
            var startTime = new Date();
            console.log(colors.SYSTEM, `Booting up ${profile.name}'s instance`, colors.Reset)
            //+ Logs in the bot account
            client.login(profile.token)
            var channel;

            client.on('ready', function() {
                console.log(colors.SYSTEM, `Logged in as ${profile.name}`, colors.Reset)
                managementData.relay = `${profile.name} has logged in.1;`
                if (profileNo % 2 == 0) {
                    client.user.setStatus('invisible')
                }
                channel = client.channels.cache.get(profile.channelID)

                writeList("status", profileNo, "1")
                startTime = new Date()
                writeList("client", profileNo, client)


            })
            client.on('messageUpdate', (oldMessage, newMessage) => {
                //+ Listens for edited messages.
                var profileCache = getProfile(profileNo)
                if (newMessage.author.id == "270904126974590976" && newMessage.channel.id == profileCache.channelID) {
                    writeList("edited", profileNo, newMessage)
                }
            })
            client.on("message", (message) => {
                //+ Listens for new messages. Every time a message is sent in the discord server the bot receives this event.
                var msg = message.content.toLowerCase();
                var profileCache = getProfile(profileNo);
                //+ Get updated profile data
                function detect(x) {
                    if (x == message.author.id) {
                        return true;
                    }
                }
                if (cachedUsers.find(detect) != undefined) {
                    if (profileCache.status == "4") {
                        //+ If bot is set to "repeat after me" mode
                        var allParams = msg.split(" ");

                        switch (allParams[0]) {


                            case "norepeat":

                                message.channel.send(message.content.substring(8))

                                break;
                            default:

                                message.channel.send(message.content)

                        }


                    } else if (msg.startsWith(`o!${profileNo}`)) {

                        //wait for grind mode to stop
                        if (profileCache.status == "1") {
                            writeList("status", profileNo, "4")
                            sleep(10000).then(() => {
                                message.channel.send("Copycat mode activated")
                            })
                        } else {
                            writeList("status", profileNo, "1")
                            message.channel.send("Copycat mode deactivated")
                        }
                    }
                }
            })

            function MessageHandler(message, channel, toggle, returner) {
                //+ Bot uses this function to send messages. This function handles "pretending" to be a user complete with typing events and pauses.
                if (toggle == true) {

                    return new Promise((resolve) => {
                        if (message == "" || message == undefined) {
                            resolve("done")
                            return false;
                        } else {



                            channel.startTyping();
                            sleep(Math.floor((Math.random() * 4000) + 3000))
                            channel.send(message).then((sentMessage) => {
                                channel.stopTyping()
                                sleep(1000).then(() => {

                                    resolve(sentMessage)
                                    return sentMessage
                                })


                            })




                        }
                    });
                } else {
                    if (message == "" || message == undefined) {

                    } else {
                        channel.startTyping();
                        sleep(Math.floor((Math.random() * 4000) + 3000))
                        channel.send(message)
                        channel.stopTyping()
                    }
                }

            }

            function worker() {
                //+ This is where the main action happens.
                //+ This is the recursive function that calls itself every round.
                try {
                    var profileCache = getProfile(profileNo);
                    var currentTime = new Date();


                    writeList("relay", profileNo, currentTime)



                    if (currentTime.getHours() % 2 != startTime.getHours() % 2 && profileCache.override != "1") {
                        //+ Switches on evasion mode if the number of hours elapsed from start is an even number
                        if (profileCache.status == "1") {
                            writeList("status", profileNo, "5")
                            profileCache = getProfile(profileNo)
                        }



                    } else if (profileCache.status == "5") {

                        writeList("status", profileNo, "1")
                        profileCache = getProfile(profileNo)
                    }
                    switch (profileCache.status) {
                        case "0":

                            //inactive
                            //Query status every 10s

                            sleep(10000).then(() => {
                                worker()
                                return false;
                            })
                            break;
                        case "1":
                            //+ Running in grinding mode. The bot will run commands on Dank Memer to earn currency.

                            if (currentTime.getMinutes() == startTime.getMinutes() - 100) {
                                //+ Runs these commands every hour.
                                MessageHandler(`pls work ${profileCache.job}`, channel, true).then(() => {


                                    sleep(5000).then(() => {


                                        MessageHandler("pls work", channel, true).then(() => {
                                            sleep(500).then(() => {
                                                channel.messages.fetch({
                                                    limit: 1
                                                }).then(basetext => {
                                                    channel.startTyping()
                                                    var response = minigameHandler(basetext.first().content, profileNo)
                                                    sleep(5000).then(() => {
                                                        MessageHandler(response, channel, true).then(() => {
                                                            sleep(20000).then(() => {
                                                                MessageHandler("pls daily", channel)

                                                                sleep(20000).then(() => {
                                                                    MessageHandler("pls buy life 2", channel)
                                                                    sleep(19000).then(() => {


                                                                        worker()
                                                                    })
                                                                })


                                                            })

                                                        })
                                                    })
                                                })

                                            })

                                        })
                                    })
                                })


                                //resume
                            } else {

                                try {


                                    //choose command
                                    function determiner() {
                                        //+ Generates a random sequence of commands for the bot to run on Dank Memer.
                                        if (profileCache.sequence.length != undefined) {
                                            return new Promise((resolve) => {
                                                if (profileCache.sequence.length == 0) {
                                                    //console.log(`Generating sequence for instance ${getProfile(profileNo).name}`)

                                                    generateSequence(Object.keys(commandList).length).then(function(arr) {

                                                        writeList("sequence", profileNo, arr)
                                                        profileCache = getProfile(profileNo)
                                                        //done
                                                        resolve("done");

                                                    })

                                                } else {
                                                    resolve("done")
                                                }

                                            })
                                        }
                                        return false;
                                    }
                                    determiner().then(function() {
                                        profileCache = getProfile(profileNo)

                                        //logic

                                        //Send the current command                                                             pass Dank Memer's response to a handler
                                        sleep(1000).then(function() {
                                            //console.log(profileCache.sequence)
                                            MessageHandler(commandList[`command${profileCache.sequence[0]}`].name, channel, true).then((sentMessage) => {
                                                sleep(500).then(() => {

                                                    var newMessage = channel.messages.cache.filter((param) => {
                                                        //+ Gets the latest message
                                                        if (param.reference != null) {

                                                            if (param.reference.messageID == sentMessage.id) {
                                                                res = 0;
                                                                return true
                                                            }
                                                        }
                                                    })
                                                    sleep(1000).then(() => {
                                                        var basetext = newMessage.last()
                                                        //+ Basetext is a message object that refers to the last message sent in the channel. This message normally comes from Dank Memer.
                                                        if (basetext != undefined) {


                                                            var str;
                                                            if (typeof basetext.content != "string" || basetext.content === "") {
                                                                str = " ";
                                                                //+ If the message has no text content (ie an embed) it places an empty string so subsequent functions dont break.
                                                            } else {
                                                                str = basetext.content;
                                                            }

                                                            //console.log(profileCache.sequence)

                                                            //console.log(commandList[`command${profileCache.sequence[0]}`])
                                                            commandList[`command${profileCache.sequence[0]}`].handler(str).then((response) => {
                                                                //+ Sends the appropriate response provided by the handler in commandList. If there is no subsequent action to take, the handler will resolve with "false"    
                                                                if (response != "false") {

                                                                    MessageHandler(response, channel)

                                                                }
                                                            });

                                                        } else {
                                                            res++;
                                                            if (res > 9) {
                                                                writeList("status", profileNo, "0")
                                                            }

                                                        }
                                                        //+Deletes the current task from the sequence of tasks left
                                                        profileCache.sequence.shift()
                                                    })

                                                })

                                                writeList("sequence", profileNo, profileCache.sequence)



                                                sleep(15000).then(() => {
                                                    worker()
                                                    //+ Recursive function
                                                    return false;
                                                })
                                            })
                                        })

                                    })
                                } catch (e) {
                                    managementData.relay = `Error in instance ${profileCache.name} encountered, keeping alive2`;
                                    console.log(colors.ERROR, `Error in instance ${profileCache.name} encountered, keeping alive`, colors.Reset)
                                    console.log(colors.ERROR, e, colors.Reset)
                                    worker()
                                    return false;
                                }
                            }

                            break;
                        case "2":
                            //+ If the bot is in this status code, its terminating.
                            managementData.relay = `Instance with name ${profileCache.name} stopping`;

                            clearTimeout(profileCache.timeout["timedWorker-work"])
                            clearTimeout(profileCache.timeout["timedWorker-daily"])



                            writeList("status", profileNo, "3")
                            sleep(2000).then(
                                () => {

                                    worker()
                                    return false;
                                }
                            )

                            break;
                        case "3":
                            //+ If the bot is in this state, its shutting down.
                            managementData.relay = `Instance with name ${profileCache.name} stopping`;
                            console.log(`Instance with name ${profileCache.name} stopping`)
                            clearTimeout(profileCache.timeout["timedWorker-work"])
                            clearTimeout(profileCache.timeout["timedWorker-daily"])
                            client.destroy()
                            console.log(`Terminated instance with name ${profileCache.name}`)
                            return false;

                            break;
                        case "4":
                            //+ Bot is in "copycat mode" where it repeats after the user. The code executed here is executed in the message event instead.
                            //This is merely an indicator that the bot is being controlled externally
                            sleep(3000).then(() => {
                                //query

                                worker()
                                return false;
                            })
                            break;
                        case "5":
                            //This is an indicator that the bot is idling due to alternation
                            sleep(3000).then(() => {
                                //query

                                worker()
                                return false;
                            })
                            break;
                        case "6":
                            //+ Transfer of items.
                            var count3 = 0;

                            function releaseItems() {

                                var currentTime = new Date();


                                writeList("relay", profileNo, currentTime)
                                //+ Spaghetti code. Yuck.
                                MessageHandler(`pls shop ${itemList[count3]}`, channel, true).then(() => {
                                    channel.messages.fetch({
                                        limit: 1
                                    }).then(rawMessage => {
                                        var fetchedMessage = rawMessage.first();
                                        if (fetchedMessage.hasOwnProperty("embeds") == true) {
                                            if (fetchedMessage.embeds.length == 1) {
                                                if (fetchedMessage.embeds[0].hasOwnProperty("title") == true) {
                                                    if (fetchedMessage.embeds[0].title != null) {
                                                        var title = fetchedMessage.embeds[0].title;
                                                        title = title.replace(",", '');
                                                        if (title.indexOf("(") == -1) {
                                                            channel.send("No quantity of items")
                                                            count3++;
                                                            if (count3 < itemList.length) {
                                                                sleep(6000).then(() => {
                                                                    releaseItems()
                                                                    return false;
                                                                })
                                                            } else {
                                                                writeList("status", profileNo, "1")
                                                                sleep(3000).then(() => {
                                                                    worker()
                                                                })
                                                                return false;
                                                            }
                                                        } else {
                                                            var quantity = title.substring(title.indexOf("(") + 1, title.indexOf("owned)") - 1)
                                                            sleep(3000).then(() => {
                                                                MessageHandler(`pls gift ${quantity} ${itemList[count3]} <@${currentID}>`, channel, true)
                                                                count3++;
                                                                if (count3 < itemList.length) {
                                                                    sleep(20000).then(() => {
                                                                        releaseItems()
                                                                        return false;
                                                                    })
                                                                } else {
                                                                    writeList("status", profileNo, "1")
                                                                    sleep(3000).then(() => {
                                                                        worker()
                                                                        return false;
                                                                    })

                                                                }
                                                            })
                                                        }
                                                        //+ This sucks and I swear I'll never write such hot garbage again
                                                    } else {

                                                        count3++;
                                                        if (count3 < itemList.length) {
                                                            sleep(3000).then(() => {
                                                                releaseItems()
                                                                return false;
                                                            })
                                                        } else {
                                                            writeList("status", profileNo, "1")
                                                            sleep(3000).then(() => {
                                                                worker()
                                                                return false;
                                                            })

                                                        }

                                                    }
                                                } else {
                                                    count3++;
                                                    if (count3 < itemList.length) {
                                                        sleep(3000).then(() => {
                                                            releaseItems()
                                                            return false;
                                                        })
                                                    } else {
                                                        writeList("status", profileNo, "1")
                                                        sleep(3000).then(() => {
                                                            worker()
                                                            return false;
                                                        })

                                                    }

                                                }
                                            } else {
                                                count3++;
                                                if (count3 < itemList.length) {
                                                    sleep(3000).then(() => {
                                                        releaseItems()
                                                        return false;
                                                    })
                                                } else {
                                                    writeList("status", profileNo, "1")
                                                    sleep(3000).then(() => {
                                                        worker()
                                                        return false;
                                                    })

                                                }
                                            }
                                        } else {
                                            count3++;
                                            if (count3 < itemList.length) {
                                                sleep(3000).then(() => {
                                                    releaseItems()
                                                    return false;
                                                })
                                            } else {
                                                writeList("status", profileNo, "1")
                                                sleep(3000).then(() => {
                                                    worker()
                                                    return false;
                                                })

                                            }
                                        }
                                    })
                                })

                            }
                            //+ Finally that was over. That was a pain to read.
                            var currentID;
                            if (profileNo != 1) {
                                currentID = tokenList.account1.id;
                                releaseItems()
                            } else {
                                currentID = "784315445926428682";

                                releaseItems()


                            }

                            break;
                        default:
                            //+ What happens if an invalid status code is passed to the bot.
                            console.log(colors.YELLOW, `Unknown status number passed to worker. Terminating.`, colors.Reset)
                            console.log(colors.USERDATA, `Debug log:`, getProfile(profileNo), colors.Reset)
                            writeList("status", profileNo, "2")
                            sleep(2000).then(
                                () => {
                                    worker()
                                    return false;
                                }
                            )

                    }
                    history = profileCache.status;

                } catch (e) {
                    managementData.relay = `Nonfatal error occured.\n Details: \n${e}`;
                    console.log(colors.ERROR, e, colors.Reset)
                    worker()
                }
            }
            worker()

            /*while(history != "3"){
                
                sleep(3000)
            }*/

        }
        /*
         */
        function writeList(field, profileNo, content, toggle) {
            //+ Writes data on the bot to the database.
            if (toggle == true) {
                return new Promise((resolve) => {
                    if (field == "channelID" || "status" || "sequence" || "timeout" || "manual" || "relay" || "edited") {
                        if (tokenList.hasOwnProperty(`account${profileNo}`)) {
                            tokenList[`account${profileNo}`][field] = content;
                            resolve("done")
                            return false;

                        } else {
                            console.log(colors.ERROR, `Account ${profileNo} does not exist. Error occured at writeList.`, colors.Reset)
                            resolve("Done")
                            return false;
                        }
                    } else {
                        console.log(colors.ERROR, `Invalid field with value ${field} passed to function writeList.`, colors.Reset)
                        resolve("Done")
                        return false;
                    }
                })
            } else {
                if (field == "channelID" || "status" || "sequence" || "timeout" || "client" || "relay" || "edited") {
                    if (tokenList.hasOwnProperty(`account${profileNo}`)) {
                        tokenList[`account${profileNo}`][field] = content;
                    } else {
                        console.log(colors.ERROR, `Account ${profileNo} does not exist. Error occured at writeList.`, colors.Reset)
                    }
                } else {
                    console.log(colors.ERROR, `Invalid field with value ${field} passed to function writeList.`, colors.Reset)
                }
            }


        };

        function getProfile(no, toggle) {
            //+ Gets updated data from the database. A shortcut function
            if (toggle == true) {
                return new Promise((resolve) => {
                    var currentProfile;
                    //currentProfile = JSON.parse(JSON.stringify(tokenList[`account${no}`]))
                    currentProfile = tokenList[`account${no}`]
                    resolve(currentProfile)
                    return currentProfile;
                })
            } else {
                var currentProfile;
                //currentProfile = JSON.parse(JSON.stringify(tokenList[`account${no}`]))
                currentProfile = tokenList[`account${no}`]
                return currentProfile;
            }

        }

        function getPosition(string, subString, index) {
            //+ Utility function
            return string.split(subString, index).join(subString).length;
        }

        function minigameHandler(basetext, profileNo) {
            var profileCache = getProfile(profileNo)
            //+ Database for all the possible job sentences
            if (profileCache.job == "housewife") {
                var wordDict = ["homemaker", "companion", "mom", "chores", "cleaning", "mommy", "dishes", "home", "stay", "abode", "coffee", "dwelling"]
                var sentenceDict = ["Working moms don't love their kids", "Haven't left the house in two weeks", "The chores never end", "The baby puked on the floor again", "My kids are my full time job", "Live laugh love is my motto", "This house is clean let's keep it that way", "Sugar daddy bought me a new vacuum", "I should get a new rug", "I do not work for an MLM it works for me", "Would you like to buy some essential oils", "I should join the neighborhood watch", "I wonder what my spouse is doing right now"]
            } else if (profileCache.job == "manager") {
                var wordDict = ["resources", "costs", "rich", "director", "quality", "metrics", "project", "revenue", "leader", "administrator", "office", "boss", "process", "manager", "money", "innovation", "planning", "authority"]
                var sentenceDict = ["Can I see your resume please", "My manager is a nice person", "Without managers, the world would be in chaos", "We are looking for skilled laborers", "Stop teasing the new hires", "Managers lead a team of people", "I had to hand in some work to make my manager happy", "This is for your performance review", "Managers never go on strike", "Management is not for everyone", "You will have to stay extra late tonight", "I will not pay for your overtime", "I make less than my hourly employees", "Corporate wants some changes around here", "I manage a large team of skilled workers", "I hate salary work"]
            } else if (profileCache.job == "babysitter") {
                var wordDict = ["house", "child", "helpful", "babysitter", "cleaning", "childcare", "bed", "allergies", "diaper", "baby", "nanny", "caregiver", "safety", "baths", "bedtime"]
                var sentenceDict = ["Can you guys just behave for once", "Go to your room please", "I lost the baby again sorry ", "I cant stand these kids", "I am not getting paid enough for this child", "What do you want to eat tonight", "I am your nanny, not nana", "I do not want to change more diapers", "I'm going to invite my boyfriend over"]
            } else {
                var wordDict = ["homemaker", "companion", "mom", "chores", "cleaning", "mommy", "dishes", "home", "stay", "abode", "coffee", "dwelling"]
                var sentenceDict = ["Working moms don't love their kids", "Haven't left the house in two weeks", "The chores never end", "The baby puked on the floor again", "My kids are my full time job", "Live laugh love is my motto", "This house is clean let's keep it that way", "Sugar daddy bought me a new vacuum", "I should get a new rug", "I do not work for an MLM it works for me", "Would you like to buy some essential oils", "I should join the neighborhood watch"]
            }


            /*
    hangman minigame sample: 
    "Hangman - Find the missing __word__ in the following sentence:\n`I was not the d _ _ _ _ _ in Game of Thrones`"
    "Soccer - Hit the ball into a goal where the goalkeeper is not at! To hit the ball, type **`left`, `right` or `middle`**\n:goal::goal::goal:\n       :levitate:\n\n       ⚽"
    Retype
    **Work for House Wife** - Memory - Memorize the words shown and type them in chat.
`d﻿w﻿e﻿l﻿l﻿i﻿n﻿g﻿                                                                                                                                                                                           
h﻿o﻿u﻿s﻿e﻿h﻿o﻿l﻿d﻿                                                                                                                                                                                          
d﻿i﻿s﻿h﻿e﻿s﻿                                                                                                                                                                                                
s﻿p﻿o﻿u﻿s﻿
    "Retype - Retype the following phrase below:\nType `D﻿r﻿a﻿g﻿o﻿n﻿s﻿ ﻿a﻿r﻿e﻿ ﻿N﻿O﻿T﻿ ﻿g﻿a﻿y﻿!﻿`""
    "Work for House Wife -Reverse - Repeat the word in reverse:\n`dragon`"
    "**Work for House Wife** - Hangman - Find the missing __word__ in the following sentence:\n`H _ _ _ _ _ left the house in two weeks`"
    "Unscramble the following words to gain points!\n:basketball: **7 / 7 points scored**\n**1 point** - `esscla`\n**2 points** - `tehet`\n**3 points** - `igthnk`
    <:orange:832407058245484554> `homemaker`\n<:red:832407058241945650> `companion`\n<:purple:832407058288476240> `mom`
    **Work for Santa Claus** - Color Match - Match the color to the selected word.\n<:green:832407058246402048> `saint`\n<:red:832407058241945650> `beard`\n<:orange:832407058245484554> `sleigh`
    */



            var start = basetext.indexOf(" -")
            var end = basetext.lastIndexOf(" -")
            var type = basetext.substring((start + 3), end).trim()
            type = type.toLowerCase()
            var selector = []
            //+ This code plays a minigame that Dank Memer issues every time you try to run the work command.

            switch (type) {

                case "color match":

                    //**Work for Santa Claus** - Color Match - Match the color to the selected word.\n<:green:832407058246402048> `saint`\n<:red:832407058241945650> `beard`\n<:orange:832407058245484554> `sleigh`
                    var content = basetext.substring(basetext.indexOf("\n") + 2)
                    content = content.replace(/[^\x00-\x7F]/g, "")
                    content = content.split("\n")

                    getProfile(profileNo, true).then((profileCache => {


                        var solution;


                        var errorCount = 0;
                        sleep(3000).then(() => {
                            function inner() {

                                if (profileCache.edited == undefined) {
                                    sleep(1000).then(function() {
                                        if (errorCount > 3) {
                                            inner()
                                            errorCount++;
                                        } else {
                                            resolve("No edited message detected, exiting")
                                            return false;
                                        }
                                    })

                                } else {
                                    var edited = profileCache.edited.content;
                                    console.log(edited)
                                    var newContent = edited.substring(edited.indexOf("`") + 1, edited.lastIndexOf("`"))

                                    newContent = newContent.replace(/[^\x00-\x7F]/g, "")

                                    var unfilSolution = content.find(function(arrContent) {
                                        if (arrContent.search(newContent) != -1) {
                                            return true;
                                        }
                                    })

                                    solution = unfilSolution.substring(unfilSolution.indexOf(":") + 1, unfilSolution.lastIndexOf(":"))

                                    var found = 0;
                                    if (profileCache.edited.components.length != 0) {
                                        for (var componentRowWrapper of profileCache.edited.components) {
                                            if (componentRowWrapper.hasOwnProperty("components")) {
                                                for (var componentList in componentRowWrapper.components) {
                                                    if (typeof componentList == "array") {
                                                        for (var component of componentList) {
                                                            //check for the emoji
                                                            if (component.label.toLowerCase() == solution) {
                                                                ButtonHandler(profileCache.edited, component.custom_id, profileNo, true)
                                                                    .then(() => {
                                                                        resolve("Success")
                                                                    })
                                                                    .catch((response) => {
                                                                        resolve(response)
                                                                    })

                                                                return false;
                                                            }
                                                        }
                                                    }
                                                }
                                            } else {
                                                resolve("No buttons detected")
                                                return "No buttons detected"
                                            }
                                        }
                                    } else {
                                        resolve("No buttons detected")
                                        return "No buttons detected"
                                    }

                                }
                            }

                            inner()
                        })

                    }))
                    break;
                case "soccer":
                    /* 
            :goal::goal::goal:
            :levitate:
            0
            :goal::goal::goal:
                :levitate:
                7
            :goal::goal::goal:
                        :levitate:
                        14
            "Soccer - Hit the ball into a goal where the goalkeeper is not at! To hit the ball, type **`left`, `right` or `middle`**\n:goal::goal::goal:\n:levitate:\n\n       :soccer:"
            "Soccer - Hit the ball into a goal where the goalkeeper is not at! To hit the ball, type **`left`, `right` or `middle`**\n:goal::goal::goal:\n       :levitate:\n\n       :soccer:"
            "Soccer - Hit the ball into a goal where the goalkeeper is not at! To hit the ball, type **`left`, `right` or `middle`**\n:goal::goal::goal:\n              :levitate:\n\n       :soccer:"
                
                    */
                    var content = basetext.substring(basetext.indexOf(":goal:\n") + 7, basetext.indexOf(":levitate:"))
                    //console.log("l" + content + "l")
                    var solution;
                    if (content == "") {
                        //goalkeeper is at left
                        solution = "middle";
                    } else if (content == "       ") {
                        //goalkeeper is at middle
                        solution = "right";
                    } else if (content == "              ") {
                        //goalkeeper is at right
                        solution = "left";
                    } else {
                        console.log(colors.ERROR, "Error in minigameHandler(): Soccer: Unidentified number of spaces")
                    }
                    var found = 0;
                    if (profileCache.edited.components.length != 0) {
                        for (var componentRowWrapper of profileCache.edited.components) {
                            if (componentRowWrapper.hasOwnProperty("components")) {
                                for (var componentList in componentRowWrapper.components) {
                                    if (typeof componentList == "array") {
                                        for (var component of componentList) {
                                            //check for the emoji
                                            if (component.label.toLowerCase() == solution) {
                                                ButtonHandler(profileCache.edited, component.custom_id, profileNo, true)
                                                    .then(() => {
                                                        resolve("Success")
                                                    })
                                                    .catch((response) => {
                                                        resolve(response)
                                                    })

                                                return false;
                                            }
                                        }
                                    }
                                }
                            } else {
                                resolve("No buttons detected")
                                return "No buttons detected"
                            }
                        }
                    } else {
                        resolve("No buttons detected")
                        return "No buttons detected"
                    }


                    break;
                case "emoji match":
                    var arr = basetext.split("\n")
                    var emoji = arr.slice(-1).pop();
                    emoji.trim()
                    var errorCount = 0;
                    sleep(3000).then(() => {
                        function inner() {

                            if (profileCache.edited == undefined) {
                                sleep(1000).then(function() {
                                    if (errorCount > 3) {
                                        inner()
                                        errorCount++;
                                    } else {
                                        resolve("No edited message detected, exiting")
                                        return false;
                                    }
                                })

                            } else {
                                var edited = profileCache.edited.content;
                                console.log(edited)

                                var found = 0;
                                if (profileCache.edited.components.length != 0) {
                                    for (var componentRowWrapper of profileCache.edited.components) {
                                        if (componentRowWrapper.hasOwnProperty("components")) {
                                            for (var componentList in componentRowWrapper.components) {
                                                if (typeof componentList == "array") {
                                                    for (var component of componentList) {
                                                        //check for the emoji
                                                        if (component.label == emoji) {
                                                            ButtonHandler(profileCache.edited, component.custom_id, profileNo, true)
                                                                .then(() => {
                                                                    resolve("Success")
                                                                })
                                                                .catch((response) => {
                                                                    resolve(response)
                                                                })

                                                            return false;
                                                        }
                                                    }
                                                }
                                            }
                                        } else {
                                            resolve("No buttons detected")
                                            return "No buttons detected"
                                        }
                                    }
                                } else {
                                    resolve("No buttons detected")
                                    return "No buttons detected"
                                }

                            }
                        }
                        inner()
                    })


                    break;
                case "repeat order":
                    //todo: finish this, finish animal minigames, add new commands
                    break;

                default:

                    resolve("invalid type passed to minigamehandler")
                    return false;

            }


        }


        //edited = ["<@833162798447067187> What color was next to the word `mommy`?"]


        //console.log(commandList.command4.handler("@Cxffee ahhhhh the fish is too strong and your line is at risk to break! quick, type the phrase below in the next 10 seconds \nType `B﻿i﻿g﻿ ﻿b﻿a﻿i﻿t﻿ ﻿c﻿a﻿t﻿c﻿h﻿e﻿s﻿ ﻿b﻿i﻿g﻿ ﻿f﻿i﻿s﻿h﻿`"))
        main()
        //workerHandler(1)
        discordInterface()
        //console.log(generateSequence(6))

        var manual;

        function discordInterface() {
            //+ discordInterface launches the management bot.
            var client = new Discord.Client({
                partials: ['MESSAGE', 'CHANNEL', 'REACTION']
            })
            //+ Database of cringe videos to troll friends with.
            var cringeVideos = ["https://www.youtube.com/watch?v=neeLJy7J0mQ", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"]

            client.login(env.MANAGEMENT)
            eventEmitter.on("relayUpdate", function() {
                var input = managementDataset.relay;


                var serverTerminal = client.channels.cache.get("869168164188065822")
                //+ This is the channel where all the logs get sent to.
                sleep(500).then(() => {



                    var updateEmbed = new Discord.MessageEmbed();
                    updateEmbed.setTitle("Bot Update")
                    updateEmbed.setDescription(input)
                    var color = "#06CBF3";
                    updateEmbed.setColor(color)
                    updateEmbed.setTimestamp();
                    serverTerminal.send(updateEmbed)



                })


            })
            client.on("ready", () => {
                console.log("Management has logged in")

            })
            client.on('messageReactionAdd', (reaction, user) => {
                //+ Additional functionality for sending a response to a user anytime they react with an emoji to a certain message. You can skip this part.
                if (reaction.partial) {
                    // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
                    try {
                        reaction.fetch();
                    } catch (error) {
                        console.log(colors.ERROR, 'Something went wrong when fetching the message:\n', error, colors.Reset);
                        // Return as `reaction.message.author` may be undefined/null
                        return;
                    }
                }

                if (reaction.message.id === "800206358422487040") {

                    try {
                        user.send(cringeVideos[Math.floor(Math.random() * cringeVideos.length)])
                    } catch (e) {

                    }
                    return;
                } else if (reaction.message.id === "889822489876758578") {
                    console.log(reaction)

                    function detect(x) {
                        if (x == user.id) {
                            return true;
                        }
                    }
                    if (allowedUsers.find(detect) != undefined) {
                        try {

                            reaction.message.guild.roles.fetch('882607060796182568').then((role) => {

                                    reaction.message.guild.members.fetch(user.id).then((guildUser) => {
                                            guildUser.roles.add(role)
                                        })
                                        .catch((e) => {
                                            console.log(e)
                                        })
                                    //.roles.add(role);
                                })
                                .catch((e) => {
                                    console.log(e)
                                })


                        } catch (e) {
                            console.log(e)
                        }
                        return;
                    } else {
                        try {
                            user.send(cringeVideos[Math.floor(Math.random() * cringeVideos.length)])
                            reaction.message.guild.members.fetch(user.id).then((guildUser) => {
                                    guildUser.ban({
                                        reason: ''
                                    })
                                })
                                .catch((e) => {
                                    console.log(e)
                                })
                        } catch (e) {

                        }
                        return;
                    }

                }

            });

            client.on("message", (message) => {
                //+ RUns whenever a message is receivec.
                var allParams = message.content.split(" ");
                var content = message.content.toLowerCase()

                var args = allParams[1];
                var count = 1;
                var result = "";
                switch (message.author.id) {
                    case "270904126974590976":
                        //+ Detects if a message comes from Dank Memer. This functionality is no longer used.
                        try {
                            if (Number(message.channel.name) < tokenList.length) {
                                var profileNo = Number(message.channel.name)
                                writeList(relay, profileNo, message)
                            }
                        } catch (e) {
                            console.log(colors.ERROR, e, colors.Reset)
                        }
                        break;

                    default:
                        function detect(x) {
                            if (x == message.author.id) {
                                return true;
                            }
                        }
                        //+ Searches if the user is in the database of user ids that are allowed to control the bot.
                        if (cachedUsers.find(detect) != undefined) {

                            switch (allParams[0].toLowerCase()) {
                                //+ All the possible commands
                                case "authorise":
                                case "authorize":
                                case "allow":
                                    cachedUsers.push(allParams[1])
                                    message.reply("User has been cached.")
                                    break;
                                case "remove":
                                    if (cachedUsers.indexOf(allParams[1]) == -1) {
                                        message.reply("User is not cached.")
                                    } else {
                                        if (allParams[1] != "784315445926428682") {


                                            cachedUsers.splice(cachedUsers.indexOf(allParams[1]), 1)
                                            message.reply("User has been removed from cache")
                                        } else {
                                            message.reply("Removed **YOU** from the cache")
                                            cachedUsers.splice(cachedUsers.indexOf(message.author.id), 1)
                                        }
                                    }
                                    break;
                                case "visitation":
                                case "visit":
                                case "allowvisit":
                                    allowedUsers.push(allParams[1])
                                    message.reply("User has been cached.")
                                    break;

                                case "removevisit":
                                    if (allowedUsers.indexOf(allParams[1]) == -1) {
                                        message.reply("User is not cached.")
                                    } else {
                                        if (allParams[1] != "784315445926428682") {


                                            allowedUsers.splice(cachedUsers.indexOf(allParams[1]), 1)
                                            message.reply("User has been removed from cache")
                                        } else {
                                            message.reply("Removed **YOU** from the cache, you sussy baka")
                                            allowedUsers.splice(cachedUsers.indexOf(message.author.id), 1)
                                        }
                                    }
                                    break;
                                case "restart":
                                    switch (args) {
                                        case "all":
                                            var count1 = 1;
                                            message.reply("Restarting all users.")
                                            while (count1 <= Object.keys(tokenList).length) {
                                                if (getProfile(count1).status == "1") {
                                                    //currently running program
                                                    writeList("status", count1, "2")
                                                    message.reply(`Currently running instance "${getProfile(count1).name}" has been given a terminate code of 2.`)
                                                }




                                                count1++;
                                            }
                                            sleep(10000).then(() => {



                                                main()
                                                message.reply("All users have been restarted.")
                                            })

                                        default:
                                            if (Number(args) <= Object.keys(tokenList).length) {
                                                if (getProfile(parseInt(args)).status == "1") {
                                                    //currently running program
                                                    writeList("status", parseInt(args), "2")
                                                    message.reply(`Currently running instance "${getProfile(parseInt(args)).name}" has been given a terminate code of 2.`)
                                                }
                                                sleep(10000).then(() => {
                                                    (function() {
                                                        workerHandler(parseInt(args))
                                                    }())
                                                    message.reply(`User "${getProfile(parseInt(args)).name}" has been restarted.`)
                                                })
                                            } else {
                                                message.reply("No record of that user was found")
                                            }

                                            break;


                                    }
                                    break;
                                case "query":
                                    while (count <= Object.keys(tokenList).length) {
                                        var profileCache = getProfile(count);
                                        var hanged;
                                        var currentTime = new Date();
                                        if (profileCache.relay != "") {

                                            if (profileCache.relay.getHours() == currentTime.getHours()) {
                                                //Is the worker supposed to be running?
                                                if (profileCache.status != "3") {
                                                    if (profileCache.relay.getMinutes() + 2 < currentTime.getMinutes()) {
                                                        //Crash or hang detected
                                                        hanged = "Hanged"
                                                    } else {
                                                        hanged = "Running";
                                                    }
                                                }
                                            } else {
                                                //wait for next check to be done
                                                hanged = "Unable to determine";
                                            }
                                        } else {
                                            hanged = "Error"
                                        }
                                        var string = `\n**Instance "${profileCache.name}**":\nStatus: *${profileCache.status}*\nOverride: *${profileCache.override}*\nOperations: ${hanged}`
                                        result = result + string;
                                        count++;
                                    }
                                    message.reply(result)
                                    break;
                                case "resume":
                                    switch (args) {
                                        case "all":
                                            var count1 = 1;
                                            while (count1 <= Object.keys(tokenList).length) {
                                                writeList("status", count1, "1")
                                                count1++;
                                            }
                                            message.reply("All users are resuming.")
                                            break;
                                        default:
                                            if (Number(args) <= Object.keys(tokenList).length) {
                                                writeList("status", parseInt(args), "1")
                                                message.reply(`User "${getProfile(parseInt(args)).name}" is resuming.`)
                                            } else {
                                                message.reply("No record of that user was found")
                                            }
                                    }
                                    break;

                                case "stop":
                                case "pause":
                                    switch (args) {
                                        case "all":
                                            var count1 = 1;
                                            while (count1 <= Object.keys(tokenList).length) {
                                                writeList("status", count1, "0")
                                                count1++;
                                            }
                                            message.reply("All users are pausing.")
                                            break;
                                        default:
                                            if (Number(args) <= Object.keys(tokenList).length) {
                                                writeList("status", parseInt(args), "0")
                                                message.reply(`User "${getProfile(parseInt(args)).name}" has been paused.`)
                                            } else {
                                                message.reply("No record of that user was found")
                                            }



                                    }
                                    break;

                                case "kill":
                                case "terminate":
                                    switch (args) {
                                        case "all":
                                            var count1 = 1;
                                            while (count1 <= Object.keys(tokenList).length) {
                                                writeList("status", count1, "3")
                                                count1++;
                                            }
                                            message.reply("All users are terminating.")
                                            break;
                                        default:
                                            if (Number(args) <= Object.keys(tokenList).length) {
                                                writeList("status", parseInt(args), "3")
                                                message.reply(`User "${getProfile(parseInt(args)).name}" is terminating.`)
                                            } else {
                                                message.reply("No record of that user was found")
                                            }

                                    }
                                    break;
                                case "o!mode":
                                    switch (args) {
                                        case "all":
                                            var count1 = 1;
                                            while (count1 <= Object.keys(tokenList).length) {
                                                if (getProfile(count1).status == "4") {
                                                    writeList("status", count1, "1")
                                                } else {
                                                    writeList("status", count1, "4")
                                                }
                                                count1++;
                                            }
                                            message.reply("All users are toggling copycat mode.")
                                            break;
                                        default:
                                            if (Number(args) <= Object.keys(tokenList).length) {
                                                if (getProfile(Number(args)).status == "4") {
                                                    writeList("status", parseInt(args), "1")
                                                } else {
                                                    writeList("status", parseInt(args), "4")
                                                }

                                                message.reply(`User "${getProfile(parseInt(args)).name}" is toggling copycat mode.`)
                                            } else {
                                                message.reply("No record of that user was found")
                                            }

                                    }

                                    break;
                                case "transfer":
                                    switch (args) {
                                        case "all":
                                            var count1 = 2;
                                            while (count1 <= Object.keys(tokenList).length) {
                                                writeList("status", count1, "6")
                                                count1++;
                                            }
                                            message.reply("All users are switching transfer mode.")
                                            break;
                                        default:
                                            if (Number(args) <= Object.keys(tokenList).length) {
                                                writeList("status", parseInt(args), "6")

                                                message.reply(`User "${getProfile(parseInt(args)).name}" is switching to transfer mode.`)
                                            } else {
                                                message.reply("No record of that user was found")
                                            }

                                    }

                                    break;
                                case "override":
                                    switch (args) {
                                        case "all":
                                            var count1 = 1;
                                            while (count1 <= Object.keys(tokenList).length) {
                                                var profileCache = getProfile(count1)
                                                if (profileCache.override == "1") {
                                                    writeList("override", count1, "0")
                                                } else {
                                                    writeList("override", count1, "1")
                                                }
                                                count1++;
                                            }
                                            message.reply("Hour alternation for all users has been toggled")
                                            break;
                                        default:
                                            if (Number(args) <= Object.keys(tokenList).length) {
                                                var profileCache = getProfile(Number(args))
                                                if (profileCache.override == "1") {
                                                    writeList("override", Number(args), "0")
                                                } else {
                                                    writeList("override", Number(args), "1")
                                                }
                                                message.reply(`Hour alternation for user "${getProfile(parseInt(args)).name}" has been toggled.`)
                                            } else {
                                                message.reply("No record of that user was found")
                                            }

                                    }
                                    break;
                                case "help":
                                    var embed = new Discord.MessageEmbed()
                                        .setColor('#f4fc03')
                                        .setTitle('Help guide')


                                        .setDescription('This is a help guide for using this bot to control the alt army.\nAll commands do not have a prefix, and should be typed as they are.')
                                        .setImage('https://external-preview.redd.it/40jtlPvggXrDXPHTPvec66ksR7hKnWIOYGg_4_FAf_k.gif?format=mp4&amp;s=1011a86ba32ee69c8ea9cb51bc9391206728648d')
                                        .addFields(

                                            {
                                                name: 'Allow',
                                                value: 'Allow a user to control this bot. \n\n**Syntax**\n *allow (userid)*\n **Aliases:**\n*authorise*\n*authorize*',
                                                inline: true
                                            }, {
                                                name: 'Remove',
                                                value: `Remove a user's ability to control this bot. \n\n**Syntax**\n *remove (userid)*\n **Aliases:**\n*authorise*\n*authorize*`,
                                                inline: true
                                            }, {
                                                name: 'Restart',
                                                value: 'Log out an account, then log it back in. \n**Syntax**\n *restart (number)/ restart all*\n ',
                                                inline: true
                                            }, {
                                                name: 'Resume',
                                                value: 'Unpause a bot. \n\n**Syntax**\n *resume (number)/ resume all*\n ',
                                                inline: true
                                            }, {
                                                name: 'Pause',
                                                value: 'Pause a bot from running. \n\n**Syntax**\n *pause (number)/ pause all*\n **Aliases:**\n*stop*',
                                                inline: true
                                            }, {
                                                name: 'Terminate',
                                                value: 'Totally stops a bot. Only can be undone by restarting. \n**Syntax**\n *terminate (number)/ terminate all*\n **Aliases:**\n*kill*',
                                                inline: true
                                            }, {
                                                name: 'Mode',
                                                value: 'Switches on copycat mode for a bot. \n\n**Syntax**\n *mode (number)/ mode all*',
                                                inline: true
                                            }, {
                                                name: 'Override',
                                                value: 'Overrides hour alternation for a bot.. \n\n**Syntax**\n *override (number)/ override all*',
                                                inline: true
                                            }, {
                                                name: "Forcestart",
                                                value: "Force creates a similar instance regardless of whether the previous one was running or not. \n\n**Syntax**\nforcestart (number)/forcestart all\n***Warning***\nThis command should only be used if you know your stuff",
                                                inline: true
                                            }, {
                                                name: "Forcestop",
                                                value: "Force logs out the instance regardless of what it was doing. \n\n**Syntax**\nforcestop (number)/forcestop all\n***Warning***\nThis command should only be used if you know your stuff",
                                                inline: true
                                            }, {
                                                name: 'Query',
                                                value: 'Gets status code of a bot. \n\n**Guide** \n0 = paused, logged in. \n1 = running\n2 = Logging out\n3 = Fully stopped\n4 = Copycat mode on.\n5 = Hour Alternation on. (paused)\n**Syntax**\n *query*',
                                                inline: true
                                            }, {
                                                name: 'Allowvisit',
                                                value: 'Allows a visit to the bot farm. n**Syntax**\n *allowvisit (id of user)*',
                                                inline: true
                                            }, {
                                                name: 'Removevisit',
                                                value: 'Denies a visit to the bot farm. n**Syntax**\n *removevisit (id of user)*',
                                                inline: true
                                            },
                                        )

                                        .setTimestamp()

                                    message.channel.send(embed)
                                    break;
                                case "test":
                                    message.channel.send(args)
                                    break;
                                case "forcestart":

                                    switch (args) {
                                        case "all":
                                            main()
                                            message.reply("All users have been forcestarted.")
                                            break;
                                        default:
                                            if (Number(args) <= Object.keys(tokenList).length) {
                                                workerHandler(Number(args))
                                                message.reply(`User "${getProfile(parseInt(args)).name}" has been forcestarted.`)
                                            } else {
                                                message.reply("No record of that user was found")
                                            }

                                    }
                                    break;
                                case "forcequit":
                                case "forcestop":
                                    switch (args) {
                                        case "all":
                                            var count1 = 1;
                                            while (count1 <= Object.keys(tokenList).length) {
                                                var profileCache = getProfile(count1)
                                                tokenList[`account${count1}`].client.destroy()
                                                count1++;
                                            }
                                            message.reply("All users have been forcelogged out.")
                                            break;
                                        default:
                                            if (Number(args) <= Object.keys(tokenList).length) {
                                                tokenList[`account${Number(args)}`].client.destroy()
                                                message.reply(`User "${getProfile(parseInt(args)).name}" has been forcelogged out.`)
                                            } else {
                                                message.reply("No record of that user was found")
                                            }

                                    }
                                    break;
                                case "check":
                                case "hangcheck":
                                    switch (args) {
                                        case "all":
                                            var count1 = 1;
                                            while (count1 <= Object.keys(tokenList).length) {
                                                keepAlive(count1)
                                                count1++;
                                            }
                                            message.reply("All users have been checked for hangs. Results are in <#869168164188065822>.")
                                            break;
                                        default:
                                            if (Number(args) <= Object.keys(tokenList).length) {
                                                keepAlive(Number(args))
                                                message.reply(`User "${getProfile(parseInt(args)).name}" has been checked for hangs. Results are in <#869168164188065822>.`)
                                            } else {
                                                message.reply("No record of that user was found")
                                            }

                                    }
                                    break;
                                case "eval":
                                    var code = message.content.substring("4")
                                    //+ This functionality is only given to trusted users and wasnt exposed to general public.
                                    eval(code)
                                    break;
                                default:

                                    break;

                            }
                        }
                }
            })
        }
        /*rl = readline.createInterface(process.stdin, process.stdout);
        rl.on('line', function (input) {
            console.log(`Received: ${input}`);
            var content = input.toLowerCase()
            var allParams = content.split(" ");
            var args = allParams[1];
            var count = 1;
            var result = "";
            switch(allParams[0]){
                
                case "restart":
                    switch(args){
                        case "all":
                            var count1 = 1;
                            console.log(colors.YELLOW, "Restarting all users.", colors.Reset)
                            while(count1 <= Object.keys(tokenList).length){
                                if(getProfile(count1).status == "1"){
                                    //currently running program
                                    writeList("status", count1, "2")
                                    console.log(colors.YELLOW, `Currently running instance "${getProfile(count1).name}" has been given a terminate code of 2.`, colors.Reset)
                                } 
                                
                                
                                
                                
                                count1++;
                            }
                            sleep(10000).then(() => {

                          
                            while(count1 <= Object.keys(tokenList).length){
                                
                                    //currently running program
                                    writeList("status", count1, "0")
                                    console.log(colors.SYSTEM, `Currently terminated instance "${getProfile(count1).name}" has been given an initialised code of 0.`, colors.Reset)
                                }
                            main()
                            console.log("All users have been restarted.")
                        })
                            break;
                        case "1":
                        case "2":
                        case "3":
                        case "4":
                        case "5":
                        case "6":
                        case "7":
                            if(getProfile(parseInt(args)).status == "1"){
                                //currently running program
                                writeList("status", parseInt(args), "2")
                                console.log(colors.YELLOW, `Currently running instance "${getProfile(parseInt(args)).name}" has been given a terminate code of 2.`, colors.Reset)
                            } 
                            (function (){
                                workerHandler(parseInt(args))
                            }())
                            console.log(`User "${getProfile(parseInt(args)).name}" has been restarted.`)
                            break;
                        default:
                            console.log("No record of that user was found")
                    }
                    break;
                    case "query":
                while(count <= Object.keys(tokenList).length){
                   var cachedProfile = getProfile(count);
                   var string = `\nInstance "${cachedProfile.name}": ${cachedProfile.status}`
                   result = result + string;
                   count++;
                }
                console.log(colors.USERDATA, result, colors.Reset)
                    break;
                case "resume":
                    switch(args){
                        case "all":
                            var count1 = 1;
                            while(count1 <= Object.keys(tokenList).length){
                                writeList("status", count1, "1")
                                count1++;
                            }
                            console.log("All users are resuming.")
                            break;
                        case "1":
                        case "2":
                        case "3":
                        case "4":
                        case "5":
                        case "6":
                        case "7":
                            writeList("status", parseInt(args), "1")
                            console.log(`User "${getProfile(parseInt(args)).name}" is resuming.`)
                            break;
                        default:
                            console.log("No record of that user was found")
                    }
                    break;
                    break;
                case "stop":
                case "pause":
                    switch(args){
                        case "all":
                            var count1 = 1;
                            while(count1 <= Object.keys(tokenList).length){
                                writeList("status", count1, "0")
                                count1++;
                            }
                            console.log("All users are pausing.")
                            break;
                        case "1":
                        case "2":
                        case "3":
                        case "4":
                        case "5":
                        case "6":
                        case "7":
                            writeList("status", parseInt(args), "0")
                            console.log(`User "${getProfile(parseInt(args)).name}" has been paused.`)
                            break;
                        default:
                            console.log("No record of that user was found")
                    }
                    break;
                case "logout":
                    switch(args){
                        case "all":
                            var count1 = 1;
                            while(count1 <= Object.keys(tokenList).length){
                                writeList("status", count1, "2")
                                count1++;
                            }
                            console.log("All users are logging out.")
                            break;
                        case "1":
                        case "2":
                        case "3":
                        case "4":
                        case "5":
                        case "6":
                        case "7":
                            writeList("status", parseInt(args), "3")
                            console.log(`User "${getProfile(parseInt(args)).name}" is logging out.`)
                            break;
                        default:
                            console.log("No record of that user was found")
                    }
                    break;

                case "kill":
                case "terminate":
                    switch(args){
                        case "all":
                            var count1 = 1;
                            while(count1 <= Object.keys(tokenList).length){
                                writeList("status", count1, "3")
                                count1++;
                            }
                            console.log("All users are terminating.")
                            break;
                        case "1":
                        case "2":
                        case "3":
                        case "4":
                        case "5":
                        case "6":
                        case "7":
                            writeList("status", parseInt(args), "3")
                            console.log(`User "${getProfile(parseInt(args)).name}" is terminating.`)
                            break;
                        default:
                            console.log("No record of that user was found")
                    }
                    break;
                case "transfer":
                    writeList("status", parseInt(args), "4")
                    break;
                default:
                    console.log("Command of that name does not exist.")
            }
            });
            */
    }
})
/*
                -----------------------------------------------
                          RETIRED MINIGAMES
                          --------------------------------
                case "reverse":
                    // start from the front, get second position letter and place it in front of the first letter
                    var content = basetext.substring(basetext.indexOf("`") + 1, basetext.lastIndexOf("`"))
                    
                    content = content.replace(/[^\x00-\x7F]/g,"")
                    var count = 1;
                    while(count < content.length){
                        var transplantLetter = content.substring(count, count + 1)
                        content = content.substring(0, count) + content.substring(count + 1)
                        var content= transplantLetter + content;
                        count++;
                    } 
                    resolve(content)
                    return content;
                break;
                case "retype":
                    
                    var content = basetext.substring(basetext.indexOf("`") + 1, basetext.lastIndexOf("`"))
                    
                    content = content.replace(/[^\x00-\x7F]/g,"")
                    resolve(content)
                    return content;
                break;
                case "memory":
                    
                    var memoryWords = basetext.replace(/`/g, "")
                    memoryWords = memoryWords.split("\n")
                    memoryWords.shift()
                    var count2 = 1;
                    var output = "";
                    while(count2 < memoryWords.length){
                        output = output + memoryWords[count2] + " ";
                        count2++;
                    }
                    
                        resolve(output)
                        return output;
                    
                        
                    
                    
                break;
              case "hangman":
                console.log("Hangman")
              //  console.log("guessing")
            var content = basetext.substring(basetext.indexOf("`") + 1, basetext.lastIndexOf("`")) + " ";
            
            content = content.replace(/[^\x00-\x7F]/g,"")
            //console.log(content)
            var guess = content.substring((content.indexOf("_") - 2), content.lastIndexOf("_") + 1)
            //console.log(guess)
            //remove guessword from string or itll mess up split()
            //insert placeholder 
            content = content.substring(0, content.lastIndexOf("_") + 2) + "^" + content.substring(content.lastIndexOf("_") + 1);
            //console.log("inserted placeholder")
            //console.log(content)
            //removing guessword
            content = content.substring(0, (content.indexOf("_") - 2)) + content.substring((content.lastIndexOf("_") + 2))
            
            content = content.trim()
            //console.log("content with placeholder pre-split")
            //console.log(content)
            content = content.split(" ");
            
            //console.log("content with placeholder after split")
            //console.log(content)
            content.splice(content.indexOf("^"), 1, guess)
            //console.log("Reinserting guessword")
            //console.log(content)
                
                
                var count = 0;
                var matchedIndex;
                var solution;
                
                while(count < sentenceDict.length){
                    var matches = 0;
                    
                    var currSent = sentenceDict[count].split(" ");
                    
                    //sentence iteration loop
                    
                    if(content.length == currSent.length){
                        //length match
                        var count1 = 0;
                        //word iteration loop
                        while(count1 < currSent.length){
                            //see how many matches (identical words) we get
                            if(content[count1].includes("_")){
                                matchedIndex = count1;
                                solution = currSent[count1];
                                
                                
                                
                            } else {
                            if(content[count1].toLowerCase() == currSent[count1].toLowerCase()){
                                //We got a match
                                
                                matches++;
                            }
                            
                        }
                            count1++;


                        }//word iteration loop
                        
                    }
                    if(matches > 2){
                        //Identified correct sentence
                        //console.log(solution)
                        resolve(solution)
                        return solution;
                        break;
                    }
                    count++;  
                }
                break;
                case "scramble":
                    var content = basetext.substring(basetext.indexOf("`") + 1, basetext.lastIndexOf("`"))
                  //  console.log(content)
                    content = content.replace(/[^\x00-\x7F]/g,"")
                    var count = 0;
                var matchedIndex;
                var solution;
                content = content.split("")
                while(count < wordDict.length){
                    var matches = 0;
                    
                    var currSent = wordDict[count].split("");
                    
                    //word iteration loop
                    
                    if(content.length == currSent.length){
                        //length match
                        var count1 = 0;
                        //character iteration loop
                        while(count1 < currSent.length){
                            //see how many matches (identical letters) we get
                            
                            if(currSent.find(function(element, index){
                                if(element == content[count1]){

                                    return true;
                                }
                            })){
                                //We got a match
                                
                                matches++;
                                
                            }
                            
                        
                            count1++;


                        }//word iteration loop
                        
                    }
                    if(matches >= content.length - 1){
                        //Identified correct sentence
                        resolve(wordDict[count])
                        return wordDict[count];
                        break;
                    }
                    count++;  
                }

                break;
                */
