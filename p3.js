///**
 * Detech the Interpreter instance. Call before releasing references to
 * JSInterpreter so any async callbacks will not execute.
 */
JSInterpreter.prototype.deinitialize = function () {
  this.interpreter = null;
};

JSInterpreter.StepType = {
  RUN:  0,
  IN:   1,
  OVER: 2,
  OUT:  3,
};

/**
 * A miniature runtime in the interpreted world calls this function repeatedly
 * to check to see if it should invoke any callbacks from within the
 * interpreted world. If the eventQueue is not empty, we will return an object
 * that contains an interpreted callback function (stored in "fn") and,
 * optionally, callback arguments (stored in "arguments")
 */
JSInterpreter.prototype.nativeGetCallback = function () {
  this.startedHandlingEvents = true;
  var retVal = this.eventQueue.shift();
  if (typeof retVal === "undefined") {
    this.yield();
  }
  return retVal;
};

JSInterpreter.prototype.nativeSetCallbackRetVal = function (retVal) {
  if (this.eventQueue.length === 0) {
    // If nothing else is in the event queue, then store this return value
    // away so it can be returned in the native event handler
    this.seenReturnFromCallbackDuringExecution = true;
    this.lastCallbackRetVal = retVal;
  }
  // Provide warnings to the user if this function has been called with a
  // meaningful return value while we are no longer in the native event handler

  // TODO (cpirich): Check to see if the DOM event object was modified
  // (preventDefault(), stopPropagation(), returnValue) and provide a similar
  // warning since these won't work as expected unless running atMaxSpeed
  if (!this.runUntilCallbackReturn &&
      typeof this.lastCallbackRetVal !== 'undefined') {
    this.onExecutionWarning("Function passed to onEvent() has taken too long " +
                            "- the return value was ignored.");
    if (!this.shouldRunAtMaxSpeed()) {
      this.onExecutionWarning("  (try moving the speed slider to its maximum value)");
    }
  }
};

/**
 * Queue an event to be fired in the interpreter. The nativeArgs are optional.
 * The function must be an interpreter function object (not native).
 */
JSInterpreter.prototype.queueEvent = function (interpreterFunc, nativeArgs) {
  this.eventQueue.push({
    'fn': interpreterFunc,
    'arguments': nativeArgs ? Array.prototype.slice.call(nativeArgs) : []
  });
};