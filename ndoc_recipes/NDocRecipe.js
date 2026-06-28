import get from 'lodash/get.js';
// import {mongoActionKit as mAK} from './MongoActions.js'
import packageLogger from '../pkgLogger.js';
import cloneDeep from 'lodash/cloneDeep.js';
import {prettyJson, shortJson} from '../misc/pretty.js'

const log = packageLogger.subLogger('NDR');

const DEBUG = true;
     

const _ = {
    cloneDeep,
}
/* NDocRecipies class

    When instantiated lists of sequential operations can be specified to do
    database or other document processing.

*/

export class NDocRecipe {
    //version = "0.27" // version e.2
    constructor(opts) {
        if (DEBUG) {
            log.debug("creating NDocRecipe...");
        }
        const {cookBook} = opts;
        this.cookBook = cookBook ? cookBook : {};
        this.history = {
            triedRecipes: [],
            failedRecipes: [],
            successRecipes: [],
        }
    }

    clearRecipeHistory() {
        this.history = {
            triedRecipes: [],
            failedRecipes: [],
            successRecipes: [],
        };
    }

    /*@DEPRECATED: use executeRecipe instead
        This version uses recipes that are lists of NDocStep classes 
        which are instantiated with `new`. The executeRecipe version supports lists of routines (any type, sync, async, coroutine, async coroutine). This means the routines can be used directly as a function library.
    // Execute a named action
    // Note: has a different signature than DocStep's 'execute' function.
    */
    async execute(recipeName, doc) {
    // note: we expect DbDoc, could check and convert dict if it comes up
        this.history.triedRecipes.push(recipeName);
        let status = 'normal';
        let message = null;
        log.detail(`Executing '${recipeName}' on {${Object.keys(doc).join(', ')}}`);
        try {
            const actionList = get(this.cookBook, recipeName);
            log.debug('(ndr55) actionList', JSON.stringify(this.cookBook));
            if (!actionList) {
                this.history.failedRecipes.push(recipeName);
                return {
                    error: true,
                    status: 'error',
                    doc
                }
            }

            ///// Recipe Control Loop
            // loop over steps
            for (const actionIndex of Object.keys(actionList)) {
                const action = new actionList[actionIndex]();

                // EXECTUTE STEP
                let output = await action.execute({ doc, actionIndex });
                // STEP EXECUTED

                if (!output) output = { status: 'done' };
                if (output.status) status = output.status;
                if (output.message) message = output.message;
                doc = output.doc;
                if (status === 'error') {
                    console.log(`ERROR DocActions (DA49) in '${action.constructor.name}': ${message}`);
                    this.history.failedRecipes.push(`${recipeName}(${action.constructor.name})`);
                    break;
                }
            }
            this.history.successRecipes.push(recipeName);
        } catch (err) {
            console.error('DocAction execute ERROR:', err.message, err.stack);
            this.history.failedRecipes.push(recipeName);
            return { doc, status: 'error', error:true, message: err.message, stack: err.stack };
        }

        const retport = {
            doc,
            status: 'success',
            success: true,
            history: _.cloneDeep(this.history),
        };

        //@@IMPORTANT: This goes in cleanup or client functionality.
        // this.finish();
        return retport;
    }

