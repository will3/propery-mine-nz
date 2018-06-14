const startPage = process.argv.length > 2 ? process.argv[2] : 1;
require('./workers/minetrademe')(startPage);