// Taken from firebase-function-tools

"use strict";

exports.__esModule = true;

var _path = require("path");

var _glob = require("glob");

var _glob2 = _interopRequireDefault(_glob);

var _camelcase = require("camelcase");

var _camelcase2 = _interopRequireDefault(_camelcase);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

/**  EXPORT ALL FUNCTIONS
 *
 *   Loads all files that have a specific extension
 *   Default extension is .f.js
 *   Exports a cloud function matching the file name
 *
 *   Based on this thread:
 *     https://github.com/firebase/functions-samples/issues/170
 */
require = require("esm")(module /*, options*/);

function load(folder, exports) {
  var extension =
    arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ".f.js";

  var files = _glob2.default.sync("./**/*" + extension, {
    cwd: (0, _path.resolve)(folder),
    ignore: "./node_modules/**",
  });

  for (var f = 0, fl = files.length; f < fl; f++) {
    var file = files[f];
    var functionName = (0, _camelcase2.default)(
      file.split(extension).join("").split("/").join("_")
    ); // Strip off '.f.js'

    if (
      !process.env.FUNCTION_TARGET ||
      process.env.FUNCTION_TARGET === functionName
    ) {
      var mod = require((0, _path.resolve)(folder, file));
      exports[functionName] = mod.default || mod;
    }
  }
}

Object.defineProperty(exports, "default", {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(load).default;
  },
});

module.exports = exports["default"];
