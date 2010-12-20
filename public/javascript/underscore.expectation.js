// Goal:
//
// var f = $.expectation();
// 
// $.get("/foo", f.expect("foo"));
// $.get("/bar", f.expect("bar"));
// 
// f.ready(function(data) {
//   renderSomething(data.foo, data.bar);
// })
//
// Todo:
// * Add error handling for unexpected invocations.

(function() {
  _.mixin({
    expectation: function(opts) {
      return new Expectation(opts || {});
    }
  });

  var Expectation = function(opts) {
    var defaults = { fireImmediately: true },
        expectations = {},
        expectors = [];
        
    this.options = $.merge(defaults, opts);

    this.expect = function(what) {
      var expectation = { called: false, arguments: undefined };
      expectations[what] = expectation;

      return function() {
        expectation.called = true;
        expectation.arguments = _(arguments).toArray();
        fireIfReady();
      }
    };

    this.ready = function(callback) {
      expectors.push(callback);
    };

    this.isReady = function() {
      return _(expectations).chain().pluck("called").all().value();
    };
    
    this._fire = function() {
      if (this.isReady() && this.options.fireImmediately) {
        var data = _(expectations).reduce(function(memo, value, key) {
          memo[key] = value.arguments;
          return memo;
        }, {});

        _(expectors).each(function(ready) { ready(data); });
      }
    };
    
    this.fire = function() {
      this.options.fireImmedately = true;
      this._fire();
    }
  };
})();
