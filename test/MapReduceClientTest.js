var fs = require('fs');

var INPUT_FILE="input_mapreduce.txt";

var adapterPort         = 3000;
var adapterHost         = "localhost";
var util                = require("swarmutil");
var assert              = require('assert');


fs.readFile(INPUT_FILE, 'utf8', function(err,fileContent) {
	if (err) {
		return console.log(err);
	}

	swarmSettings.authentificationMethod = "testCtor";
	var client = util.createClient(adapterHost, adapterPort, "UserForStartSwarmTest", "ok","BalancerTest");

	client.startSwarm("MapReduceSwarm.js","doWork",fileContent);

	client.on("MapReduceSwarm.js",getGreetings);
})

var msg = "none";

function getGreetings(obj){
    msg = obj.result;
    cprint("Work finished in " + obj.selectedWorker);
}

setTimeout (
    function(){
        assert.equal(msg,"succes");
        process.exit(1);
    },
    3000);
