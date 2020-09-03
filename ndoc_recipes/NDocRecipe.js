import get from 'lodash/get.js';
// import {mongoActionKit as mAK} from './MongoActions.js'
import packageLogger from '../pkgLogger.js';
const log = packageLogger.subLogger('NDR');

const DEBUG = true;

/* NDocRecipies class

    When instantiated lists of sequential operations can be specified to do
    database or other document processing.

*/

export class NDocRecipe {
    //version = "0.27" // version e.2
    constructor(opts) {
        if (DEBUG) log.debug("creating NDocRecipe...");
        const {cookBook} = opts;
        this.cookBook = cookBook ? cookBook : {};
        this.history = {
            triedRecipes: [],
            failedRecipes: [],
            successRecipes: [],
        }
    }

    // Execute a named action
    // Note: has a different signature than DocStep's 'execute' function.
    async execute(recipeName, doc) {
    // note: we expect DbDoc, could check and convert dict if it comes up
        this.history.triedRecipes.push(recipeName);
        let status = 'normal';
        let message = null;
        try {
            const actionList = get(this.cookBook, recipeName);
            if (!actionList) {
                this.history.failedRecipes.push(recipeName);
                return {
                    error: true,
                    status: 'error',
                    doc
                }
            }

            // loop over actions
            for (const actionIndex of Object.keys(actionList)) {
                const action = new actionList[actionIndex]();
                let output = await action.execute({ doc, actionIndex });
                if (!output) output = { status: 'done' };
                if (output.status) status = output.status;
                if (output.message) message = output.message;
                doc = output.doc;
                if (status === 'error') {
                    console.log(`ERROR DocActions (DA49) in '${action.constructor.name}': ${message}`);
                    break;
                }
            }
            this.history.successRecipes.push(recipeName);
        } catch (err) {
            if (DEBUG) console.log('DocAction execute ERROR:', err.message, err.stack);
            this.history.failedRecipes.push(recipeName);
            return { doc, status: 'error' };
        }
        return { doc };
    }

    async finish(report = {}) {
    // Called by client to tell DocAciton to shut down, nec to close mongo connection.
    // 'cleanup' is a special action that can be used singly to cleanup
    // but also is an action, so the connection could be closed at the end of a recipe.
        let oneSuccess = false;
        let oneError   = false;

        try {
            const cleanupRecipes = this.history.triedRecipes.reduce( (ac, key) => {
                const keyparts = key.split('.');
                const scope = keyparts[0];
                const cleanupName = `${scope}.cleanup`;
                ac[cleanupName] = true;
                return ac;
            }, {});
            let reports = [];
            report.cleanupReports = reports;
            for (const cleanupKey in cleanupRecipes) {
                    const cleanupRecipe = cleanupRecipes[cleanupKey] ? cleanupKey : null;
                    log.info("cleanupRecipe", cleanupRecipe);

                    if (!cleanupRecipe) continue;

                    const oneReport = await this.execute(cleanupRecipe, {});
                    if (oneReport.error) {
                        oneError = true;
                    } else {
                        oneSuccess = true;
                    }
                    reports.push(oneReport);
            }
        } catch (err) {
            console.log('DocAction.finish ERROR:', err.message, err.stack);
            throw err;
        }
        this.history = {
            triedRecipes: [],
            failedRecipes: [],
            successRecipes: [],
        };
        let status = oneSuccess && oneError ? "mixed" : null;
        if (!status) status = oneSuccess ? "success" : null;
        if (!status) status = oneError ? "error":  "none";
        return {
            status,
            error: status === "error",
            success: status === "success",
            mixed: status === "mixed",
            message: `Status is ${status}`,
            report,
        };
    }
}

export default NDocRecipe;
