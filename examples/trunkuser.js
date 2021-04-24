#!/usr/bin/env node

/**
    @name trunkuserjs
    @module trunkuser.js

    This is a script to control user documents (accounts) for testing and
    utility use.
*/

import defaultsDeep from 'lodash/defaultsDeep.js';
import bcrypt from 'bcryptjs';
import yargs from 'yargs';
import path from 'path';
import inquirer from 'inquirer';
import moment from 'moment';
import dotenv from 'dotenv';
import {NovemDoc, DogLogger, ndocConfig, loadConfig} from '../novemdoc';
import {cliConvertValue} from './util/clihelp.js';
import {prettyJson, shortJson} from '../misc/pretty.js';
import {TrunkUser} from './classes/TrunkUser.js';
// @@HISTORY this is all in trunkUser now, except for mongoFinish
// import {
//     mongoDelete,
//     mongoSave, mongoQuery, mongoFinish,
//     decomposeQueryAnswer, decomposeSingleAnswer,
// } from '@novem/novemdoc/ndoc_recipes/mongo_recipes/mongoFunctions.js';
import {mongoFinish} from '../ndoc_recipes/mongo_recipes/mongoFunctions.js';
import { fileURLToPath } from 'url';
import pkglog from '../pkgLogger.js';
//
//  imports done
////

