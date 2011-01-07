(function($) {
  window.Pringle = {};
  var P = window.Pringle,
      readies = [];
  
  var addProjectStyleSheet = function(projectName) {
    var link = document.createElement("link");
    $(link).attr({ rel: "stylesheet/less", type: "text/css", href: "/stylesheets/projects/" + projectName + ".less" });
    less.sheets.push(link);
    less.refresh();
  };
  
  var addProjectJavascript = function(projectName) {
    var script = document.createElement("script");
    $(script).attr({ type: "text/javascript", src: "/javascript/projects/" + projectName + ".js" });
    $("head").append(script);
  };
  
  Pringle.init = function() {
    var projectName  = window.location.toString().match(/\/pringle\/(\w+)\??/)[1],
        project      = new Pringle.Project(projectName);

    addProjectStyleSheet(projectName);
    addProjectJavascript(projectName);
    
    project.fetch(function() {
      _(readies).each(function(ready) { ready.apply(project); });
    });
  };
  
  Pringle.ready = function(callback) {
    readies.push(callback);
  };
  
  Pringle.Project = function(name, opts) {
    this.name = name;
    this.options = {};

    _.extend(this.options, opts);
  };

  _.extend(Pringle.Project.prototype, Backbone.Events, {
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

  _.bindAll(Pringle.Project);
  
  Pringle.ViewRotator = function(target) {
    this.target = target;
    this.views = [];
  };
  
  _.extend(Pringle.ViewRotator.prototype, {
    addView: function(viewType, model) {
      var view = new Pringle.View(model);
      view.type = viewType;
      this.views.push(view);
    },
    
    rotate: function(speed, viewIdx) {
      var self = this;
      if (_.isUndefined(viewIdx)) viewIdx = 0;
      console.log("pringle: Rotating to display view " + viewIdx);
      
      var ex = _.expectation();
      
      this.target.fadeOut("slow", ex.expect("fadeOut"));
      this.views[viewIdx].render(ex.expect("html"));
      
      ex.ready(function(returns) {
        self.target.html(returns.html[0]);
        self.target.fadeIn("slow");
        
        setTimeout(function() {
          var nextViewIdx = ( viewIdx + 1 ) % self.views.length;
          self.rotate(speed, nextViewIdx);
        }, speed);
      });
    }
  });
  
  _.bindAll(Pringle.ViewRotator);
  
  Pringle.MqlNumber = function(project, attributes) {
    this.project = project;
    this.attributes = attributes;
  };
  
  _.extend(Pringle.MqlNumber.prototype, {
    refresh: function(callback) {
      var self = this;
      this.project.mqlValue(this.attributes.query, function(result) {
        callback(_(self.attributes).extend({ value: result }));
      });
    }
  });
  
  _.bindAll(Pringle.MqlNumber);
  
  Pringle.MqlPercent = function(project, attributes) {
    this.project = project;
    this.attributes = attributes;
    this.baseQuery = attributes.queries[0],
    this.filterQuery = this.baseQuery + " AND " + attributes.queries[1];
  };
  
  _.extend(Pringle.MqlPercent.prototype, {
    refresh: function(callback) {
      var self = this;
      
      this.project.mqlValues([ this.filterQuery, this.baseQuery ], function(filter, base) {
        var result = ( filter / base ) * 100.0;
        callback(_(self.attributes).extend({ value: result }));
      });
    }
  });
  
  _.bindAll(Pringle.MqlPercent);

  // A view has a model. That model must respond to the refresh function, which accepts a callback that
  // expects to be called with the data with which to render the view.
  Pringle.View = function(model) {
    this.model = model;
    this.template = _.memoize(this._template);
    _.bind(this._template, this);
  };
  
  _.extend(Pringle.View.prototype, {
    _template: function() {
      var template = $.ajax({
        url: "/templates/" + this.type + ".html",
        async: false
      }).responseText;
      
      return $("<div/>").html(template);
    },
    
    render: function(ready) {
      var self = this;
      this.model.refresh(function(data) {
        var html = self.template().tmpl(data);
        return ready(html);
      });
    }
  });
  
  _.bindAll(Pringle.View);
})(jQuery);
