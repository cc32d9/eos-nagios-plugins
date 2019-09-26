/*
 * Created by github@orange1337
 */

const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('util');

const contract = "watchdoggiee";

let customFunctions = {};

process.on('uncaughtException', (err) => {
    console.error(`======= UncaughtException:  ${err}`);
});


customFunctions.check_eos_watchdoggiee = (options, callback) => {
    const sigProvider = new JsSignatureProvider([options.privKey]);
    const rpcSubmit = new JsonRpc(options.urlSubmit, { fetch });
    const apiSubmit = new Api({rpc: rpcSubmit, signatureProvider: sigProvider,
                               textDecoder: new TextDecoder(), textEncoder: new TextEncoder()});

    const rpcQuery = new JsonRpc(options.urlQuery, { fetch });
    
    let timeStart = +new Date();
    let now = new Date(); 
    let nowUTC  = +new Date(now.getUTCFullYear(), now.getUTCMonth(),
                            now.getUTCDate(),  now.getUTCHours(),
                            now.getUTCMinutes(), now.getUTCSeconds(), now.getMilliseconds());

    setTimeout(
        () => { callback(1, 'WARNING - Timeout'); },
        (options.crit*3) * 1000,
    );
    
    (async () => {
        try {
            const result = await apiSubmit.transact({
                actions: [{
                    account: contract,
                    name: 'setkv',
                    authorization: [{
                        actor: options.account,
                        permission: 'watchdog',
                    }],
                    data: {
                        owner: options.account,
                        key: options.kvKey,
                        val: nowUTC,
                    },
                }]
            },{
                blocksBehind: 3,
                expireSeconds: 30,
            });

            let timeMAX = +new Date() + (options.crit*2) * 1000;
            checkReqTime(timeMAX, callback);
        } catch (e) {
            return callback(1, 'WARNING - Exception: ' + e);
        }
    })();

    
    function checkReqTime(timeMAX, callback){
        rpcQuery.get_table_rows({
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
                        let intvl = (now - timeMAX)/1000.0;
                        return callback(2, `REQTIME CRITICAL - no update received from ${options.urlQuery} after ${intvl}s`);
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
                return callback(1, `WARNING - ` + err);
            });     
    }
};

module.exports = customFunctions;
