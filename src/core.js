/**
 * CoreJS: A lightweight modular JavaScript framework.
 *
 * Copyright (C) Debjit Biswas
 * Available under the MIT license: http://www.opensource.org/licenses/MIT
 */

/*jshint browser: true, maxerr: 50, white: true, indent: 2, newcap: true, onevar: true, jquery: true, curly: true, eqeqeq: true, undef: true, strict: false */
/*global corejs: true, jQuery: false, $: false, console: true, window: true, document: true */

(function () {

  "use strict";

  var error, Sandbox, mediator, core;

  error = function (e) {
    return (console && typeof console.error === "function") ? console.error(e.message) : 0;
  };

  /**
   * The Sandbox
   * Serves as an abstraction to the core. Modules are aware only of this.
   */
  Sandbox = function (core, instanceId, options) {
    this.core = core;
    this.instanceId = instanceId;
    this.options = options || {};
    if (!this.core) {
      throw new Error("core was not defined");
    }
    if (!instanceId) {
      throw new Error("no id was specified");
    }
    if (typeof instanceId !== "string") {
      throw new Error("id is not a string");
    }
  };

  /**
   * The Mediator
   * Responsible for communication between modules via pub/sub.
   */
  mediator = (function () {
    var subscribe, publish;

    subscribe = function (channel, fn) {
      if (!mediator.channels[channel]) {
        mediator.channels[channel] = [];
      }
      mediator.channels[channel].push({ context: this, callback: fn });
      return this;
    };
 
    publish = function (channel) {
      if (!mediator.channels[channel]) {
        return false;
      }
      var args = Array.prototype.slice.call(arguments, 1),
          l = mediator.channels[channel].length,
          i = 0, subscription;
      for (i = 0; i < l; i += 1) {
        subscription = mediator.channels[channel][i];
        subscription.callback.apply(subscription.context, args);
      }
      return this;
    };
 
    return {
      channels: {},
      publish: publish,
      subscribe: subscribe,
      installTo: function (obj) {
        obj.subscribe = subscribe;
        obj.publish = publish;
      }
    };
  }());

  /**
   * The Core
   * Handles module lifecycle.
   */
  core = (function () {
    var modules = {},
        instances = {},
        initialModuleList = [],
        addModule, register, unregister, createInstance, start, stop;

    addModule = function (moduleId, factory, opt) {
      var modObj;
      if (typeof moduleId !== "string") {
        throw new Error("moudule ID has to be a string");
      }
      if (typeof factory !== "function") {
        throw new Error("creator has to be a factory function");
      }
      if (typeof opt !== "object") {
        throw new Error("option parameter has to be an object");
      }
      if (modules[moduleId]) {
        throw new Error("module " + moduleId + " was already registered");
      }
      modObj = factory();
      if (typeof modObj !== "object") {
        throw new Error("creator has to return an object");
      }
      if (typeof modObj.init !== "function") {
        throw new Error("module has to have an init function");
      }
      if (typeof modObj.destroy !== "function") {
        throw new Error("module has to have a destroy function");
      }
      modules[moduleId] = {
        factory: factory,
        options: opt,
        id: moduleId
      };
      return true;
    };
    register = function (moduleId, factory, opt) {
      var isModuleAddSuccessful;
      opt = opt || {};
      try {
        isModuleAddSuccessful = addModule(moduleId, factory, opt);
      } catch (e) {
        error(new Error("could not register module '" + moduleId + "': " + e.message));
        return false;
      }
    };
    unregister = function (id) {
      if (modules[id] !== null) {
        delete modules[id];
        return true;
      } else {
        return false;
      }
    };
    createInstance = function (moduleId, instanceId, opt) {
      var entry, i, instance, instanceOpts, k, key, module, n, p, sb, v, val, _i, _j, _len, _len1, _ref, _ref1, _ref2;
      if (!instanceId) {
        instanceId = moduleId;
      }
      module = modules[moduleId];
      if (instances[instanceId]) {
        return instances[instanceId];
      }
      instanceOpts = {};
      _ref = module.options;
      for (key in _ref) {
        if (_ref.hasOwnProperty(key)) {
          val = _ref[key];
          instanceOpts[key] = val;
        }
      }
      if (opt) {
        for (key in opt) {
          if (opt.hasOwnProperty(key)) {
            val = opt[key];
            instanceOpts[key] = val;  
          }
        }
      }
      sb = new Sandbox(core, instanceId, instanceOpts);
      mediator.installTo(sb);
      instance = module.factory(sb);
      instance.options = instanceOpts;
      instance.id = instanceId;
      instances[instanceId] = instance;

      return instance;
    };
    start = function (moduleId, opt) {
      var instance;
      opt = opt || {};
      try {
        if (typeof moduleId !== "string") {
          throw new Error("module ID has to be a string");
        }
        if (typeof opt !== "object") {
          throw new Error("second parameter has to be an object");
        }
        if (!modules[moduleId]) {
          throw new Error("module not registered");
        }
        /* Each instance of a widget must have unique Id */
        if (modules[moduleId].associatedClass && !opt.instanceId) {
          opt.instanceId = moduleId + Date.now();
        }
        instance = createInstance(moduleId, opt.instanceId, opt.options);
        if (instance.running === true) {
          throw new Error("module was already started");
        }
        if (instance.init.length >= 2) {
          instance.init(instance.options, function (err) {
            return typeof opt.callback === "function" ? opt.callback(err) : 0;
          });
        } else {
          instance.init(instance.options);
          if (typeof opt.callback === "function") {
            opt.callback(undefined);
          }
        }
        instance.running = true;
        return true;
      } catch (e) {
        error(e);
        if (typeof opt.callback === "function") {
          opt.callback(new Error("could not start module: " + e.message));
        }
        return false;
      }
    };
    stop = function (id, cb) {
      var instance = instances[id];
      if (instance) {
        mediator.unsubscribe(instance);
        if (instance.destroy.length >= 1) {
          instance.destroy(function (err) {
            return typeof cb === "function" ? cb(err) : 0;
          });
        } else {
          instance.destroy();
          if (typeof cb === "function") {
            cb(undefined);
          }
        }
        delete instances[id];
        return true;
      } else {
        return false;
      }
    };

    mediator.subscribe("documentReady", function () {
      var m, widgets = [];
      for (m in modules) {
        if (modules.hasOwnProperty(m) && modules[m].options.associatedClass) {
          widgets.push({
            "associatedClass": modules[m].options.associatedClass,
            "moduleId": modules[m].id
          });
        }
      }
      start("__startWidgets__", {
        "options": {
          "widgets": widgets
        }
      });
    });

    start("__notifyDOMEvents__");

    return {
      register: register,
      unregister: unregister,
      start: start,
      stop: stop
    };
  }());

  window.corejs = core;

}());

/**
 * Internal Modules
 * Below modules supplement the core, but they have been
 * moved into modules to allow their implementaions to change
 * or expand.
 */

/**
 * Module to start widgets when the core asks it to.
 * Widgets are modules but they are associated with a particular
 * HTML code. The same widget can be present on a page multiple
 * times.
 */ 
corejs.register("__startWidgets__", function (sb) {
  return {
    init: function (opts) {
      var i = 0, nwidgets = opts.widgets.length, w;
      for (i = 0; i < nwidgets; i += 1) {
        w = opts.widgets[i];
        if ($('.' + w.associatedClass).length > 0) {
          $('.' + w.associatedClass).each(function () {
            sb.core.start(w.moduleId, {
              "instanceId": $(this).attr('id'),
              "options": {'el': this}
            });
          });
        }
      }
    },
    destroy: function () { /*...*/ }
  };
});

/**
 * Module to notify the core of DOM events.
 */
corejs.register("__notifyDOMEvents__", function (sb) {
  return {
    init: function (opts) {
      $(document).ready(function () {
        sb.publish("documentReady");
      });
      $(window).load(function () {
        sb.publish("documentLoaded");
      });
    },
    destroy: function () { /*...*/ }
  };
});

