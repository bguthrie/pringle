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
    
    mql: function(mql, callback) {
      this._mingle("/cards/execute_mql", { mql: mql }, callback);
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

    getCardTypes: function(callback) {
      this._mingle("/card_types", callback);
    },
    
    getPropertyDefinition: function(propertyId, callback) {
      this._mingle("/property_definitions/" + propertyId, callback);
    },
    
    getCards: function(params, callback) {
      params = _.extend({ page: 1 }, params);
      this._mingle("/cards", params, callback);
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
  
  Pringle.MqlQuery = function(project, attributes) {
    this.project = project;
    this.attributes = attributes;
  };
  
  _.extend(Pringle.MqlQuery.prototype, {
    refresh: function(callback) {
      var self = this;
      this.project.mql(self.attributes.query, function(result) {
        var tuple = _(result.results).first();
        var value = _(_(tuple).values()).first();
        self.attributes.value = parseFloat(value);

        callback(self.attributes);
      });
    }
  });
  
  _.bindAll(Pringle.MqlQuery);

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
