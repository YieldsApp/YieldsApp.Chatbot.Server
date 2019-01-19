/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/
"use strict";

var useEmulator = (process.env.BotEnv != 'prod');
console.log('use emulator? ', useEmulator)
if (useEmulator)
    require('dotenv').config();

var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var request = require('request');

const appInsights = require("applicationinsights");
appInsights.setup().start();
const client = appInsights.defaultClient;

client.trackEvent({
    time: new Date(),
    name: 'App Started'
})

var generateUrl = require('./generate-url')
//var db = require('./tp-db');
//db.setClient(client);

//require('./scheduler').setClient(client).init()
var config = require('./config')

var entityExtraction = require('./entity-extraction')

var connector = useEmulator ? new builder.ChatConnector() : new builder.ChatConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);
var regex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/;
bot.set('storage', tableStorage);

bot.on('conversationUpdate', function (message) {
    client.trackEvent({
        time: new Date(),
        name: 'Enter Conversation Update'
    })

    console.log("Enter conversationUpdate()");
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                bot.beginDialog(message.address, '/');
            }
        });
    }
});

// Install a custom recognizer to look for user saying 'help' or 'goodbye'.
bot.recognizer({
    recognize: function (context, done) {
        client.trackTrace({
            time: new Date(),
            message: 'Enter Bot Recognizer'
        })

        var intent = { score: 0.0 };

        if (context.message.text) {
            var message = context.message.text.toLowerCase();

            nlpResult = "default";
            switch (nlpResult) {
                case 'מכרזים':
                    intent = { score: 0.4, intent: 'Mechrazim', text: message };
                    break;
                case 'Unknown':
                    intent = { score: 0.4, intent: 'greetingOrDefault', text: message }
                    break;
                default:
                    intent = { score: 0.4, intent: 'default' }
                    break;
            }

            client.trackTrace({
                time: new Date(),
                message: 'End Bot Recognizer',
                properties: {
                    text: context.message.text,
                    intent: intent
                }
            })

            done(null, intent);





        }
    }
});

bot.dialog('askForMichraz', [
    function (session, args) {
        if (args && args.retry) {
            session.dialogData.retry = args.retry
            builder.Prompts.text(session, config.Michrazim1MichrazRetry + "\n" + config.Michrazim1Michraz);
        } else {
            session.dialogData.retry = 0
            builder.Prompts.text(session, config.Michrazim1Michraz);
        }
    },
    function (session, results) {
        var lMichraz = entityExtraction.formatMichraz(results.response);
        if (lMichraz == -1 && session.dialogData.retry < config.Michrazim1MichrazRetryNumber)
            session.replaceDialog('askForMichraz', { retry: session.dialogData.retry + 1 })
        else if (lMichraz == -1) {
            session.send(config.unSuccededToNoticeTheMichraz);
            session.endDialogWithResult({ response: lMichraz });
        }
        else {
            session.endDialogWithResult({ response: lMichraz });
        }
    }
]);

