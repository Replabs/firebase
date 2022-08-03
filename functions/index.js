const loadFunctions = require("./load");

/**
 * Automatically loads all `*.f.js` files in all directories.
 */
loadFunctions(__dirname, exports);
