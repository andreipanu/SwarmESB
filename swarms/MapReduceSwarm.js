/**
 *
 *  
 *
 */
var mapReduceSwarm =
{
    vars:{
        documentContent:"",
        dividedInput:null,
        mapWorkers:null,
        reduceWorkers:null,
        mapPhaseOutputList:null,
        debug:"false"
    },
    doWork:function(documentContent) {
        this.documentContent = documentContent;
        this.dividedInput = [];
        this.mapWorkers = [];
        this.reduceWorkers = [];
        this.mapPhaseOutputList = [];
        this.swarm("splitInput");
    },
    splitInput:{
        node:"ClientAdapter",
        code:function() { 
            /* create an array of objects; each object contains a single key/value pair */
            var arrayOfSentences = this.documentContent.split(".");
            for (var i = 0; i < arrayOfSentences.length; i++) {
                var slice = {};
                slice[arrayOfSentences[i].trim().toLowerCase()] = 1;
                this.dividedInput.push(slice);
            }
            console.log(">>>>> splitted input in key/value pairs (it is prepared for map phase)");
            this.documentContent = null; // we don't need to carry on the original input data
            this.swarm("getWorkerNodes");
        }
    },
    getWorkerNodes:{
        node:"Balancer",
        code:function() {
            this.mapWorkers = getAllMapWorkers();
            this.reduceWorkers = getAllReduceWorkers();
            this.swarm("executeMapPhase");
        }
    },
    executeMapPhase:{
        node:"ClientAdapter",
        code:function() {
            //
            // create a swarm for each job and send it to a specific worker
            // 
            // 
            var sutil = require('swarmutil');
            var adapterPort         = 3000;
            var adapterHost         = "localhost";
            swarmSettings.authentificationMethod = "testCtor";
            globalVerbosity = false;
            var noOfReceivedResults = 0;
            var noOfSentJobs = 0;
            var mapPhaseOutput = [];

            var j = 0;
            for (var i = 0; i < this.dividedInput.length; i++) {
                var job = { input: {}, workerName: "" };
                job.input = this.dividedInput[i];
                job.workerName = this.mapWorkers[j];
                sendMapSwarm(job);
                noOfSentJobs++;
                if (j == this.mapWorkers.length - 1) {
                    j = 0;
                } else {
                    j++;
                }
            }
            
            function sendMapSwarm(job) {
                var client = sutil.createClient(adapterHost, adapterPort, "UserForStartSwarmTest", "ok","BalancerTest");
                client.startSwarm("MapWorkerSwarm.js", "doWork", job);
                client.on("MapWorkerSwarm.js", getMapResults);
                console.log(">>>>> sent to worker: " + job.workerName + " the input: " + Object.keys(job.input));
            }

            function getMapResults(results){
                //console.log(">>>>> received the following results" + results.wordAppearancesArray);
                mapPhaseOutput = mapPhaseOutput.concat(results.wordAppearancesArray);
                noOfReceivedResults++;
                if (noOfReceivedResults == noOfSentJobs) { // we have received the results from all map workers
                    console.log(">>>>> map phase finished; we have received " + mapPhaseOutput.length + " objects");
                    startReducePhase(mapPhaseOutput);
                }
            }

            function startReducePhase(output) {
                this.mapPhaseOutputList = output;
                //this.swarm("executeReducePhase");
            }
        }
    },
    executeReducePhase:{
        node:"ClientAdapter",
        code:function() {

            var sutil = require('swarmutil');
            var adapterPort         = 3000;
            var adapterHost         = "localhost";
            swarmSettings.authentificationMethod = "testCtor";
            globalVerbosity = false;

            var uniqueKeysArray = buildUniqueKeysArray();
            
            function buildUniqueKeysArray() {
                var keys = [];
                for (var i = 0; i < this.mapPhaseOutputList.length; i++) {
                    var key = Object.keys(mapPhaseOutputList[i])[0];
                    if (!keys.contains(key)) {
                        keys.push(key);
                    }
                }
                console.log(">>>>> we have identified " + keys.length + " unique keys");
            }
        }
    }    
};

mapReduceSwarm;
