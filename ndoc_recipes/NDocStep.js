/* eslint no-useless-constructor: 0 */
/* eslint no-empty-function: 0 */
/* eslint no-unused-vars: 0 */
// const DEBUG = true;

import {inspect} from 'util';
import NError from '../errors/NError.js';
import cloneDeep from 'lodash/cloneDeep.js';
import get from 'lodash/get.js';
import set from 'lodash/set.js';
import packageLogger from '../pkgLogger.js';

const log = packageLogger.subLogger('NDS');

// class actions can extend so we have a middleman available
export class NDocStep {
    constructor( args = {}) {
        /* args {
            mapping: structure that defines input argument transformation
                     e.g. patient output -> preadmissionPatient
                     when a generic step inputs to a specialized step or 
                     vice versa
            routine: routine to wrap, function, async function or async generator
        }
        */
        const {inputMapping, outputMapping, routine} = args;
        
        this.inputMapping = inputMapping;
        this.outputMapping = outputMapping;
        this.routine = routine;
        this.routineType = routine ? this.getRoutineType_sync({routine}) : null;
    }
    
    async execute({input}) {
        /* execute input:
            {
                input: routine input object
            }

            Note: This takes an object to allow other settings between control loop
            and recipe step.
        */
        // @@FUTURE: this is where we would copy input if we want it unmolested
        // possibly by step configuration.
        const args = input ;//this.applyInputMapping_sync(input);
        let output = null;
        if (this.routine) {
            const executeRoutineTypeFuncName = `execute${this.routineType}`;
            const routineExecutor = this[executeRoutineTypeFuncName];
            log.detail(`(nds39) execute ${inspect(
                {executeRoutineTypeFuncName, routineExecutor, args})}`);
            let answer = await routineExecutor.call(this, args);
            output = answer; // this.applyOutputMapping_sync(answer);
        } else {
            output = args; // this.applyOutpputMapping_sync(answer);
        }
        return output;
    }

    async executeFunction(input) {
        log.debug('(nds44)', JSON.stringify(input, null, 4));
        return this.routine(input);
    }

    async executeAsyncFunction(input) {
        return await this.routine(input);
    }

    async executeGeneratorFunction(input) {
        const events = [];
        for (let rv of this.routine(input)) {
            events.push(rv);
        }
        const answer = events[events.length-1];
        return {...answer, events};
    }

    async executeAsyncGeneratorFunction(input) {
        const events = [];
        for await (let rv of this.routine(input)) {
            events.push(rv);
        }
        const answer = events[events.length-1];
        return {...answer, events};
    }
    
    getRoutineType_sync({routine}) {
        let constructorName = routine.constructor.name;
        if ([
            'Function',
            'AsyncFunction',
            'GeneratorFunction',
            'AsyncGeneratorFunction'
        ].indexOf(constructorName) <0 ) {
            throw NError(`Unknown Routine Type: "${constructorName}"`, {
                type: 'typeError',
            });
        }
        return constructorName;
    }

    applyInputMapping_sync(args) {
        return applyMapping_sync({args, mapping: this.inputMapping});
    }

    applyOutputMapping_sync(args) {
        return applyMapping_sync({args, mapping: this.outputMapping});
    }

    applyMapping_sync(metaArgs) {
        /* metaArgs: {
            args: the full args object from or two job functions
            mapping: the mapping to use, {sourcekeyN:destkeyN}
        }
        */
        // NOTE: the source key location will not appear in the returned
        // object, the property is renames/moved to the destination location.
        const {mapping, args} = metaArgs;
        if (!mapping) {
            // @NOTE: Clone Deep
            return cloneDeep(args);
        }

        const outArgs = cloneDeep(args);
        const mapKeys = Object.keys(mapping);
        for (let argKey of mapKeys) {
            let destKey = mapping[argKey];
            if (outArgs[destKey]) {
                throw NError(`Cannot move ${key} to ${destKey}`, {
                    type: 'dataCollision',
                    status: 'partiallyProcessed',
                    args,
                    outArgs
                });
            }
            const argVal = get(args, argKey, undefined);
            // doing this makes this mapping a MOVE operation
            unset(outArgs, argKey);

            set(outArgs, destKey)
            // set at new location
        }
        return outArgs;
    }
    
}

export default NDocStep;