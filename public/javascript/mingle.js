$.Class("Mingle.Project", {}, {
  init: function(name, opts) {
    this.name = name;
    this.options = {};

    _.extend(this.options, opts);
  },

  fetch: function(callback) {
    this._mingle("", function(data) {
      this.attributes = data.project;
      callback.apply(this);
    });
  },

  // Accepts a query and a callback that accepts a MQL response, which is triggered when
  // the query is complete.
  mql: function(mql, callback) {
    console.log("pringle: querying " + mql);
    this._mingle("/cards/execute_mql", { mql: mql }, callback);
  },

  // Accepts a query and a callback that expects a single MQL value, which is triggered when
  // the query is complete.
  mqlValue: function(mql, callback) {
    this.mql(mql, function(mqlResult) {
      var tuple = _(mqlResult.results).first();
      var value = _(_(tuple).values()).first();
      callback(parseFloat(value));
    });
  },

  // Accepts an array of one or more queries and a callback that expects an array of MQL values,
  // which is triggered when all queries are complete.
  mqlValues: function(queries, callback) {
    var self = this,
        ex = _.expectation();

    _(queries).each(function(query, idx) {
      self.mqlValue(query, ex.expect("query" + idx));
    });

    ex.ready(function(tuples) {
      callback.apply(this, _(tuples).values().map(function(val) {
        return _(val).first();
      }));
    });
  },

  _mingle: function(path, params, callback) {
    if (_.isFunction(params)) {
      callback = params;
      params = {};
    }

    params = typeof(params) === "string" ? params : $.param(params || {});
    path = "/projects/" + this.name + path;
    callback = _.bind(callback, this);

    $.get("/mingle" + path, params, callback, "jsonp");
  },

  // Pull the given property out of the response and push that into the callback to simplify parsing.
  disassemble: function(property, callback) {
    return function(mingleResponse) {
      callback(mingleResponse[property]);
    };
  },

  getCardTypes: function(callback) {
    this._mingle("/card_types", this.disassemble("card_types", callback));
  },

  getPropertyDefinitions: function(callback) {
    this._mingle("/property_definitions", this.disassemble("property_definitions", callback));
  },

  getCards: function(params, callback) {
    params = _.extend({ page: 1 }, params);
    this._mingle("/cards", params, this.disassemble("cards", callback));
  }
});