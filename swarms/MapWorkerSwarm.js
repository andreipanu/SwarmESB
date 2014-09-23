/**
 *
 *  swarm example, used to start tasks in workers
 *
 */
var mapWorkerSwarm =
{
    vars:{
        input:"",
        debug:"false"
    },
    doWork:function(job)  {
        this.input = job.input;
        this.swarm("executeJob", job.workerName);
    },
    executeJob:{
        node:"*",
        code:function () {
            var arrayOfWords = Object.keys(this.input)[0].split(" ");
            this.wordAppearancesArray = [];
            for (var i = 0; i < arrayOfWords.length; i++) {
                var obj = {};
                obj[arrayOfWords[i]] = 1;
                this.wordAppearancesArray.push(obj);
            }
            this.input = null;
            this.home("returnResults");
        }
    }
};

mapWorkerSwarm;
