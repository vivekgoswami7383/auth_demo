const mysql = require("mysql");

let connection = mysql.createConnection({
    host: process.env.DATABSE_HOST,
    user: process.env.DATABSE_USER,
    password : process.env.DATABSE_PASSWORD,
    port: process.env.DATABSE_PORT,
    database: process.env.DATABSE_NAME
});

connection.connect((err) => {
    if(err){
        console.log(err);
    }
    else{
        console.log("Database connected");
    }
})

module.exports = connection;