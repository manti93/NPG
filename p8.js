      this.executeLoopDepth--;
      return;
    }
  }
  if (reachedBreak && atMaxSpeed) {
    // If we were running atMaxSpeed and just reached a breakpoint, the
    // code may not be selected in the editor, so do it now:
    this.selectCurrentCode();
  }
  this.executeLoopDepth--;
};

/**
 * Helper to create an interpeter primitive value. Useful when extending the
 * interpreter without relying on codegen marshalling helpers.
 */
JSInterpreter.prototype.createPrimitive = function (data) {
  if (this.interpreter) {
    return this.interpreter.createPrimitive(data);
  }
};

/**
 * Wrapper to Interpreter's getProperty (extended for custom marshaling)
 *
 * Fetch a property value from a data object.
 * @param {!Object} obj Data object.
 * @param {*} name Name of property.
 * @return {!Object} Property value (may be UNDEFINED).
 */
JSInterpreter.prototype.getProperty = function (obj, name) {
  name = name.toString();
  if (obj.isCustomMarshal) {
    var value = obj.data[name];
    var type = typeof value;
    if (type === 'number' || type === 'boolean' || type === 'string' ||
        type === 'undefined' || value === null) {
      return this.interpreter.createPrimitive(value);
    } else {
      return codegen.marshalNativeToInterpreter(this.interpreter, value, obj.data);
    }
  } else {
    return this.baseGetProperty.call(this.interpreter, obj, name);
  }
};

/**
 * Wrapper to Interpreter's setProperty (extended for custom marshaling)
 *
 * Set a property value on a data object.
 * @param {!Object} obj Data object.
 * @param {*} name Name of property.
 * @param {*} value New property value.
 * @param {boolean} opt_fixed Unchangeable property if true.
 * @param {boolean} opt_nonenum Non-enumerable property if true.
 */
JSInterpreter.prototype.setProperty = function(obj, name, value,
                                               opt_fixed, opt_nonenum) {
  name = name.toString();
  if (obj.isCustomMarshal) {
    obj.data[name] = codegen.marshalInterpreterToNative(this.interpreter, value);
  } else {
    return this.baseSetProperty.call(
        this.interpreter, obj, name, value, opt_fixed, opt_nonenum);
  }
};