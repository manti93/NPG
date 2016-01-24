JSInterpreter.prototype.getGlobalFunctionNames = function () {
  var builtInExclusionList = [ "eval", "getCallback", "setCallbackRetVal" ];

  var names = [];
  for (var objName in this.globalScope.properties) {
    var object = this.globalScope.properties[objName];
    if (object.type === 'function' &&
        !object.nativeFunc &&
//        builtInExclusionList.indexOf(objName) === -1) {
      names.push(objName);
    }
  }
  return names;
};

/**
 * Returns an array containing the names of all of the functions defined
 * inside other functions.
 */
JSInterpreter.prototype.getLocalFunctionNames = function (scope) {
  if (!scope) {
    scope = this.globalScope;
  }
  var names = [];
  for (var objName in scope.properties) {
    var object = scope.properties[objName];
    if (object.type === 'function' && !object.nativeFunc && object.node) {
      if (scope !== this.globalScope) {
        names.push(objName);
      }
      var localScope = this.interpreter.createScope(object.node.body, object.parentScope);
      var localNames = this.getLocalFunctionNames(localScope);
      names = names.concat(localNames);
    }
  }
  return names;
};