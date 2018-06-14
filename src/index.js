const express = require('express');
const app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const port = 3001;

app.get('/listings', (req, res) => {
	res.send({});
});

app.listen(port, () => console.log(`running on ${port}`));