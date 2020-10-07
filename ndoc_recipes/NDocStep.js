/* eslint no-useless-constructor: 0 */
/* eslint no-empty-function: 0 */
/* eslint no-unused-vars: 0 */
// const DEBUG = true;

// class actions can extend so we have a middleman available
export class NDocStep{
    constructor() {
    }

    // it's middleware, return the inputDoc normally, input is transformed
    async execute(opts) {
    }
}

export default NDocStep;