bot.dialog('Mechrazim', [
    function (session, result, next) {
        entityExtraction.recognize(result.intent.text, function (res) {
            session.dialogData.params = res.params;
            session.dialogData.single = res.single;
            client.trackTrace({
                time: new Date(),
                message: 'Enter Dialog',
                properties: {
                    dialog: 'Mechrazim',
                    step: 1,
                    params: session.dialogData.params
                }
            })

            console.log('Mechrazim step 1')

            if (!session.dialogData.single || session.dialogData.params.lMichraz != -1) {
                console.log("Don't ask for lMichraz");
                next(); return
            }
            console.log("Ask for lMichraz");
            session.beginDialog('askForMichraz');
        })
    },

    function (session, result, next) {

        //   session.dialogData.params.lMichraz=result.response;

        if (session.dialogData.single && session.dialogData.params.lMichraz == -1) {
            session.dialogData.params.lMichraz = result.response;
            session.dialogData.params.iStatus = -1;
            session.dialogData.params.ListYeudMichraz = -1;
            session.dialogData.params.iMerchav = -1;
            session.dialogData.params.ListYeshuv = -1;
            session.dialogData.params.dFromDatePirsum = (new Date(process.env.DEFAULT_DATE)).toUTCString();
            session.dialogData.params.dToDatePirsum = (new Date(process.env.DEFAULT_DATE)).toUTCString();
        }

        if (session.dialogData.params.iStatus != null) {
            next(); return
        }

        /*db.getTenderStates(function (tenderStates) {
            session.dialogData.list = tenderStates;
            var options = tenderStates.map(i => i.tenderStateName);
            builder.Prompts.choice(session, config.Michrazim3TenderState, options.join("|"), { listStyle: builder.ListStyle.button });
        })*/
    },

    function (session, result, next) {
        if (session.dialogData.params.iStatus == null)
            session.dialogData.params.iStatus = getId(session.dialogData.list, 'tenderState', result.response.entity);
        client.trackTrace({
            time: new Date(),
            message: 'Enter Dialog',
            properties: {
                dialog: 'Mechrazim',
                step: 2,
                response: result.response,
                params: session.dialogData.params
            }
        })
        console.log('Mechrazim step 2')

        if (session.dialogData.params.ListYeudMichraz != null) {
            next(); return
        }
        /*db.getDesignations(function (designations) {
            session.dialogData.list = designations;
            console.log(designations);
            var options = designations.map(i => i.designationName);
            builder.Prompts.choice(session, config.Michrazim4Designation, options.join("|"), { listStyle: builder.ListStyle.button });
        })*/
    },

    function (session, result, next) {
        if (session.dialogData.params.ListYeudMichraz == null)
            session.dialogData.params.ListYeudMichraz = getId(session.dialogData.list, 'designation', result.response.entity);
        client.trackTrace({
            time: new Date(),
            message: 'Enter Dialog',
            properties: {
                dialog: 'Mechrazim',
                step: 3,
                response: result.response,
                params: session.dialogData.params
            }
        })
        console.log('Mechrazim step 3')

        if (session.dialogData.params.iMerchav != null) {
            next(); return
        }
        /*db.getAreas(function (areas) {
            session.dialogData.list = areas;
            var options = areas.map(i => i.areaName);
            builder.Prompts.choice(session, config.Michrazim5Area, options.join("|"), { listStyle: builder.ListStyle.button });
        })*/
    },

    function (session, result, next) {
        if (session.dialogData.params.iMerchav == null)
            session.dialogData.params.iMerchav = getId(session.dialogData.list, 'area', result.response.entity);
        client.trackTrace({
            time: new Date(),
            message: 'Enter Dialog',
            properties: {
                dialog: 'Mechrazim',
                step: 4,
                response: result.response,
                params: session.dialogData.params
            }
        })
        console.log('Mechrazim step 4')
        if (session.dialogData.params.ListYeshuv != null || session.dialogData.params.iMerchav == -1) {
            next(); return
        }
        session.beginDialog('askForLocality');
    },

    function (session, result, next) {

        if (session.dialogData.params.ListYeshuv == null)
            session.dialogData.params.ListYeshuv = result.response;
        client.trackTrace({
            time: new Date(),
            message: 'Enter Dialog',
            properties: {
                dialog: 'Mechrazim',
                step: 5,
                response: result.response,
                params: session.dialogData.params
            }
        })
        console.log('Mechrazim step 5')

        session.dialogData.shortByDate = true;
        if (session.dialogData.params.dFromDatePirsum != null) {
            next(); return
        }

        // Remove filter by dates
        var skipDates = true;
        if (skipDates) {
            next(); return;
        }

        var options = ["לא", "כן"];
        builder.Prompts.choice(session, config.Michrazim7FilterByDate, options.join("|"), { listStyle: builder.ListStyle.button });
    },
    function (session, result, next) {
        client.trackTrace({
            time: new Date(),
            message: 'Enter Dialog',
            properties: {
                dialog: 'Mechrazim',
                step: 6,
                response: result.response,
                params: session.dialogData.params
            }
        })
        console.log('Mechrazim step 6')

        if (session.dialogData.params.dFromDatePirsum != null) {
            next(); return
        }
        if (!result.response || !result.response.index) {
            session.dialogData.shortByDate = false;
            session.dialogData.params.dFromDatePirsum = (new Date(process.env.DEFAULT_DATE)).toUTCString()
            session.dialogData.params.dToDatePirsum = (new Date(process.env.DEFAULT_DATE)).toUTCString()
            next();
        }
        else /*choose 'yes'*/ {
            session.dialogData.shortByDate = true;
            builder.Prompts.text(session, config.Michrazim8FromDate);
        }
    },
    function (session, result, next) {
        client.trackTrace({
            time: new Date(),
            message: 'Enter Dialog',
            properties: {
                dialog: 'Mechrazim',
                step: 7,
                response: result.response,
                params: session.dialogData.params
            }
        })
        console.log('Mechrazim step 7')

        if (session.dialogData.params.dToDatePirsum != null)
            next();
        else if (!session.dialogData.shortByDate)
            next();
        else /*choose 'yes'*/ {
            if (session.dialogData.params.dFromDatePirsum == null) {
                var date = result.response.toString().split('/');
                session.dialogData.params.dFromDatePirsum = (new Date(+date[2], +date[1] - 1, +date[0])).toUTCString()
            }
            builder.Prompts.text(session, config.Michrazim9ToDate);
        }
    },
    function (session, result) {
        if (session.dialogData.params.dToDatePirsum == null && session.dialogData.shortByDate) {
            var date = result.response.toString().split('/');
            session.dialogData.params.dToDatePirsum = (new Date(date[2], +date[1] - 1, date[0])).toUTCString()
        }
        client.trackTrace({
            time: new Date(),
            message: 'Enter Dialog',
            properties: {
                dialog: 'Mechrazim',
                step: 8,
                response: result.response,
                params: session.dialogData.params
            }
        })
        console.log('Mechrazim step 8 looking for results')


        session.send(config.Michrazim10PreResponse)
        var attachments = [];
        var url = process.env.YieldsApp_TENDERS_URL;
        client.trackTrace({
            time: new Date(),
            message: 'Build Url',
            properties: {
                params: session.dialogData.params,
                url: url
            }
        })
        console.log('YieldsApp params: ', session.dialogData.params)
        request.get({
            url: url,
            qs: session.dialogData.params,
            headers: {
                "Authorization": process.env.YieldsApp_HEADER_AUTHORIZATION,
                "Cache-Control": "no-cache",
                "Ocp-Apim-Trace": "true",
                "Ocp-Apim-Subscription-Key": process.env.YieldsApp_SUBSCRIPTION_KEY
            }
        }, function (error, response, body) {
            client.trackTrace({
                time: new Date(),
                message: 'YieldsApp Mechrazim Got Results',
                properties: {
                    error,
                    response,
                    body
                }
            })
            console.log('Mechrazim step 8 got results')

            if (error) {
                session.replaceDialog('error');
                console.log('error', error)
            }
            try {
                var options = JSON.parse(body);
            } catch (e) {
                session.replaceDialog('resultError');
                console.log('error parsing JSON body')
                return;
            }
            if (!options.ResaultList || options.ResaultList.length == 0) {
                session.endDialog(config.Michrazim10EmptyResponse)
            } else {
                options.ResaultList.forEach(function (option) {
                    var details = option.UiDetails
                    var designation = details.filter(i => i.title == "ייעוד");
                    designation = designation[0] && designation[0].Value ? designation[0].Value : "";
                    var tender = details.filter(i => i.title == "תוצאות המכרז");
                    tender = tender[0] && tender[0].Value ? tender[0].Value : "";
                    tender = tender.match(regex) ? tender.match(regex)[2] : "";
                    var tenderAd = generateUrl(option.Michrazid)
                    var michraz = option.Michraz.split('/')
                    michraz = michraz[2] + '/' + michraz[0] + '/' + michraz[1]
                    attachments.push(new builder.HeroCard(session)
                        .title(`${michraz}`)
                        .subtitle(`ישוב: ${option.CityDesc}`)
                        .text(` יעוד: ${designation}`)
                        .images([{ url: option.YeudCode }])
                        .buttons([
                            builder.CardAction.openUrl(session, tenderAd, (config.Michrazim10DetailsLinkButton)),
                            builder.CardAction.openUrl(session, tender, (config.MichrazimResultsLinkButton)),
                        ])
                    );
                });

                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                msg.attachments(attachments);
                msg.text(`להלן פרטי ${options.ResaultList.length} מכרזים: <a href="${process.env.SUBSCRIPTION_URL}" target="_blank">הצטרפות לרשימת תפוצה - פרסום מכרזי מקרקעין</a>`)
                session.endDialog(msg);
            }
        });
    }]).triggerAction({ matches: 'Mechrazim' });

