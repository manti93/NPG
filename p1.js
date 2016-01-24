var codegeneneratorTest = require('./codegen');
//var utilsTest = require('./utils');
var _ = utils.getLodash();

/**
 * Create a JSInterpreter object. This object wraps an Interpreter object and
 * adds stepping, batching of steps, code highlighting, error handling,
 * breakpoints, general debug capabilities (step in, step out, step over), and
 * an optional event queue.
 */
var JSInterpreter = module.exports = function (options) {

  this.studioApp = options.studioApp;
  this.shouldRunAtMaxSpeed = options.shouldRunAtMaxSpeed || function() { return true; };
  this.maxInterpreterStepsPerTick = options.maxInterpreterStepsPerTick || 10000;
  this.onNextStepChanged = options.onNextStepChanged || function() {};
  this.onPause = options.onPause || function() {};
  this.onExecutionError = options.onExecutionError || function() {};
  this.onExecutionWarning = options.onExecutionWarning || function() {};

  this.paused = false;
  this.yieldExecution = false;
  this.startedHandlingEvents = false;
  this.nextStep = StepType.RUN;
  this.maxValidCallExpressionDepth = 0;
  this.executeLoopDepth = 0;
  this.callExpressionSeenAtDepth = [];

  if (!this.studioApp.hideSource) {
    this.codeInfo = {};
    this.codeInfo.userCodeStartOffset = 0;
    this.codeInfo.userCodeLength = options.code.length;
    var session = this.studioApp.editor.aceEditor.getSession();
    this.codeInfo.cumulativeLength = codegen.aceCalculateCumulativeLength(session);
  }

  var self = this;
  if (options.enableEvents) {
    this.eventQueue = [];
    // Append our mini-runtime after the user's code. This will spin and process
    // callback functions:
    options.code += '\nwhile (true) { var obj = getCallback(); ' +
      'if (obj) { var ret = obj.fn.apply(null, obj.arguments ? obj.arguments : null);' +
                 'setCallbackRetVal(ret); }}';

    codegen.createNativeFunctionFromInterpreterFunction = function (intFunc) {
      return function () {
        if (self.initialized()) {
          self.queueEvent(intFunc, arguments);
          
          if (self.executeLoopDepth === 0) {
            // Execute the interpreter and if a return value is sent back from the
            // interpreter's event handler, pass that back in the native world

            // NOTE: the interpreter will not execute forever, if the event handler
            // takes too long, executeInterpreter() will return and the native side
            // will just see 'undefined' as the return value. The rest of the interpreter
            // event handler will run in the next onTick(), but the return value will
            // no longer have any effect.
            self.executeInterpreter(false, true);
            return self.lastCallbackRetVal;
          }
        }
      };
    };
  }