    /* executeRecipe
        The execute function above is deprecated in favor of this model.
        We accept js objects with a recipeName and `input` object.
        The input is an orthogonal object with key names that convey dataType, and of which there can be only one entity, though the entity can be a list or object.
        The routines don't have to use NovemDoc or NDocStep, though
        they are wrapped by the latter for the recipe book. */    
    async executeRecipe(inputPackage) {
        const {recipeName, input: originalInput = {}} = inputPackage;
        this.history.triedRecipes.push(recipeName);
        let status = 'normal';
        let message = null;

        // recipe step do not have to clone objects, so they will be mutated
        const input = cloneDeep(originalInput);

        log.detail(`Executing '${recipeName}' on {${Object.keys(input).join(', ')}}`);
        try {
            const actionList = get(this.cookBook, recipeName);
            // log.debug('(ndr55) actionList', JSON.stringify(this.cookBook));
            if (!actionList) {
                this.history.failedRecipes.push(recipeName);
                return {
                    error: true,
                    type: 'notFound',
                    notFound: ['recipe'],
                    output: input,
                }
            }
            let throughput = input;
            ///// Recipe Control Loop
            // loop over steps
            for (const actionIndex of Object.keys(actionList)) {

                // this is in execute, where NDocStep subclasses are instantiated here
                // const action = new actionList[actionIndex]();

                const action = actionList[actionIndex];

                //////
                //
                // EXECTUTE STEP
                //
                // @NOTE: currently steps make shallow copies to allow shallow filtering
                // but are not expected to make a deepCopy, which is up to the control
                // loop.
                log.debug(`(NDR153) before step #${actionIndex} input:${JSON.stringify(throughput, null, 3)}`);
                throughput = await action.execute({ input:throughput});
                log.debug(`(NDR155) after step #${actionIndex} output:${JSON.stringify(throughput, null, 3)}`);
                //
                // STEP EXECUTED
                //
                //////
                const { status, error, message } = throughput;
                if (status === 'error') {
                    this.history.failedRecipes.push(recipeName);
                    console.error('(NDR167) error in step #${actionIndex}', message);
                }
            }
            this.history.successRecipes.push(recipeName);
            const { status, error, message } = throughput;
            const recipeReport = {
                status: status,
                success: !error,
                history: _.cloneDeep(this.history),
            };
            const output = cloneDeep(throughput);
            const retPackage = {
                input: originalInput,
                output,
                recipeReport
                //@@IMPORTANT: WHERE SHOULD THIS GO.
                // this.finish();
                
                // DON'T DO THIS HERE!, we use use this to know which cleanup to do
                // Therefore, let the client drive the reset cycle:
                //      this.clearRecipeHistory();
            }
            return retPackage;
        } catch (err) {
            log.error('(186) ERROR in executeRecipe:', err.message, err.stack);
            this.history.failedRecipes.push(recipeName);
            // forward error
            throw err;
        }
    }

    async finish(report = {}) {
    // Called by client to tell DocAction to shut down, nec to close mongo connection.
    // 'cleanup' is a special action that can be used singly to cleanup
    // but also is an action, so the connection could be closed at the end of a recipe.
        let oneSuccess = false;
        let oneError   = false;

        try {
            const cleanupRecipes = this.history.triedRecipes.reduce( (ac, key) => {
                // @TODO: this is b/c of cleanup getting in the recipe list, maybe
                // shouldn't be there in the first place.
                if (key.indexOf("cleanup")>=0) return ac

                const keyparts = key.split('.');
                const scope = keyparts[0];
                const cleanupName = `${scope}.cleanup`;
                ac[cleanupName] = true;
                log.debug(`cleanupRecipe (119): ${cleanupName} from ${key}`);
                return ac;
            }, {});
            let reports = [];
            report.cleanupReports = reports;
            for (const cleanupKey in cleanupRecipes) {
                const cleanupRecipe = cleanupRecipes[cleanupKey] ? cleanupKey : null;
                log.debug("cleanupRecipe", cleanupRecipe);

                if (!cleanupRecipe) continue;

                const oneReport = await this.execute(cleanupRecipe, {});
                let report = null;
                if (oneReport.error) {
                    oneError = true;
                    report = {
                        status: "error",
                        error:true,
                        message: `Problem with cleanup ${cleanupKey}`,
                    }
                } else {
                    oneSuccess = true;
                    report = oneReport.doc.dataCopy();
                }
                log.debug(`(135) report: ${prettyJson(report)}`);
                reports.push(report);
            }
        } catch (err) {
            console.log('DocAction.finish ERROR:', err.message, err.stack);
            throw err;
        }
        // clear history
        this.clearRecipeHistory();
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
