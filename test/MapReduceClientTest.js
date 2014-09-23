var fs = require('fs');
var util                = require("swarmutil");
var assert              = require('assert');

var INPUT_FILE="input_mapreduce.txt";

var adapterPort         = 3000;
var adapterHost         = "localhost";

swarmSettings.authentificationMethod = "testCtor";
globalVerbosity = false;

fs.readFile(INPUT_FILE, 'utf8', function(err,fileContent) {
	if (err) {
		return console.log(err);
	}

	var client = util.createClient(adapterHost, adapterPort, "UserForStartSwarmTest", "ok","BalancerTest");

	client.startSwarm("MapReduceSwarm.js","doWork",fileContent);

	client.on("MapReduceSwarm.js",getGreetings);
})

function getGreetings(obj){
    cprint("Work finished in " + obj.selectedWorker);
}

setTimeout (
    function() {
        process.exit(1);
    },
    3000
);