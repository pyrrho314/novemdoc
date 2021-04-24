import bcrypt from 'bcryptjs';
import csprng from 'csprng';
import _ from 'lodash';
import momentLocal from 'moment';

import {NovemDoc, DogLogger,
        prettyJson, shortJson,
    } from '../../index.js';
import {NDocRecipe} from '../../ndoc_recipes/NDocRecipe.js';
import {mongoRecipeChapter} from '../../ndoc_recipes/mongo_recipes/mongoSteps.js';
import {
    mongoDelete,
    mongoSave, mongoQuery, mongoFinish,
    decomposeQueryAnswer, decomposeSingleAnswer,
} from '../../ndoc_recipes/mongo_recipes/mongoFunctions.js';

// import {masterSchemaReference as mSR} from '../dotschemaTools/SchemaReference.js';
import pkgLogger from '../../pkgLogger.js';

const moment = momentLocal.utc;
const log = pkgLogger.subLogger("TU");

const DEBUG = true;

/*
    This type of object further specializes the interface for the type
    of Novemdoc.  The model is, generally, to create properties to interface
    with the underlying dict/data, allowing the object to appear like a regular
    object for use internally, but still ready to store, etc. E.g. a date
    property can read from the data/dict, create a property with a runtime
    datetime object, and reflect any changes to the underlying dict/data so
    it's ready to serialize.
*/
export class TrunkUser extends NovemDoc {
    constructor(...args) {
        super(...args);
        const dtype = this.doctype;
        this.doctype = 'trunkUser'
        // log.debug("TrunkUser consstryctir")
    }

    // in case the object changes
    static modelDoctype = 'trunkUser';

    // doc properties poxied with object properties

    // readonly
    get _id() {
        return this.get('_id');
    }

    get displayName() { return this.get('public.displayName');}

    get email() { return this.get('email'); }

    set email(val) { return this.set('email', val); }

    // readonly
    get handle() { return this.get('handle');}

    get numLogins() { return this.get('stats.numLogins', 0); }

    get roles() {
        const stackE = new Error();
        console.log("DEPRECATED (TU64): calling roles getter", log.clr.dim(stackE.stack));
        return this.get('roles', {});
    }

    get roleList() {
        const roles = this.get('roles', {});

        return Object.keys(roles);
    }

    get settings() { return this.get('settings', {theme:'default'}); }

    get sessionToken() { return this.get('session.token'); }

    get theme() { return this.get('settings.theme', 'default');}



    static async loadBlank() {
        const blankDict = await mSR.loadBlank('trunk/trunkUser');
        // log.debug("blank",blankDict);
        const nd = new TrunkUser({
            doctype: "trunkUser",
            dict: blankDict,
        });
        return nd;
    }

    /*
        User Login Related
    */
    static async createPasshash(password) {
        const passhash = await bcrypt.hash(password, 8);
        return passhash;
    }

    static async checkPassword(username, pass) {
        // username can be either  email or handle
        const query = {
            "$or": [
            {"handle": username},
            {"email": username}
            ],
        };

        const users = await this.findUsers(query);
        // if (DEBUG) log.debug(`TU48: checkPassword, found ${users.length} users`);
        if (users.length == 0) {
            return {
                verified: false,
                status: "failed",
                reason: "no such user"
            }
        }
        // we have a user, if multiple (can be multiple users with same
        // email), choose first.
        // if (DEBUG) log.debug(`TU59 users[0]: ${JSON.stringify(users[0].dict, null, 4)}`);
        const user = users[0];
        const passhash = user.get("secret.passhash", "bad_secret");
        const correctPass = await bcrypt.compare(pass, passhash);
        if (correctPass) {
            const numlogins = user.get("stats.numLogin", 0);
            user.set('stats.numLogins', numlogins+1);
            user.set('stats.lastAuth', moment().format());
            const answer = await user.save();
            return  {
                verified: true,
                status: "logged_in",
                user: user,
            }
        } else {
            return {
                verified: false,
                status: "failed",
                reason: "bad_auth",
            }
        }
    }

    /* Specialized Access
    */

    static async allUsers() {
        const results = await this.findUsers();

        return results;
    }


