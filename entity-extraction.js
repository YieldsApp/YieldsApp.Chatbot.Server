var tp = require('./tp')

var dateRegex = /(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}/gi
//var michrazRegex = /([א-ת][א-ת])[!@#\$%\^\&*\)\(+=._-]?([0-9][0-9]?[0-9]?)[!@#\$%\^\&*\)\(+=._-]\d{4}/gi
// ([א-ת][א-ת])[!@#\$%\^\&*\)\(+=._-]?([0-9][0-9]?[0-9]?)[!@#\$%\^\&*\)\(+=._-]?\d{4}
var michrazRegex=/([א-ת][א-ת])[\\\/!\@\#\$\%\^\&\*\)\(+=._-]?([0-9][0-9]?[0-9]?)[\\\/!\@\#\$\%\^\&\*\)\(+=._-]?(\d{4})/gi
var michrazRegex2=/([א-ת][א-ת])[\\\/!\@\#\$\%\^\&\*\)\(+=._-]?(\d{4})[\\\/!\@\#\$\%\^\&\*\)\(+=._-]?([0-9][0-9]?[0-9]?)/gi
var singleMichrazRegex = /מכרז |מכרז$/gi
var replaces = [
    { find: / כל|^כל/gi, replace: 'הכל' },
    { find: /בניה רויה/gi, replace: 'בניה רוויה' },
];

function recognize(text, onEnd) {
    if (!text) {
        onEnd({}); return
    }
    for (var i in replaces) {
        text = text.replace(replaces[i].find, replaces[i].replace);
    }

    tp.sql(`exec GetIds N'${text}'`)
        .execute()
        .then(function (results) {
            var area = results.filter(res => res.Category == 'Area').map(res => res.Id)
            var designation = results.filter(res => res.Category == 'Designation').map(res => res.Id)
            var locality = results.filter(res => res.Category == 'Locality').map(res => res.Id)
            var tenderState = results.filter(res => res.Category == 'TenderState').map(res => res.Id)

            dates = text.match(dateRegex);
            if (dates) {
                fromDate = getDate(dates[0]);
                toDate = getDate(dates[1]);
            } else {
                fromDate = null;
                toDate = null;
            }

            var michraz = text.match(michrazRegex) || text.match(michrazRegex2);

            console.log('מספר מכרז', michraz);

            var res = {
                iTop: 50,
                bAddDetails: true,
                type: 'json',
                dDivurDate: (new Date(process.env.DEFAULT_DATE)).toUTCString(),
                lMichraz: michraz ? formatMichraz(michraz[0]) : -1,
                iStatus: getId(tenderState),
                ListYeudMichraz: getId(designation),
                iMerchav: getId(area),
                ListYeshuv: getId(locality),
                dFromDatePirsum: fromDate,
                dToDatePirsum: toDate,
            };

            console.log('lMichraz', res.lMichraz);
            if (res.lMichraz != -1) {
                res.iStatus = -1;
                res.ListYeudMichraz = -1;
                res.iMerchav = -1;
                res.ListYeshuv = -1;
                res.dFromDatePirsum = (new Date(process.env.DEFAULT_DATE)).toUTCString();
                res.dToDatePirsum = (new Date(process.env.DEFAULT_DATE)).toUTCString();
            }
            if (res.ListYeshuv && res.ListYeshuv != -1)
                res.iMerchav = -1;
            if (res.iMerchav && res.iMerchav != -1)
                res.ListYeshuv = -1;
            if (text.indexOf('הכל') >= 0) {
                res.ListYeshuv = -1;
                res.dFromDatePirsum = (new Date(process.env.DEFAULT_DATE)).toUTCString();
                res.dToDatePirsum = (new Date(process.env.DEFAULT_DATE)).toUTCString();
            }

            var single = res.lMichraz != -1 || !!text.match(singleMichrazRegex)

            onEnd({
                params: res,
                single
            });
        })
        .fail(function (err) {
            console.log('getAreas from db error ', err)
            onEnd && onEnd({
                params: {
                    iTop: 50,
                    bAddDetails: true,
                    type: 'json',
                    dDivurDate: (new Date(process.env.DEFAULT_DATE)).toUTCString()
                }
            })
        });
}

function getId(arr) {
    if (arr.length == 0) {
        return null
    } else {
        return arr[0];
    }
}

function getDate(date) {
    if (date) {
        var split = [];
        if (date.indexOf('/') >= 0)
            split = date.split('/')
        else
            split = date.split('-')
        return (new Date(+split[2], +split[1] - 1, +split[0])).toUTCString()
    } else {
        return null;
    }
}

function formatMichraz(michraz) {
    michrazRegex.lastIndex = 0;
    michrazRegex2.lastIndex = 0;
    var code=michrazRegex.exec(michraz);
    var code2= michrazRegex2.exec(michraz);

    if (!code&&!code2){
        console.log("אין התאמה בפורמט",code,code2);
         return -1;
    }
    else if(code)
        return code[2]+code[3]; 
    else return code2[3]+code2[2];
    // //in case that wrote without chars & not in the correct order: 
    // if(String(michraz).replace(/[\\\/!\@\#\$\%\^\&\*\)\(+=._-]/g,'')==code2[0]){
    //     console.log("code2[0]",code2[0],"String(michraz).replace(/[\\\/!\@\#\$\%\^\&\*\)\(+=._-]/g,'')",String(michraz).replace(/[\\\/!\@\#\$\%\^\&\*\)\(+=._-]/g,''));
    //         return code2[0].substring(2,code[0].length-4)+code2[0].substring( code[0].length-4, code[0].length);        
    // }
 }

module.exports = {
    recognize,
    formatMichraz
};