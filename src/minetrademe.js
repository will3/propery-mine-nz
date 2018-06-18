const startPage = process.argv.length > 2 ? process.argv[2] : 1;
const mineTrademe = require('./workers/minetrademe');
// const Queue = require('bull');
// const queue = new Queue('default', process.env.REDIS_URI);
// queue.process(function(job) {
// 	return ;
// });
// 
mineTrademe(startPage);