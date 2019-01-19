var schedule = require('node-schedule')
var tp = require('./tp')
var request = require('request')

var client = null;

function setClient(Client) {
    client = Client
    return module.exports;
}

function init() {
    schedule.scheduleJob('0 0 * * *', function () {
        reloadData();
    })
}

function reloadData() {
    reloadAreas();
    reloadDesignations();
    reloadLocalities();
}

function reloadAreas() {
    request(process.env.YieldsApp_AREAS, function (error, response, body) {
        client.trackTrace({
            time: new Date(),
            message: 'Reload DB',
            properties: {
                table: 'Areas',
                step: 1,
                error,
                results: body
            }
        })

        if (error)
            console.log('error:', error); // Print the error if one occurred
        else {
            try {
                var json = JSON.parse(body)
            } catch (ex) {
                console.log('failed to parse json body at get areas request ', body);
                return;
            }
            areasList = json.map(ele => ({
                areaId: ele.AreaMichrazId,
                areaName: ele.AreaMichrazDesc
            }));
            saveInDB(areasList, 'Areas', 'area')
        }
    });
}
function reloadDesignations() {
    request(process.env.YieldsApp_DESIGNATIONS, function (error, response, body) {
        client.trackTrace({
            time: new Date(),
            message: 'Reload DB',
            properties: {
                table: 'Designations',
                step: 1,
                error,
                results: body
            }
        })

        if (error)
            console.log('error:', error); // Print the error if one occurred
        else {
            try {
                var json = JSON.parse(body)
            } catch (ex) {
                console.log('failed to parse json body at get designations request ', body);
                return;
            }
            designationsList = json.map(ele => ({
                designationId: ele.YeudMichrazId,
                designationName: ele.YeudMichrazDesc
            }));
            saveInDB(designationsList, 'Designations', 'designation')
        }
    });
}
function reloadLocalities() {
    request(process.env.YieldsApp_LOCALITIES, function (error, response, body) {
        client.trackTrace({
            time: new Date(),
            message: 'Reload DB',
            properties: {
                table: 'Localities',
                step: 1,
                error,
                results: body
            }
        })

        if (error)
            console.log('error:', error); // Print the error if one occurred
        else {
            try {
                var json = JSON.parse(body)
            } catch (ex) { console.log('failed to parse json body at get localities request ', body); return; }
            localitiesList = json.map(ele => ({
                localityId: ele.mtysvSemelYishuv,
                localityName: ele.mtysvShemYishuv
            }));
            saveInDB(localitiesList, 'Localities', 'locality')
        }
    });
}

function saveInDB(list, tableName, instanceName) {
    client.trackTrace({
        time: new Date(),
        message: 'Reload DB',
        properties: {
            table: tableName,
            step: 2
        }
    })


    var sqlDelete = "delete from [dbo].[" + tableName + "]";
    var i, j, listList = [], chunk = 500;
    for (i = 0, j = list.length; i < j; i += chunk) {
        listList[listList.length] = list.slice(i, i + chunk);
    }
    var sqlInsert = listList.map(list2 => "INSERT [dbo].[" + tableName + "] VALUES " + list2.map(ele => "(" + ele[instanceName + 'Id'] + ", N'" + ele[instanceName + 'Name'].replace(/'/g, "''") + "')").join(', '))
    var trans;

    var transaction = tp.beginTransaction()
        .then(function (newTransaction) {
            trans = newTransaction;
            console.log('begin transaction')
            return trans.sql(sqlDelete)
                .returnRowCount()
                .execute();
        });
    for (i in sqlInsert) {
        (function (statement) {
            transaction = transaction.then(function (testResult) {
                return trans.sql(sqlInsert[statement])
                    .returnRowCount()
                    .execute()
            })
        })(i)
    }
    transaction.then(function (testResult) {
        client.trackTrace({
            time: new Date(),
            message: 'Reload DB',
            properties: {
                table: tableName,
                step: 3
            }
        })

        console.log('end transaction')
        return trans.commitTransaction();
    })
        .fail(function (err) {
            client.trackException({
                time: new Date(),
                exception: new Error("Reload DB Failed"),
                properties: {
                    table: tableName,
                    err
                }
            })

            console.log('transaction err', err)
            return trans.rollbackTransaction();
        })
}

module.exports = {
    init,
    setClient
}