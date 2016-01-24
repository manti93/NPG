/**
 * Selects code in droplet/ace editor.
 *
 * Returns the row (line) of code highlighted. If nothing is highlighted
 * because it is outside of the userCode area, the return value is -1
 */
JSInterpreter.prototype.selectCurrentCode = function (highlightClass) {
  if (this.studioApp.hideSource) {
    return -1;
  }
//  return codegen.selectCurrentCode(this.interpreter,
                                   this.codeInfo.cumulativeLength,
                                   this.codeInfo.userCodeStartOffset,
                                   this.codeInfo.userCodeLength,
                                   this.studioApp.editor,
                                   highlightClass);
};

/**
 * Finds the current line of code in droplet/ace editor.
 *
 * Returns the line of code where the interpreter is at. If it is outside
 * of the userCode area, the return value is -1
 */
JSInterpreter.prototype.getUserCodeLine = function () {
  if (this.studioApp.hideSource) {
    return -1;
  }
  var userCodeRow = -1;
  if (this.interpreter.stateStack[0]) {
    var node = this.interpreter.stateStack[0].node;
    // Adjust start/end by userCodeStartOffset since the code running
    // has been expanded vs. what the user sees in the editor window:
    var start = node.start - this.codeInfo.userCodeStartOffset;
    var end = node.end - this.codeInfo.userCodeStartOffset;

    // Only return a valid userCodeRow if the node being executed is inside the
    // user's code (not inside code we inserted before or after their code that
    // is not visible in the editor):
    if (start >= 0 && start < this.codeInfo.userCodeLength) {
      userCodeRow = codegen.aceFindRow(this.codeInfo.cumulativeLength,
                                       0,
                                       this.codeInfo.cumulativeLength.length,
                                       start);
    }
  }
  return userCodeRow;
};

/**
 * Finds the current line of code in droplet/ace editor. Walks up the stack if
 * not currently in the user code area.
 */
JSInterpreter.prototype.getNearestUserCodeLine = function () {
  if (this.studioApp.hideSource) {
    return -1;
  }
  var userCodeRow = -1;
  for (var i = 0; i < this.interpreter.stateStack.length; i++) {
    var node = this.interpreter.stateStack[i].node;
    // Adjust start/end by userCodeStartOffset since the code running
    // has been expanded vs. what the user sees in the editor window:
    var start = node.start - this.codeInfo.userCodeStartOffset;
    var end = node.end - this.codeInfo.userCodeStartOffset;

    // Only return a valid userCodeRow if the node being executed is inside the
    // user's code (not inside code we inserted before or after their code that
    // is not visible in the editor):
    if (start >= 0 && start < this.codeInfo.userCodeLength) {
      userCodeRow = codegen.aceFindRow(this.codeInfo.cumulativeLength,
                                       0,
                                       this.codeInfo.cumulativeLength.length,
                                       start);
      break;
    }
  }
  return userCodeRow;
};

/**
 * Returns the interpreter function object corresponding to 'funcName' if a
 * function with that name is found in the interpreter's global scope.
 */
JSInterpreter.prototype.findGlobalFunction = function (funcName) {
  var funcObj = this.interpreter.getProperty(this.globalScope, funcName);
  if (funcObj.type === 'function') {
    return funcObj;
  }
};