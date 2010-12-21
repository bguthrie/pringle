(function($) {
  window.Pringle = {};
  var P = window.Pringle,
      readies = [];
  
  Pringle.init = function() {
    var projectName = window.location.toString().match(/\/pringle\/(\w+)\??/)[1],
        projectConf = "/javascript/projects/" + projectName + ".js",
        project = new Pringle.Project(projectName);
    
    $("<script/>").attr({ type: "text/javascript", src: projectConf }).appendTo($("head"));
    
    project.fetch(function() {
      _(readies).each(function(ready) { ready.apply(project); });
    });
  };
  
  Pringle.ready = function(callback) {
    readies.push(callback);
  };
  
  Pringle.Project = function(name, opts) {
    this.name = name;

    // var defaultCharts = {
    //   cardsByType: function(cards) {
    //     _(cards).reduce(function(memo, card) {
    //       var oldValue = memo[card.card_type.name];
    //       memo[card.card_type.name] = ( oldValue || 0 ) + 1;
    //       return memo;
    //     }, {});
    //   }
    // };
    // 
    // var defaultCardMethods = {
    //   property: function(propName) {
    //     var property = _(this.properties).find(function(o) {
    //       return o.name === propName;
    //     });
    //     return ( property || {} ).value;
    //   },
    // 
    //   status: function() {
    //     return this.property(this.project.options.statusName);
    //   }
    // };

    this.options = {};
    this.views = {};

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
  
  var templateFor = function(type) {
    return $.ajax({
      url: "/templates/" + type + ".html",
      async: false
    }).responseText;
  };
  
  Pringle.View = function(model) {
    this.model = model;
    this.template = $("<div/>").html(templateFor(this.type));
    var self = this;
    
    this.render = function(target) {
      var ex = _.expectation();
      
      target.fadeOut("slow", ex.expect("fadeOut"));
      this.model.refresh(ex.expect("refresh"));
      
      ex.ready(function(returns) {
        target.html(self.template.tmpl(returns.refresh));
        target.fadeIn();
      });
    };
  };
  
  Pringle.View.extend = Backbone.View.extend;
})(jQuery);

