.//     // Truncate any history of call expressions seen deeper than our current stack position:
      for (var depth = stackDepth + 1;
            depth <= this.maxValidCallExpressionDepth;
            depth++) {
        this.callExpressionSeenAtDepth[depth] = false;
      }
      this.maxValidCallExpressionDepth = stackDepth;

      if (inUserCode && this.interpreter.stateStack[0].node.type === "CallExpression") {
        // Store that we've seen a call expression at this depth in callExpressionSeenAtDepth:
        this.callExpressionSeenAtDepth[stackDepth] = true;
      }

      if (this.paused) {
        // Store the first call expression stack depth seen while in this step operation:
        if (inUserCode && this.interpreter.stateStack[0].node.type === "CallExpression") {
          if (typeof this.firstCallStackDepthThisStep === 'undefined') {
            this.firstCallStackDepthThisStep = stackDepth;
          }
        }
        // If we've arrived at a BlockStatement or SwitchStatement, set doneUserLine even
        // though the the stateStack doesn't have "done" set, so that stepping in the
        // debugger makes sense (otherwise we'll skip over the beginning of these nodes):
        var nodeType = this.interpreter.stateStack[0].node.type;
        doneUserLine = doneUserLine ||
          (inUserCode && (nodeType === "BlockStatement" || nodeType === "SwitchStatement"));

        // For the step in case, we want to stop the interpreter as soon as we enter the callee:
        if (!doneUserLine &&
            inUserCode &&
            this.nextStep === StepType.IN &&
            stackDepth > this.firstCallStackDepthThisStep) {
          reachedBreak = true;
        }
        // After the interpreter says a node is "done" (meaning it is time to stop), we will
        // advance a little further to the start of the next statement. We achieve this by
        // continuing to set unwindingAfterStep to true to keep the loop going:
        if (doneUserLine || reachedBreak) {
          var wasUnwinding = unwindingAfterStep;
          // step() additional times if we know it to be safe to get us to the next statement:
          unwindingAfterStep = codegen.isNextStepSafeWhileUnwinding(this.interpreter);
          if (wasUnwinding && !unwindingAfterStep) {
            // done unwinding.. select code that is next to execute:
            userCodeRow = selectCodeFunc.call(this);
            inUserCode = (-1 !== userCodeRow);
            if (!inUserCode) {
              // not in user code, so keep unwinding after all...
              unwindingAfterStep = true;
            }
          }
        }

        if ((reachedBreak || doneUserLine) && !unwindingAfterStep) {
          if (this.nextStep === StepType.OUT &&
              stackDepth > this.stepOutToStackDepth) {
            // trying to step out, but we didn't get out yet... continue on.
          } else if (this.nextStep === StepType.OVER &&
              typeof this.firstCallStackDepthThisStep !== 'undefined' &&
              stackDepth > this.firstCallStackDepthThisStep) {
            // trying to step over, and we're in deeper inside a function call... continue next onTick
          } else {
            // Our step operation is complete, reset nextStep to StepType.RUN to
            // return to a normal 'break' state:
            this.nextStep = StepType.RUN;
            this.onNextStepChanged();
            if (inUserCode) {
              // Store some properties about where we stopped:
              this.stoppedAtBreakpointRow = userCodeRow;
              this.stoppedAtBreakpointStackDepth = stackDepth;
            }
            delete this.stepOutToStackDepth;
            delete this.firstCallStackDepthThisStep;
            break;
          }
        }
      }
    } else {
      this.onExecutionError(err, inUserCode ? (userCodeRow + 1) : undefined);
      this.executeLoopDepth--;
      return;
    }
  }