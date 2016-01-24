///**
 * Yield execution (causes executeInterpreter loop to break out if this is
 * called by APIs called by interpreted code)
 */
JSInterpreter.prototype.yield = function () {
  this.yieldExecution = true;
};


var StepType = JSInterpreter.StepType;

/**
 * Small helper to step the interpreter so that exception handler can exist outside
 * of the core executeInterpeter() function (improves browser JS engine performance)
 */
function safeStepInterpreter(jsi) {
  try {
    jsi.interpreter.step();
  } catch (err) {
    return err;
  }
}

/**
 * Execute the interpreter
 */
JSInterpreter.prototype.executeInterpreter = function (firstStep, runUntilCallbackReturn) {
  this.executeLoopDepth++;
  this.runUntilCallbackReturn = runUntilCallbackReturn;
  if (runUntilCallbackReturn) {
    delete this.lastCallbackRetVal;
  }
  this.yieldExecution = false;
  this.seenReturnFromCallbackDuringExecution = false;

  var atInitialBreakpoint = this.paused &&
                            this.nextStep === StepType.IN &&
                            firstStep;
  var atMaxSpeed = false;

  if (this.paused) {
    switch (this.nextStep) {
      case StepType.RUN:
        // Bail out here if in a break state (paused), but make sure that we still
        // have the next tick queued first, so we can resume after un-pausing):
        return;
      case StepType.OUT:
        // If we haven't yet set stepOutToStackDepth, work backwards through the
        // history of callExpressionSeenAtDepth until we find the one we want to
        // step out to - and store that in stepOutToStackDepth:
        if (this.interpreter && typeof this.stepOutToStackDepth === 'undefined') {
          this.stepOutToStackDepth = 0;
          for (var i = this.maxValidCallExpressionDepth; i > 0; i--) {
            if (this.callExpressionSeenAtDepth[i]) {
              this.stepOutToStackDepth = i;
              break;
            }
          }
        }
        break;
    }