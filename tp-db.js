var tp = require('./tp')
var client = null;

function setClient(Client) {
    client = Client
}

function getAreas(callback) {
    tp.sql("exec GetAreas")
        .execute()
        .then(function (results) {
            client.trackTrace({
                time: new Date(),
                message: 'Get From DB',
                properties: {
                    table: 'Areas',
                    results
                }
            })
            callback && callback(results)
        })
        .fail(function (err) {
            client.trackException({
                time: new Date(),
                exception: new Error("Got Results from DB Failed"),
                properties: {
                    table: 'Areas',
                    err
                }
            })
            console.log('getAreas from db error ', err)
            callback && callback([])
        });
}

function getTenderStates(callback) {
    tp.sql("exec GetTenderStates")
        .execute()
        .then(function (results) {
            client.trackTrace({
                time: new Date(),
                message: 'Get From DB',
                properties: {
                    table: 'TenderStates',
                    results
                }
            })
            callback && callback(results)
        })
        .fail(function (err) {
            client.trackException({
                time: new Date(),
                exception: new Error("Got Results from DB Failed"),
                properties: {
                    table: 'TenderStates',
                    err
                }
            })
            console.log('getTenderStates from db error ', err)
            callback && callback([])
        });
}

function getTenderKinds(callback) {
    tp.sql("exec GetTenderKinds")
        .execute()
        .then(function (results) {
            client.trackTrace({
                time: new Date(),
                message: 'Get From DB',
                properties: {
                    table: 'TenderKinds',
                    results
                }
            })
            callback && callback(results)
        })
        .fail(function (err) {
            client.trackException({
                time: new Date(),
                exception: new Error("Got Results from DB Failed"),
                properties: {
                    table: 'TenderKinds',
                    err
                }
            })
            console.log('getTenderKinds from db error ', err)
            callback && callback([])
        });
}

function getDesignations(callback) {
    tp.sql("exec GetDesignations")
        .execute()
        .then(function (results) {
            client.trackTrace({
                time: new Date(),
                message: 'Get From DB',
                properties: {
                    table: 'Designations',
                    results
                }
            })
            callback && callback(results)
        })
        .fail(function (err) {
            client.trackException({
                time: new Date(),
                exception: new Error("Got Results from DB Failed"),
                properties: {
                    table: 'Designations',
                    err
                }
            })
            console.log('getDesignations from db error ', err)
            callback && callback([])
        });
}

function getGreetings(text, callback) {
    tp.sql(`exec GetGreetings N'${text.replace(/'/g, "''")}'`)
        .execute()
        .then(function (results) {
            client.trackTrace({
                time: new Date(),
                message: 'Get From DB',
                properties: {
                    table: 'Greetings',
                    results
                }
            })
            callback && callback(results.length ? results[0] : {})
        })
        .fail(function (err) {
            client.trackException({
                time: new Date(),
                exception: new Error("Got Results from DB Failed"),
                properties: {
                    table: 'Greetings',
                    err
                }
            })
            console.log('getGreetings from db error ', err)
            callback && callback({})
        });
}

function getLocalityId(localityName, callback) {
    if (!localityName) {
        callback(-1); return
    }
    tp.sql(`exec GetLocalityId N'${localityName.replace(/'/g, "''")}'`)
        .execute()
        .then(function (results) {
            client.trackTrace({
                time: new Date(),
                message: 'Get From DB',
                properties: {
                    table: 'Locality',
                    results
                }
            })
            callback && callback(results[0] ? results[0].localityId : -1)
        })
        .fail(function (err) {
            client.trackException({
                time: new Date(),
                exception: new Error("Got Results from DB Failed"),
                properties: {
                    table: 'Locality',
                    err
                }
            })
            console.log('getLocalitY from db error ', err)
            callback && callback(-1)
        });
}

module.exports = {
    setClient,
    getAreas,
    getTenderStates,
    getTenderKinds,
    getDesignations,
    getGreetings,
    getLocalityId
}
