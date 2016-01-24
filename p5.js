//var doneUserLine = false;
  var reachedBreak = false;
 // var unwindingAfterStep = false;
  var inUserCode;
  var userCodeRow;
  var session;
  if (!this.studioApp.hideSource) {
    session = this.studioApp.editor.aceEditor.getSession();
  }

  // In each tick, we will step the interpreter multiple times in a tight
  // loop as long as we are interpreting code that the user can't see
  // (function aliases at the beginning, getCallback event loop at the end)
  for (var stepsThisTick = 0;
       (stepsThisTick < this.maxInterpreterStepsPerTick) || unwindingAfterStep;
       stepsThisTick++) {
    // Check this every time because the speed is allowed to change...
    atMaxSpeed = this.shouldRunAtMaxSpeed();
    // NOTE: when running with no source visible or at max speed, we
    // call a simple function to just get the line number, otherwise we call a
    // function that also selects the code:
    var selectCodeFunc = (this.studioApp.hideSource || (atMaxSpeed && !this.paused)) ?
            this.getUserCodeLine :
            this.selectCurrentCode;

    if ((reachedBreak && !unwindingAfterStep) ||
        (doneUserLine && !unwindingAfterStep && !atMaxSpeed) ||
        this.yieldExecution ||
        (runUntilCallbackReturn && this.seenReturnFromCallbackDuringExecution)) {
      // stop stepping the interpreter and wait until the next tick once we:
      // (1) reached a breakpoint and are done unwinding OR
      // (2) completed a line of user code and are are done unwinding
      //     (while not running atMaxSpeed) OR
      // (3) have seen an empty event queue in nativeGetCallback (no events) OR
      // (4) have seen a nativeSetCallbackRetVal call in runUntilCallbackReturn mode
      break;
    }
    userCodeRow = selectCodeFunc.call(this);
    inUserCode = (-1 !== userCodeRow);
    // Check to see if we've arrived at a new breakpoint:
    //  (1) should be in user code
    //  (2) should never happen while unwinding
    //  (3) requires either
    //   (a) atInitialBreakpoint OR
    //   (b) isAceBreakpointRow() AND not still at the same line number where
    //       we have already stopped from the last step/breakpoint
    if (inUserCode && !unwindingAfterStep &&
        (atInitialBreakpoint ||
         (userCodeRow !== this.stoppedAtBreakpointRow &&
          codegen.isAceBreakpointRow(session, userCodeRow)))) {
      // Yes, arrived at a new breakpoint:
      if (this.paused) {
        // Overwrite the nextStep value. (If we hit a breakpoint during a step
        // out or step over, this will cancel that step operation early)
        this.nextStep = StepType.RUN;
        this.onNextStepChanged();
      } else {
        this.onPause();
      }
      // Store some properties about where we stopped:
      this.stoppedAtBreakpointRow = userCodeRow;
      this.stoppedAtBreakpointStackDepth = this.interpreter.stateStack.length;

      // Mark reachedBreak to stop stepping, and start unwinding if needed:
      reachedBreak = true;
      unwindingAfterStep = codegen.isNextStepSafeWhileUnwinding(this.interpreter);
      continue;
    }
    // If we've moved past the place of the last breakpoint hit without being
    // deeper in the stack, we will discard the stoppedAtBreakpoint properties:
    if (inUserCode &&
        userCodeRow !== this.stoppedAtBreakpointRow &&
        this.interpreter.stateStack.length <= this.stoppedAtBreakpointStackDepth) {
      delete this.stoppedAtBreakpointRow;
      delete this.stoppedAtBreakpointStackDepth;
    }
    // If we're unwinding, continue to update the stoppedAtBreakpoint properties
    // to ensure that we have the right properties stored when the unwind completes:
    if (inUserCode && unwindingAfterStep) {
      this.stoppedAtBreakpointRow = userCodeRow;
      this.stoppedAtBreakpointStackDepth = this.interpreter.stateStack.length;
    }
    var err = safeStepInterpreter(this);
    if (!err) {
      doneUserLine = doneUserLine ||
        (inUserCode && this.interpreter.stateStack[0] && this.interpreter.stateStack[0].done);