const DEBUG = true;
const LOGGING = true;
const log = pkglog.subLogger('tu');
if (LOGGING) {
    log.addDebug(
        "*",
        "-*:answer",
        //"-*:debug",
        //"-*detail",
        "-*:op",
        "-*:query",
    );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.normalize(path.join(__dirname,'../.env'));

dotenv.config({path: envPath});

// NOTE:  .env path is relative to parent
if (DEBUG) log.debug("tu42:",envPath);
const ndoc_config = process.env.NOVEMDOC_CONFIG
    ? process.env.NOVEMDOC_CONFIG
    : '../local.novemdoc.config.js';

const novemDocConfigPath
    = path.normalize(path.join(__dirname, '..', process.env.NOVEMDOC_CONFIG));

// THIS will show up on autocomplete log.info(`NOVEMDOC_CONFIG=${novemDocConfigPath}`);

loadConfig(novemDocConfigPath);

(async () => {
    // @@REFACTOR:  drive this with command argument eventually
    //log.addDebug("*");

    const blankUser = await TrunkUser.loadBlank();
    const legitRoles = Object.keys(blankUser.get('roles'))
    //const roles = ['anon', 'leadManager', 'admin'];
    // // //
    // Some functions to help with command line parsing (configging yargs)

    /**
     *   This function adds user query-related suboptions to commands.
     *   @param {Object} yargs object to add options to.
     *   @returns {Object} the yargs object with query options added.
     */
    function addQueryOptions(yargs){
        return yargs.option('handle', {
            describe: "unique user handle to search for",
        })
        .option('_id', {
            alias:"id",
            describe: "User's Id"
        })
        .option('allprops', {
            type:'boolean',
            describe: "will show all properties of user record",
            default: false,
        })
        .alias('allprops', 'A')
        .option('handle', {
                describe: "<REGEX> Unique user handle, restricted, letters and numbers only",
            })
        //.demandOption(['handle'])
        .option('email', {
            describe: "user's email"
        })
        .option('displayName', {
            describe: "user's pretty name (can have spaces and the like)"
        })
        .option('theme', {
            describe: "the users preferred theme",
        })
        .option('role', {
            type: 'array',
            describe: "make the user an admin",
            choices: legitRoles,
        });
    }

    function makeQueryFromOptions(options) {
        // creates a mongo query from cli options
        let query  = {};
            // get query opts

        for (let opkey of ['handle', 'email', 'displayName']) {
            const val = options[opkey];
            // static member to us dot notation keys.
            // @@WARN: moving display Name, needs special handling
            NovemDoc.setprop(`${opkey}.$regex`, val, query);
        }
        // apply roles if role option exists, otherwise keep query=query
        query = options.role ? options.role.reduce( (ac, role) => {
            TrunkUser.setprop(`roles.${role}`, true, ac);
            return ac;
        }, query) : query;
        log.debug(`makeQueryFromOpts query: ----\n${JSON.stringify(query, null, 4)}\n----`);
        return query;
    }

    // START COMMAND LINE PROCESSING

    const cliopts = yargs.version('e.1.')
    .usage(`The '$0' command is used to manmipulate user records.`)
    .command('add', 'Add trunk user', function (yargs){
        // SUBOPTIONS for 'add' command
        return yargs.option('handle', {
                describe: "unique user handle, restricted, letters and numbers only",
            })
            //.demandOption(['handle'])
            .option('email', {
                describe: "User's Email"
            })
            .option('displayName', {
                describe: "User's Pretty Name (can have spaces and the like)"
            })
            .option('theme', {
                describe: "the users preferred theme",
                default: "neutral",
            })
            .option('role', {
                describe: "give the user roles",
                choices: legitRoles,
            })
            .array('role')
    })
    .command('list', 'List trunk users', addQueryOptions)
    .command('delete', "Delete trunk user(s) from the user collection.", addQueryOptions)
    .command('login', "Test Login as User", function (yargs) {
        return yargs.positional('user', {
            describe: 'Identifies the user, either the handle or email',
        })
    })
    .command('set', 'Set a user property', function (yargs) {
        yargs = addQueryOptions(yargs);
        return yargs.option('type', {
            describe: "Set the type of value to set",
        })
        .option('dry', {
            describe: "Don't change records in database, just diplay"
        });
    })
    .completion()
    .help()
    .alias('h','help')
    .showHelpOnFail(true)
    .demandCommand(1, '')
    .parse();
    //
    // log.info(`tu76: cliopts ${JSON.stringify(cliopts, null, 4)}`);
    const command = cliopts._[0];

    const TEST_DATA=true;

    ( async () => {
        switch (command) {
            case 'add':
                await addUser(cliopts);
                break;
            case 'list':
                await listUsers(cliopts);
                break;
            case 'delete':
                await deleteUsers(cliopts);
                break;
            case 'login':
                await loginUser(cliopts);
                break;
            case 'set':
                await setUserProperty(cliopts);
                break;
        }

        await mongoFinish();

        // ---- end of script ----- //

        // FUNCTIONS
        // addUser: interactively adds a user if opt not on command line
        async function addUser(options) {
            let {role, handle, email, displayName, theme} = options;
            let done = false;
            let answers;

            const trunkUser = await TrunkUser.loadBlank();
            if (DEBUG) log.info("tu153: Trunk User", trunkUser.json(true));
            // use blank roles as limiting possible roles
            while (!done) {
                let questions = [];
                if (!role) {
                    questions.push({
                        type: 'input',
                        name: 'role',
                        message: `User role (${legitRoles.join(", ")}):`,
                        default: 'anon',
                        choices: legitRoles,
                        validate: (value) => {
                            const roles = value.split(/\s*[\s,]\s*/);
                            let badRoles = []
                            let valid = true;

                            // @@NOTE: interesting but here when "var" was not present
                            // because it overwrote the "role" from the closure
                            // which probably means the closures name should be more
                            // specific or left in objects.

                            for (var role of roles) {
                                if (legitRoles.indexOf(role) < 0) {
                                    badRoles.push(role);
                                    valid = false;
                                }
                            }
                            if (!valid) console.log(`\nIllegal Roles: ${badRoles.join(", ")}`);
                            return valid;
                        }
                    });
                }
                if (!handle) {
                    questions.push({
                        type: 'input',
                        name: 'handle',
                        message: 'Enter Unique User Handle:',
                        default: TEST_DATA ? "pyrrho" : null,
                        validate: async (value) => {
                            try {
                                const valid = value.match(/^[a-zA-Z0-9]+$/) ? true : false;
                                if (!valid) console.log('\nletters and numbers ONLY');

                                const extantUser = await TrunkUser.findByHandle(value);

                                log.info("HANDLE CHECK",extantUser);

                                if (extantUser) {
                                    log.error(log.clr.warn(`User with handle '${extantUser.get('handle')}' already exists, change handle.`));

                                    return false;
                                }

                                return valid;
                            } catch (e) {
                                log.error(`Error: Message: ${e.message} ${e.stack}`
                                );
                            }
                        }
                    });
                }
                if (!email) {
                    questions.push({
                        type: 'input',
                        name: 'email',
                        message: 'Enter User Email:',
                        default: TEST_DATA ? "pyrrho@novem.technology" : null,
                        validate: (email) => {
                            const {valid, reason} = isValidEmail(email);
                            if (!valid) console.log(`\nInvalid Email: ${valid} ${reason}`);
                            return valid;
                        }
                    });
                }
                if (!displayName) {
                    questions.push({
                        type: 'input',
                        name: 'displayName',
                        message: 'Enter User Display Name:',
                        default: TEST_DATA ? "Pyrrho Of Oakland" : null,
                        validate: (value) => {
                            return value.length > 0;
                        }
                    });
                }

                if (questions.length) {
                    answers = await inquirer.prompt(questions);
                    log.dump('answers', answers);
                }

                const {confirmed} = await inquirer.prompt([{
                    name: "confirmed",
                    type: "confirm",
                    default: true,
                }]);
                done = confirmed;
            }

            let needPassword = true;
            let passhash = null;
            while(needPassword) {
                // scope these passwords only where entered
                let finalPass = null;
                let pass = null;
                let repeatPass = null;
                const pw = await inquirer.prompt([
                    {
                        type: 'password',
                        message: "Enter Password for User:",
                        name: 'password',
                        mask: "+",
                    },
                    {
                        type: 'password',
                        message: "Repeat Password:",
                        name: 'repeatPassword',
                        mask: "+",
                    }
                ]);
                // ask for password
                pass = pw.password;
                repeatPass = pw.repeatPassword;
                if (pass != repeatPass) {
                    log.error("Passwords don't match. Repeat.");
                } else {
                    needPassword = false;
                    finalPass = pass;
                    // pass is password in plain, creat hash
                    passhash = await TrunkUser.createPasshash(finalPass, 8);
                }

            }

            // compose arguments with answers
            const settings = defaultsDeep(
                {handle, email, displayName, theme, role},
                answers
                );
            log.detail("tu307: Settings", JSON.stringify(settings, null, 4));

            // @@REFACTOR?: function that turns array of roles into true properties
            const roles = settings.role.split(/\s*[\s,]\s*/).reduce((ac, item) => {
                if (legitRoles.indexOf(item)>=0) {
                    ac[item] = true;
                }
                return ac;
            },{})

            // `settings` is ready with cli opts and inquired values
            // apply answers to blankUser documents
            trunkUser.set('handle', settings.handle);
            trunkUser.set('email', settings.email);
            trunkUser.set('public.displayName', settings.displayName);
            trunkUser.set('settings.theme', settings.theme);
            // note, roles is a hash, but in places a handled as list of strings
            trunkUser.set('roles', roles);
            // add the password hash.
            trunkUser.set('secret.passhash', passhash);
            trunkUser.set('stats.created', moment().format());

            const answer = await trunkUser.save();

            log.info(`Saved User ${trunkUser.handle} "${trunkUser.displayName}"    (tu383)`);
        }

        async function deleteUsers(options) {
            let report;
            const users = await listUsers(options);
            //log.debug(`options to deleteUsers ${JSON.stringify(options)}`);
            if (users.length > 0) {
                const response = await inquirer.prompt(
                    [
                        {
                            name: "confirmed",
                            message: log.clr.alert("Delete all these users, PERMANANTLY!?"),
                            type: "confirm",
                            default: false,
                        }
                    ]
                );
                log.dump("confirmed", response, log.debug);
                if (response.confirmed) {
                    const query = makeQueryFromOptions(options)
                    // report = await mongoDelete({
                    //     queryName:'deleteTrunkUser',
                    //     collection: "trunkUser",
                    //     query
                    //
                    // });
                    report = await TrunkUser.deleteUsers(query);
                    const numdel = report.doc.get('deleteResult.deletedCount', 0);
                    log.detail(`Deleted ${numdel} users.  (tu412)`);
                }
            }

            return report;
        }

        function displayUsers(users) {
            const topline  = '<flatcon>+'.repeat(39)+'<flatcon>';
            users.forEach( (item, index ) => displayUser(item, index, topline));
            log.info(topline);
        }

        function displayUser(item, index, topline) {
                if (!topline) topline = '<flatcon>'.repeat(80);
                const roleNames =  item.roleList.join(', ');
                log.info(
`${topline}
${log.clr.dim("#"+(index+1))} ${log.clr.bright(item.handle)} roles: ${roleNames} "${item.displayName}"
Email: ${log.clr.ok(item.email)} id = ${log.clr.dim(item._id)}
Logged in ${log.clr.info(item.numLogins + ' times')} lastAuth on ${log.clr.info(item.get('stats.lastAuth'))}
Created: ${log.clr.info(item.get('stats.created'))}`);
}

        async function listUsers(options) {
            try {
                log.dump("listUsers options:", options, log.debug);
                const query = makeQueryFromOptions(options);
                log.dump("listUsers query:", query, log.debug);
                // const users = await TrunkUser.allUsers();
                // const answer = await mongoQuery({
                //     queryName: "userQuery",
                //     collection: "trunkUser",
                //     query,
                // });
                //
                // const { doc: answerDoc} = answer;
                // const users = await decomposeQueryAnswer(answerDoc, TrunkUser);

                const users = await TrunkUser.findUsers(query);

                if (users.length > 0) {
                    // const userdicts = users.reduce( (ac, item) => {
                    //     const {_id, roles, handle, displayName, email, stats} = item.data;
                    //     const pitem = {_id, roles, handle, displayName, email, stats};
                    //     if (options.allprops) {
                    //         ac.push(item.dict);
                    //     } else{
                    //         ac.push(pitem);
                    //     }
                    //     return ac
                    // }, []);
                    // log.table({text:"User Table (tu439)", rows: userdicts});
                    displayUsers(users);

                } else {
                    log.info(log.clr.ok("(tu409) No Users Match Criteria"));
                }
                return users;
            } catch (err) {
                log.error("Error in listUsers:", err.message, err.stack)
                return null;
            }
        }

        async function loginUser(options) {
            log.dump("login options", options);

            const response = await inquirer.prompt(
                [
                    {
                        name: "password",
                        message: log.clr.ok("Enter Password"),
                        type: "password",
                        mask:'+',
                    }
                ]
            );
            log.debug('tu374 response:',response);
            const loginResult = await TrunkUser.checkPassword(options._[1], response.password);
            const {user} = loginResult;

            if (!user) {
                log.dump(log.clr.alert('LOGIN FAILED'), loginResult);
                return ;
            }

            log.banner({
                title: "hello",
                text: `${log.clr.ok('Login Succeeded:')}\n${log.clr.dim(user.json(true))}`,
            });
        }

        async function setUserProperty(options) {
            // @@TODO add confirmation prompt
            const query = makeQueryFromOptions(options);
            const users = await TrunkUser.findUsers(query);

            log.debug(`setUserProperty(${JSON.stringify(options, null, 2)})`);

            const [cmd, key, rawval] = options._;

            log.debug(`setting user property ${key}=${rawval}`);

            const type = options.type;
            const useval = cliConvertValue(rawval, type);

            for (let user of users) {
                user.set(key, useval);
                log.debug(`val = ${JSON.stringify(useval)} (${typeof(useval)})`);
                log.debug(`${user.json(true)}`);
                if (!options.dry) {
                    const {confirmed} = await inquirer.prompt([{
                        name: "confirmed",
                        type: "confirm",
                        default: true,
                    }]);
                    if (confirmed) {
                        user.mongoSave();
                    }
                }
            }


        };
    })();

    function isValidEmail (email) {
        const tester = /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
        if (!email) return {
            valid: false,
            reason: "No Email Provided",
        };

        if (email.length > 256) return {
            valid: false,
            reason: "Email Too Long",
        };

        if (!tester.test(email)) return {
            valid: false,
            reason: "Not a validly Formatted Email",
        };

        // Further checking of some things regex can't handle
        var [account, address] = email.split('@');
        if (account.length > 64) return {
            valid: false,
            reason: "Not a validly Formatted Email",
        };

        var domainParts = address.split('.');
        if (domainParts.some(function (part) {
        return part.length > 63;
        })) return {
            valid: false,
            reason: "Not a validly Formatted Email",
        };
        return {
            valid: true,
            reason: "Good Enough Email"
        };

    }
})();
