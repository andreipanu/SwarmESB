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
    distributeLoad:{
        node:"Balancer",
        code:function() {
            var mapWorkers = getAllMapWorkers();
            var reduceWorkers = getAllReduceWorkers();
            var n = 0;
            var m = 0;

            var ctx = getContext("balancer");
            ctx.finishedReducerJobs = 0;
            ctx.reducersResponseCounter = 0;
            ctx.finalResults = [];

            this.chunkCount = this.dividedInput.length;
            this.currentChunk = 0;
            this.chosenReduceWorker = "";
            
            for (this.currentChunk = 0; this.currentChunk < this.dividedInput.length; this.currentChunk++) {
                var chosenMapWorker = mapWorkers[n % mapWorkers.length];
                this.chosenReduceWorker = reduceWorkers[m % reduceWorkers.length];
                n++;
                if (n == mapWorkers.length) { n = 0; }
                m++;
                if (m == reduceWorkers.length) { m = 0; }
                console.log(">>>>> [Balancer] sent swarm to worker " + chosenMapWorker + " and reducer " + this.chosenReduceWorker);

                this.swarm("executeMapPhase", chosenMapWorker);

            }
        }
    },
    executeMapPhase:{
        node:"*",
        code:function() {
            console.log(">>>>>>>>>> [" + thisAdapter.nodeName + "] processing chunk: " + 
                this.currentChunk + " with data: " + Object.keys(this.dividedInput[this.currentChunk]));
            
            var arrayOfWords = Object.keys(this.dividedInput[this.currentChunk])[0].split(" ");
            this.mapPhaseResults = [];
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
                // TODO: move this code into a function into the reducer
                for (var i = 0; i < this.mapPhaseResults.length; i++) {
                    var word = Object.keys(this.mapPhaseResults[i])[0];
                    var found = false;
                    for (var j = 0; j < ctx.partialResults.length; j++) {
                        if (word == Object.keys(ctx.partialResults[j])[0]) {
                            ctx.partialResults[j][word] += 1;
                            found = true;
                        }
                    }
                    if (!found) {
                        ctx.partialResults.push(this.mapPhaseResults[i]);
                    }
                }
            }
            
            console.log(">>>>>>>>>>>>>>>>>>>> [" + thisAdapter.nodeName + "] partial results array with " + ctx.partialResults.length + " objects");

            this.swarm("checkIfFinished");
        }
    },
    checkIfFinished:{
        node:"Balancer",
        code:function() {
            var ctx = getContext("balancer");
            ctx.finishedReducerJobs++;

            if (ctx.finishedReducerJobs == this.chunkCount) {
                console.log("> all reducers have finished their jobs");
                var reduceWorkers = getAllReduceWorkers();
                for (var i = 0; i < reduceWorkers.length; i++) {
                    this.swarm("getPartialFinalResults", reduceWorkers[i]);
                }
            }
        }
    },
    getPartialFinalResults:{
        node:"*",
        code:function() {
            var ctx = getContext("reducerResults");
            this.reducerPartialFinalResults = ctx.partialResults;
            ctx.partialResults = null;
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

            if (ctx.reducersResponseCounter == reduceWorkers.length) {
                this.results = [];
                // TODO: move this code into a function into the balancer
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