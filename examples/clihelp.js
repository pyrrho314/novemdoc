// FRONT END version is different than backend, but similar
export function configureLogger(log, cliargs) {
    // SET DEBUG FLAGS RIGHT AWAY, EVEN BEFORE REQUIRING SOME THINGS
    console.log("(clih4) cliargs", JSON.stringify(cliargs, null, 4));
    if (cliargs.debug) {
        log.addDebug(cliargs.debug);
    }
    if (cliargs.d) {
        if (cliargs.debug) {
            console.log("Warning: don't use '-d' with '--debug', ignoring `-d`.")
        } else {
            log.addDebug("*,-socksjs-:*");
            console.log("(clih20) log",log.dbgFragments);
        }
    }

    // default when no quiet flag
    if (!cliargs.q) {
        // normal things turned on
        log.addDebug('*op:*,*info:*,*stats:*,*init:*');
    }
    log.addDebug(`*error:*`);

    if (!cliargs.expressVerbose) {
        log.addDebug('-express:router,-express:router:layer,-express:router:route');
        log.addDebug('-send, -body-parser:json');

    }

    console.log("clih27:", log.dbgFragments);
}

export function cliConvertValue(val, type) {
    // assumed val comes as string!
    let retVal = val;
    switch(type) {
        case "boolean":
            val = val.toLowerCase ? val.toLowerCase() : val;
            switch(val) {
                case "true":
                    retVal = true;
                    break;
                case "false":
                    retVal = false;
                    break;
                default:
                    retVal = false
            }
            break;
        case "number":
            retVal = Number(val);
            break;
    }
    return retVal;
}

export default {
    configureLogger,
    cliConvertValue,
};