bot.dialog('askForLocality', [
    function (session, args) {
        if (args && args.retry) {
            session.dialogData.retry = args.retry
            builder.Prompts.text(session, config.Michrazim6LocalityRetry);
        } else {
            session.dialogData.retry = 0
            builder.Prompts.text(session, config.Michrazim6Locality);
        }
    },
    function (session, results) {
        /* db.getLocalityId(results.response, function (id) {
             console.log("id:  ", id);
             if (id == -1 && session.dialogData.retry < config.Michrazim6LocalityRetryNumber)
                 session.replaceDialog('askForLocality', { retry: session.dialogData.retry + 1 });
             else if (id == -1 && session.dialogData.retry == config.Michrazim6LocalityRetryNumber) {
                 session.endDialogWithResult({ response: id });
                 session.send(config.unSuccededToNoticeTheLocality);
             }
             else
                 session.endDialogWithResult({ response: id });
         })*/
    }
])

bot.dialog('greetingOrDefault', function (session, result) {
    /*db.getGreetings(result.intent.text, function (res) {
        if (!res.greetingName) {
            session.replaceDialog('default'); return
        }

        client.trackTrace({
            time: new Date(),
            message: 'Enter Dialog',
            properties: {
                dialog: 'greeting',
                step: 1,
            }
        })
        console.log('greeting dialog')
        session.endDialog(res.greetingResponse)
    })*/
}).triggerAction({ matches: 'greetingOrDefault' });

