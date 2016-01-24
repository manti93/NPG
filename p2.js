//var initFunc = function (interpreter, scope) {
    // Store Interpreter on JSInterpreter
    self.interpreter = interpreter;
    // Store globalScope on JSInterpreter
    self.globalScope = scope;
    // Override Interpreter's get/set Property functions with JSInterpreter
    self.baseGetProperty = interpreter.getProperty;
    interpreter.getProperty = _.bind(self.getProperty, self);
    self.baseSetProperty = interpreter.setProperty;
    interpreter.setProperty = _.bind(self.setProperty, self);
    codegen.initJSInterpreter(
        interpreter,
        options.blocks,
        options.blockFilter,
        scope,
        options.globalFunctions);

    // Only allow five levels of depth when marshalling the return value
    // since we will occasionally return DOM Event objects which contain
    // properties that recurse over and over...
    var wrapper = codegen.makeNativeMemberFunction({
        interpreter: interpreter,
        nativeFunc: _.bind(self.nativeGetCallback, self),
        maxDepth: 5
    });
    interpreter.setProperty(scope,
                            'getCallback',
                            interpreter.createNativeFunction(wrapper));

    wrapper = codegen.makeNativeMemberFunction({
        interpreter: interpreter,
        nativeFunc: _.bind(self.nativeSetCallbackRetVal, self),
    });
    interpreter.setProperty(scope,
                            'setCallbackRetVal',
                            interpreter.createNativeFunction(wrapper));
  };

  try {
    new window.Interpreter(options.code, initFunc);
  }
  catch(err) {
    this.onExecutionError(err);
  }

};

/**
 * Returns true if the JSInterpreter instance initialized successfully. This
 * would typically fail when the program contains a syntax error.
 */
JSInterpreter.prototype.initialized = function () {
  return !!this.interpreter;
};