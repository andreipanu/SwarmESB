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
        debug:"false"
    },
    doWork:function(documentContent) {
        this.documentContent = documentContent;
        this.dividedInput = [];
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
            console.log("> splitted input in key/value pairs (it is prepared for map phase)");
            this.documentContent = null; // we don't need to carry on the original input data
            this.swarm("distributeLoad");
        }
    },
    distributeLoad:{ // phase that gives tasks (chunks of data) to map and reducer workers
        node:"Balancer",
        code:function() {
            var ctx = getContext("balancer");
            ctx.finishedReducerJobs = 0; // increments when each reducer sends back a swarm with results (after each reduce phase)
            ctx.reducersResponseCounter = 0; // increments when each reducer sends its final (partial) results
            ctx.finalResults = []; // final results from all reduce workers are collected here

            this.chunkCount = this.dividedInput.length; // the number of chunks sent to map workers
            this.currentChunk = 0; // denotes each map worker's allocated chunk
            
            for (this.currentChunk = 0; this.currentChunk < this.dividedInput.length; this.currentChunk++) {
                var chosenMapWorker = getMapWorker();
                this.chosenReduceWorker = getReduceWorker(); // choose a reduce worker's name that will be sent with the swarm
                console.log(">>>>> [Balancer] sent swarm to worker " + chosenMapWorker + " and reducer " + this.chosenReduceWorker);
                this.swarm("executeMapPhase", chosenMapWorker);
            }
        }
    },    
    executeMapPhase:{
        node:"*",
        code:function() {
            console.log(">>>>>>>>>> [" + thisAdapter.nodeName + "] processing chunk: " + this.currentChunk);
                // + " with data: " + Object.keys(this.dividedInput[this.currentChunk]));
            
            var arrayOfWords = Object.keys(this.dividedInput[this.currentChunk])[0].split(" ");
            this.mapPhaseResults = []; // array of objects; each object contains a single key/value pair
            for (var i = 0; i < arrayOfWords.length; i++) {
                // execute local reduce
                var found = false;
                for (var j = 0; j < this.mapPhaseResults.length; j++) { // search if the word already exists
                    if (arrayOfWords[i] == Object.keys(this.mapPhaseResults[j])[0]) { // the word already exists, just increment
                        this.mapPhaseResults[j][arrayOfWords[i]] += 1;
                        found = true;
                    }
                }
                if (!found) { // it's a new word
                    var obj = {};
                    obj[arrayOfWords[i]] = 1;
                    this.mapPhaseResults.push(obj);
                }
            }
            
            console.log(">>>>>>>>>>>>>>> [" + thisAdapter.nodeName + "] created array with " + this.mapPhaseResults.length + 
                " objects; sending it to reducer: " + this.chosenReduceWorker);
            
            this.swarm("executeReducePhase", this.chosenReduceWorker);
        }
    },
    executeReducePhase:{
        node:"*",
        code:function() {
            console.log(">>>>>>>>>>>>>>>>>>>> [" + thisAdapter.nodeName + "] received words array with " + this.mapPhaseResults.length + " objects");
            
            var ctx = getContext("reducerResults");
            if (ctx.partialResults == null || ctx.partialResults == undefined) {
                ctx.partialResults = this.mapPhaseResults;
            } else {
                for (var i = 0; i < this.mapPhaseResults.length; i++) {
                    var word = Object.keys(this.mapPhaseResults[i])[0];
                    var found = false;
                    for (var j = 0; j < ctx.partialResults.length; j++) { // search if the word already exists
                        if (word == Object.keys(ctx.partialResults[j])[0]) {
                            ctx.partialResults[j][word] += 1;
                            found = true;
                        }
                    }
                    if (!found) { // it's a new word
                        ctx.partialResults.push(this.mapPhaseResults[i]);
                    }
                }
            }
            
            console.log(">>>>>>>>>>>>>>>>>>>> [" + thisAdapter.nodeName + "] partial results array with " + ctx.partialResults.length + " objects");
            this.mapPhaseResults = null; // we don't need to carry further these results with this swarm
            this.swarm("checkIfFinished");
        }
    },
    checkIfFinished:{ // verify if all reducers finished their jobs
        node:"Balancer",
        code:function() {
            var ctx = getContext("balancer");
            ctx.finishedReducerJobs++;

            if (ctx.finishedReducerJobs == this.chunkCount) { // the last swarm received will execute this
                console.log("> all reducers have finished their jobs");
                var reduceWorkers = getAllReduceWorkers();
                for (var i = 0; i < reduceWorkers.length; i++) { // send a swarm to each reduce worker to get the partial results stored in their context
                    this.swarm("getPartialFinalResults", reduceWorkers[i].workerName);
                }
            }
        }
    },
    getPartialFinalResults:{
        node:"*",
        code:function() {
            var ctx = getContext("reducerResults");
            this.reducerPartialFinalResults = ctx.partialResults; // 
            ctx.partialResults = null; // reset node's data for future tasks
            this.swarm("finalPhase");
        }
    },
    finalPhase:{
        node:"Balancer",
        code:function() {
            console.log("> received from reducer an array with " + this.reducerPartialFinalResults.length + " objects");
            var reduceWorkers = getAllReduceWorkers();
            var ctx = getContext("balancer");
            ctx.finalResults = ctx.finalResults.concat(this.reducerPartialFinalResults);
            ctx.reducersResponseCounter++;

            if (ctx.reducersResponseCounter == reduceWorkers.length) { // we have received all the partial responses from reducer workers
                this.results = []; // contains the final results that will be sent to the client
                // execute the final reduce
                for (var i = 0; i < ctx.finalResults.length; i++) {
                    var word = Object.keys(ctx.finalResults[i])[0];
                    var found = false;
                    for (var j = 0; j < this.results.length; j++) {
                        if (word == Object.keys(this.results[j])[0]) {
                            this.results[j][word] += ctx.finalResults[i][word];
                            found = true;
                        }
                    }
                    if (!found) {
                        this.results.push(ctx.finalResults[i]);
                    }
                }

                console.log("> job finished, sending final results to client");
                this.home("results");
            }
        }
    }  
};

mapReduceSwarm;