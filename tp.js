var tp = require('tedious-promises');

var dbConfig = {
    userName: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    options:
    {
        database: process.env.DB_DATABASE_NAME,
        encrypt: true
    }
}
tp.setConnectionConfig(dbConfig);

module.exports = tp;
