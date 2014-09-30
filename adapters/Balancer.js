/**
 * Demo adapter to show simple implementation of a service balancer
 *
 * Can be easily used for services that are very heavy (like file conversion, complex computation,etc)
 * While it is fast,and good it will not be so good in all cases
 *
 * More strategies are available (roundRobin, random, after perceived load)
 */


thisAdapter = require('swarmutil').createAdapter("Balancer");

function workerStatus(workerName){
    this.workerName = workerName;
    this.loadCounter = 0;
    this.lastResponseTime = 0;
    this.lastAliveCheck = Date.now();
    return this;
}

var workers = {};
var workersArray = [];

registerWorker  = function(workerName){
    cprint("Registering: " + workerName);
    if(workers[workerName] != null){
        var pos = workersArray.indexOf(workers[workerName]);
        workersArray.splice(pos,1);
    }
    workers[workerName] = new workerStatus(workerName);
    workersArray.push(workers[workerName]);
}

unregisterWorker  = function(workerName){
    cprint("Unregistering: " + workerName);
    if(workers[workerName] != null){
        var pos = workersArray.indexOf(workers[workerName]);
        workersArray.splice(pos,1);
    }
    delete workers[workerName];
}

getAllWorkers = function(){
    return workersArray.map(function(ws){
        return ws.workerName;
    });
}

// to rewrite; it's not a nice way to identify a map worker node
getAllMapWorkers = function() {
    var workers = [];
    for (var i = 0; i < workersArray.length; i++) {
        if (workersArray[i].workerName.indexOf("WorkerMap") != -1) {
            workers.push(workersArray[i]);
        }
    }
    return workers;
}

// to rewrite; it's not a nice way to identify a reduce worker node
getAllReduceWorkers = function() {
    var workers = [];
    for (var i = 0; i < workersArray.length; i++) {
        if (workersArray[i].workerName.indexOf("WorkerReduce") != -1) {
            workers.push(workersArray[i]);
        }
    }
    return workers;
}

// return a (available) map worker node based on round robin scheduling
var workerRobinPos = -1;
getMapWorker = function() {
    var mapWorkers = getAllMapWorkers();
    if (mapWorkers.length != 0) {
        if (workerRobinPos == mapWorkers.length - 1) { workerRobinPos = -1; } // reset position index after each cycle
        workerRobinPos++;
        workerRobinPos %= mapWorkers.length;
        return mapWorkers[workerRobinPos].workerName;
    } else {
        logInfo("Could not choose a map worker");
        return null;
    }
}

// return a (available) reduce worker node based on round robin scheduling
var reducerRobinPos = -1;
getReduceWorker = function() {
    var reduceWorkers = getAllReduceWorkers();
    if (reduceWorkers.length != 0) {
        if (reducerRobinPos == reduceWorkers.length - 1) { reducerRobinPos = -1; } // reset position index after each cycle
        reducerRobinPos++;
        reducerRobinPos %= reduceWorkers.length;
        return reduceWorkers[reducerRobinPos].workerName;
    } else {
        logInfo("Could not choose a reduce worker");
        return null;
    }
}

var robinPos = -1;
function roundRobin(){
    //cprint(J(workersArray));
    if(workersArray.length !=0){
        robinPos++;
        robinPos %= workersArray.length;
        return workersArray[robinPos].workerName;
    }
    else{
        logInfo("Wired & Warning failure: Choosing Null* node as worker...");
        return "Null*";
    }
}

function chooseRandom(){

    if(workersArray.length !=0){
        var rand = parseInt(Math.random()) % workersArray.length;
        return workersArray[rand].workerName;
    }
    else{
        logInfo("Wired & Warning failure: Choosing Null* node as worker...");
        return "Null*";
    }
}


function lightLoadChoose(){
    if(workersArray.length !=0){
        var minPos      = 0;
        var minValue    = 0;
        for(var i=0;i<workersArray.length;i++){
            if(workersArray[i].loadCounter < minValue){
                minPos = i;
                minValue = workersArray[i].loadCounter;
            }
        }
        return workersArray[minPos].workerName;
    }
    else{
        logInfo("Wired & Warning failure: Choosing Null* node as worker...");
        return "Null*";
    }
}

chooseWorker = function(balacingStrategy){
    if(balacingStrategy == undefined){
        balacingStrategy = "Round-Robin";
    }
    if(balacingStrategy == "Round-Robin"){
        return roundRobin();
    } else
    if(balacingStrategy == "random"){
        return chooseRandom();
    } else
    if(balacingStrategy == "load"){
        return lightLoadChoose();
    }
    else{
          logInfo("Unknown balancing name " + balacingStrategy +", defaulting...");
        return roundRobin();
    }
}


workerIsAlive = function (workerName,pingTime,pongTime){
    workers[workerName].lastResponseTime = pongTime - pingTime;
}

taskDone = function (workerName){
    //cprint("TaskDone:" + J(workers[workerName]) + " " + workerName);
    if(workers[workerName] != undefined){
        workers[workerName].loadCounter--;
    }
}


taskBegin = function(workerName){
    //cprint("TaskBegin:" + J(workers[workerName]) + " " + workerName);
    if(workers[workerName] != undefined){
        workers[workerName].loadCounter++;
    }
}