    static async deleteUsers(query={}) {
        log.dump('deleteUsers opts', query);
        const report = await mongoDelete({
            queryName:'deleteTrunkUser',
            collection: "trunkUser",
            query

        });
        return report;
    }

    static async findByHandle(username) {
        // username can be either  email or handle
        const query = {
            "$or": [
            {"handle": username},
            {"email": username}
            ],
        };

        const users = await this.findUsers(query);
        // if (DEBUG) log.debug(`TU48: checkPassword, found ${users.length} users`);
        if (users.length == 0) {
            return null;
        }
        // we have a user, if multiple (can be multiple users with same
        // email), choose first.
        // if (DEBUG) log.debug(`TU59 users[0]: ${JSON.stringify(users[0].dict, null, 4)}`);
        const user = users[0];
        return user;
    }

    static async findUsers(query={}) {
        // this is mongoSpecific
        // see schema below for query parts
        log.debug(`(198) findUsers query ${prettyJson(query)}`);
        const answer = await mongoQuery({
            queryName: "trunkUserQuery",
            collection: "trunkUser",
            query,
        });

        const { doc: answerDoc} = answer;
        const users = await decomposeQueryAnswer(answerDoc, TrunkUser);
        return  users;
    }

    // REGULAR MEMBERS

    async save() {
        const answer = await mongoSave({doc:this});
        log.debug(`save answer: ${prettyJson(answer)}`)
        return answer;
    }

    hasRole(roleName) {
        return (this.roles[roleName] || this.roles.admin);
    }
}


// The session is what gets sent to the Front End. We don't copy from
// the BackEnd user object liberally, just specifically.
export class UserSession extends NovemDoc {
    /* userSession
        {
            token,
            userInfo: {
                handle: user.handle,
                roles: user.roles,
                theme: user.theme,
            }
        }
    */
    // these are kept as NovemDoc instances
    static session_store = {};
    static user_store = {};

    static modelDoctype = 'trunkUserSession';

    constructor(...args) {
        super(...args);
        // log.debug("TrunkUser consstryctir")
    }

    get handle() {
        return this.get("userInfo.handle");
    }

    get token() {
        return this.get('token');
    }

    get loggedIn() {
        return this.get('loggedIn');
    }
    set loggedIn(val) {
        this.set('loggedIn', val);
        return val;
    }

    static async createSession(user) {
        user = TrunkUser.from_thing(user);
        const token = csprng(256,36);
        const isoNow = moment().toISOString();
        const session = this.from_dict({
            token,
            loggedIn: true,
            created: isoNow,
            accessed: isoNow,
            userInfo: {
                handle: user.handle,
                roles: user.roles, //@@REFACTOR? should be copy?
                theme: user.theme, //@@REFACTOR? should be copy?
            }
        });
        // note, user.sessionToken is a getter that pulls from
        // 'user.session.token' so we put it there.

        user.set("session.token", session.token);

        this.user_store[user.handle] = user;
        this.session_store[session.token] = session;

        return session;
    }

    static async deleteSession(token) {
        // @@TODO @@DATA save deleted sessions?
        const sessionExists = this.session_store[token] ? true: false;

        if (sessionExists) delete this.session_store[token];

        return sessionExists;
    }

    static async getSession(token) {
        let user = null;
        log.debug(`getSession230: ${token} from ${Object.keys(this.session_store).length}`);
        log.debug(`${Object.keys(this.session_store).join("\n")}`);
        const session = this.session_store[token];
        log.debug(`session is "${typeof(session)}"`)
        if (session) {
            user = this.user_store[session.handle];
            session.accessed = moment().toISOString();
        }
        // log.debug("getSession:", session.json(true), user.json(true));
        return {session,user};
    }
}

export default {
    TrunkUser,
    UserSession,
};

/* User schema
For up to date schema, perhaps check:
    * schemaLibrary/dotschema/trunk/trunkUser.ds
ds:
trunkUser.id                    string
trunkUser.handle                string
trunkUser.email                 string
trunkUser.secret.passhash       string
trunkUser.session.token         string
trunkUser.public.displayName    string
trunkUser.settings.theme        neutral
trunkUser.stats.numLogins       0
trunkUser.roles.admin           false
trunkUser.roles.anon            false
trunkUser.roles.public          false
trunkUser.roles.dataworker      false

*/
