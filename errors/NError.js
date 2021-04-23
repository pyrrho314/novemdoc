import get from 'lodash/get.js';
import set from 'lodash/set.js';

export default class NError extends Error {
    constructor(message, props = {}) {
        super(message);
        this.props = props;
    }
    
    set(key, value) {
        return set(this.props, key, value);
    }

    get(key, value, def) {
        return get(this.props, key, value, def);
    }
}

 