bot.dialog('default', function (session) {
    client.trackTrace({
        time: new Date(),
        message: 'Enter Dialog',
        properties: {
            dialog: 'default',
            step: 1,
        }
    })
    console.log('default dialog')
    session.endDialog(`צר לי לא הבנתי אותך, בשלב זה ביכולתי לתת מידע בנושא מכרזים בלבד. אנא <a href="${process.env.REPRESENTETIVE_URL}" target="_blank">פנה לנציג שירות</a>`);
}).triggerAction({ matches: 'default' });

bot.dialog('helpMe', function (session) {
    client.trackTrace({
        time: new Date(),
        message: 'Enter Dialog',
        properties: {
            dialog: 'helpMe',
            step: 1,
        }
    })
    console.log('helpMe dialog')
    session.endDialog(`צר לי, לא הבנתי אותך, ביכולתי לתת מידע בנושא מכרזים בלבד בשלב זה, אנא , <a href="${process.env.REPRESENTETIVE_URL}" target="_blank">פנה לנציג שירות</a>`);
}).triggerAction({ matches: 'helpMe' });

bot.dialog('resultError', function (session) {
    client.trackTrace({
        time: new Date(),
        message: 'Enter Dialog',
        properties: {
            dialog: 'resultError',
            step: 1,
        }
    })
    console.log('resultError dialog')
    session.send(config.ResultError);
});

bot.dialog('error', function (session) {
    client.trackTrace({
        time: new Date(),
        message: 'Enter Dialog',
        properties: {
            dialog: 'error',
            step: 1,
        }
    })
    console.log('error dialog')
    session.send(config.GenericError);
});

bot.dialog('startOver', function (session) {
    client.trackTrace({
        time: new Date(),
        message: 'Enter Dialog',
        properties: {
            dialog: 'startOver',
            step: 1,
        }
    })
    console.log('startOver dialog')
    session.send(config.StartOver)
    session.replaceDialog('/');
}).triggerAction({ matches: 'startOver' });

bot.dialog('/', function (session) {
    client.trackTrace({
        time: new Date(),
        message: 'Enter Dialog',
        properties: {
            dialog: '/',
            step: 1,
        }
    })
    console.log('/ dialog')

    session.endDialog()
});

client.trackEvent({
    time: new Date(),
    name: 'Bot Setting Initialized'
})

function getId(list, field, response) {
    var res = list.filter(ele => ele[field + 'Name'] == response)[0]
    return res ? res[field + 'Id'] : -1
}


var restify = require('restify');
var server = restify.createServer();
var port = process.env.port || process.env.PORT || 3978;
server.listen(port, function () {
    client.trackEvent({
        time: new Date(),
        name: 'Server Running'
    })


    console.log('%s listening to %s', server.name, server.url);
});
server.post('/api/messages', connector.listen());
module.exports = { default: connector.listen() }
