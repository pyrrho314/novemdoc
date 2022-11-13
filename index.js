import NovemDoc from './novemdoc.js';
import ndocConfig, {loadConfig} from './config.js';
import DogLogger from './doglogger/doglogger.js';
import NDocRecipe from './ndoc_recipes/NDocRecipe.js';

import {prettyJson, shortJson} from './misc/pretty.js'

const RecipeEngine = NDocRecipe;

export {
    NovemDoc, DogLogger,
    ndocConfig, loadConfig,
    prettyJson, shortJson,
    RecipeEngine,
};
