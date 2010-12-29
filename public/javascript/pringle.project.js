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

    this.bind("pringle.project.get", this._getProject).
         bind("pringle.cardTypes.get", this._getCardTypes).
         bind("pringle.statuses.get", this._getStatuses).
         bind("pringle.cards.get", this._getCards);
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

    _getCardTypes: function(evt) {
      this._mingle("/card_types", this._setCardTypes);
    },
    
    _setCardTypes: function(data) {
      $(this).trigger("pringle.cardTypes.set", [ data ])
    },
    
    _getStatuses: function(evt) {
      this._mingle("/property_definitions/" + this.options.statusId, this._setStatuses);
    },
    
    _setStatuses: function(data) {
      $(this).trigger("pringle.statuses.set", [ data ]);
    },
    
    _getCards: function(evt, params) {
      params = (_.isNull(params) || _.isUndefined(params)) ? { page: 1 } : params;
      this._mingle("/cards", params, this._setCards);
    },
    
    _setCards: function(data) {
      _(data.cards).each(function(card) {
        _.extend(card, this.options.cardMethods, { project: this });
      }, this);
    
      $(this).trigger("pringle.cards.set", [ data ]);
    }
  });

  _.bindAll(Pringle.Project);
  
  Pringle.ViewRotator = function(target) {
    this.target = target;
    this.views = [];
    var self = this;
    
    this.addView = function(model) {
      this.views.push(new Pringle.View(model));
    };
    
    this.rotate = function(speed, viewIdx) {
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
    };
  };
  
  Pringle.View = function(model) {
    this.model = model;
    this.template = _.memoize(this._template);
    _.bind(this._template, this);
    
    var self = this;
    
    this.render = function(ready) {
      this.model.refresh(function(data) {
        var html = self.template().tmpl(data);
        return ready(html);
      });
    };
  };
  
  _.extend(Pringle.View.prototype, {
    _template: function() {
      var template = $.ajax({
        url: "/templates/" + this.model.type + ".html",
        async: false
      }).responseText;
      
      return $("<div/>").html(template);
    }
  });
})(jQuery);
