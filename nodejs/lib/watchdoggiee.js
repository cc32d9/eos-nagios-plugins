/*
 * Created by github@orange1337
 */

const http = require("http");
const https = require("https");
const eosjs = require("eosjs");

const contract = "watchdoggiee";

let customFunctions = {};

process.on('uncaughtException', (err) => {
    console.error(`======= UncaughtException:  ${err}`);
});


customFunctions.check_eos_watchdoggiee = (options, callback) => {    
    let submitapi = new eosjs({
        chainId: options.chain,
        httpEndpoint: options.urlSubmit,
        keyProvider: options.privKey,
        expireInSeconds: 30,
        broadcast: true,
        debug: false,
        sign: true
    });

    let queryapi = new eosjs({
        chainId: options.chain,
        httpEndpoint: options.urlQuery,
        expireInSeconds: 30,
        debug: false
    });
    
    let timeStart = +new Date();
    let now = new Date(); 
    let nowUTC  = +new Date(now.getUTCFullYear(), now.getUTCMonth(),
                            now.getUTCDate(),  now.getUTCHours(),
                            now.getUTCMinutes(), now.getUTCSeconds(), now.getMilliseconds());

    submitapi.contract(contract).then(myaccount => {
        myaccount.setkv( options.account, options.kvKey, nowUTC, 
                         { authorization: `${options.account}@watchdog`,
                           broadcast: true,
                           sign: true
                         }, 
                         (err, result) => {
                             if (err){
                                 return callback(2, 'CRITICICAL - ' + err);
                             }
                             let timeMAX = +new Date() + (options.crit*2) * 1000;
                             checkReqTime(timeMAX, callback);        
                         });
    });

    function checkReqTime(timeMAX, callback){
        queryapi.getTableRows({
            json: true,
            code: contract,
            scope: options.account,
            table: "kvs",
            table_key: "i64",
            lower_bound: options.kvKey,
            limit: 1
        }).then(
            result => {
                if (result && result.rows) {
                    let submitdiff = null;
                    let now = +new Date();
                    let querydiff = (now - timeStart)/1000.0;
                    result.rows.forEach(elem => {
                        if (elem.key == options.kvKey && elem.val == nowUTC) {
                            submitdiff = (+new Date(elem.ts) - Number(elem.val)) / 1000.0;
                        }
                    });
                    if (submitdiff) {
                        let status = 'OK';
                        let exitcode = 0;
                        if (submitdiff > options.crit || querydiff > options.crit ) {
                            status = 'CRITICAL';
                            exitcode = 2;
                        }
                        else if (submitdiff > options.warn || querydiff > options.warn ) {
                            status = 'WARNING';
                            exitcode = 1;
                        }

                        return callback
                        (exitcode,
                         `REQTIME ${status} - ${submitdiff}s submit, ${querydiff}s query|diff_submit=${submitdiff} diff_query=${querydiff}\n`);
                    }
                    else if ( now > timeMAX ){
                        return callback(2, `REQTIME CRITICAL - no update received after ${timeMAX}s`);
                    }
                    else {
                        setTimeout(function() {checkReqTime(timeMAX, callback)}, 200);
                    }
                }
                else {
                    return callback(2, `CRITICAL - table not found`);
                }
            })
            .catch(err => {
                return callback(2, `CRITICAL - ` + err);
            });     
    }
};

module.exports = customFunctions;
