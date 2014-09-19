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
        debug:"false"
    },
    doWork:function(documentContent) {
        this.documentContent = documentContent;
        this.dividedInput = [];
        this.mapWorkers = [];
        this.reduceWorkers = [];
        this.swarm("splitInput");
    },
    splitInput:{
        node:"ClientAdapter",
        code:function() { 
            /* create an array of objects; each object contians a single key/value pair */
            var arrayOfSentences = this.documentContent.split(".");
            for (var i = 0; i < arrayOfSentences.length; i++) {
                var obj = {};
                obj[arrayOfSentences[i].trim().toLowerCase()] = 1;
                this.dividedInput.push(obj);
            }
            console.log(">>>>> splitted input in key/value pairs (it is prepared for map phase)");
            this.documentContent = "";
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
            var j = 0;
            for (var i = 0; i < this.dividedInput.length; i++) {
                var obj = { input: "", workerName: "" };
                obj.input = this.dividedInput[i];
                obj.workerName = this.mapWorkers[j];
                //startSwarm("MapSwarm.js", "doWork", obj);
                if (j == this.mapWorkers.length - 1) {
                    j = 0;
                }
                else {
                    j++;
                }
                console.log(">>>>> sent input: " + obj.input + " to worker: " + obj.workerName);
            }
            //this.on("MapSwarm.js", mapOutputReceived);

            /*function mapOutputReceived(obj) {
                console.log(">>>>> maxOutputReceived() call");
            }*/

            var sutil = require('swarmutil');
            var adapterPort         = 3000;
            var adapterHost         = "localhost";
            swarmSettings.authentificationMethod = "testCtor";
            var client = sutil.createClient(adapterHost, adapterPort, "UserForStartSwarmTest", "ok","BalancerTest");

            client.startSwarm("LaunchingTest.js","clientCtor");

            client.on("LaunchingTest.js",getGreetings);

            function getGreetings(obj){
                var msg = obj.message;
                console.log(">>>>> " + msg);
            }
        }
    }
};

mapReduceSwarm;
