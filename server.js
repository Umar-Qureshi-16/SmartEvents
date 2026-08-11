const express = require('express');
const mongoose = require('mongoose');
const app = express();
const uri ='mongodb+srv://fa22bse157_db_user:1601@smartevents.jfup1c9.mongodb.net/?appName=SmartEvents';
mongoose.connect(uri)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));
app.get("/", (req, res) => {
  res.send("Smart Event Management System Running 🚀");
});
app.listen(3000, () => {
  console.log("Server running on port 3000");
});

