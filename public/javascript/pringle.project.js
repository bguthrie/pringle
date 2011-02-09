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

  Pringle.Project = Class.extend({
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

  Pringle.ViewRotator = Class.extend({
    init: function(target) {
      this.target = target.find(".content");
      this.curtain = target.find(".curtain");
      this.views = [];
    },

    hide: function(then) {
      this.curtain.fadeIn("slow", then);
    },

    show: function(then) {
      this.curtain.fadeOut("slow", then);
    },

    addView: function(viewType, model) {
      var view = new Pringle.View(model);
      view.type = viewType;
      this.views.push(view);
    },

    addChart: function(viewType, model) {
      var view = new Pringle.Chart(model);
      view.type = viewType;
      this.views.push(view);
    },

    rotate: function(speed, viewIdx) {
      var self = this;
      if (_.isUndefined(viewIdx)) viewIdx = 0;
      console.log("pringle: Rotating to display view " + viewIdx);

      var ex = _.expectation();

      this.hide(function() {
        self.views[viewIdx].render(self.target, function() {
          self.show();

          setTimeout(function() {
            var nextViewIdx = ( viewIdx + 1 ) % self.views.length;
            self.rotate(speed, nextViewIdx);
          }, speed);
        });
      });
    }
  });
  
  Pringle.Model = Class.extend({
    init: function(project, attributes) {
      this.project = project;
      this.attributes = attributes;
    },
    
    refresh: function(callback) {
      callback(this.attributes);
    }
  })

  Pringle.MqlNumber = Pringle.Model.extend({
    refresh: function(callback) {
      var self = this;
      this.project.mqlValue(this.attributes.query, function(result) {
        callback(_(self.attributes).extend({ value: result }));
      });
    }
  });

  Pringle.MqlPercent = Pringle.Model.extend({
    refresh: function(callback) {
      var baseQuery = this.attributes.queries[0],
          filterQuery = baseQuery + " AND " + this.attributes.queries[1],
          self = this;

      this.project.mqlValues([ filterQuery, baseQuery ], function(filter, base) {
        var result = ( filter / base ) * 100.0;
        callback(_(self.attributes).extend({ value: result }));
      });
    }
  });

  // A view has a model. That model must respond to the refresh function, which accepts a callback that
  // expects to be called with the data with which to render the view.
  Pringle.View = Class.extend({
    init: function(model) {
      this.model = model;
      this.template = _.memoize(this._template);
      _.bind(this._template, this);
    },

    _template: function() {
      var template = $.ajax({
        url: "/templates/" + this.type + ".html",
        async: false
      }).responseText;

      return $("<div/>").html(template);
    },

    render: function(target, done) {
      var self = this;

      this.model.refresh(function(data) {
        target.html(self.template().tmpl(data));
        if (done) done();
      });
    }
  });

  Pringle.Chart = Pringle.View.extend({
    render: function(target, done) {
      var self = this;

      this.model.refresh(function(data) {
        var html = self.template().tmpl(data),
            labels,
            placeholder,
            chartData;
            
        console.log(data);

        target.html(html);
        
        placeholder = target.find(".chart");

        labels = _(data.allIterationLabels).map(function(label, idx) { 
          return [ idx, label ]; 
        });

        chartData = _(data.series).map(function(line, i) {
          return { label: line.label, data: _.zip(line.xValues, line.yValues) };
        });

        $.plot(placeholder, chartData, { 
          grid: { 
            show: true, 
            borderWidth: 0,
            color: "#bbb"
          },
          xaxis: { 
            ticks: labels
          },
          legend: {
            position: "nw",
            backgroundColor: target.closest("body").css("backgroundColor"),
            labelBoxBorderColor: "#555",
            margin: 10
          }
        });

        if (done) done();
      });
    }
  });

  Pringle.StoryWall = Pringle.Model.extend({
    refresh: function(callback) {
      var self = this,
          ex = _.expectation();

      this.project.getCardTypes(ex.expect("cardTypes"));

      this.project.getCards({
        view: this.attributes.view,
        page: "all"
      }, ex.expect("cards"));

      ex.ready(function(returns) {
        callback(self.refreshedAttributes(returns.cards[0], returns.cardTypes[0]));
      });
    },
    
    cardMethods: {
      property: function(name) {
        return _(this.properties).detect(function(property) {
          return property.name === name;
        }).value;
      }
    },

    refreshedAttributes: function(cards, cardTypes) {
      var self = this,
          cardTypeIndex,
          lanes,
          cardGroups;

      cardTypeIndex = _(cardTypes).inject(function(groups, cardType) {
        groups[cardType.name] = cardType;
        return groups;
      }, {});

      cards = _(cards).map(function(card) {
        return _.extend(card, self.cardMethods, { card_type: cardTypeIndex[card.card_type.name] });
      });

      cardGroups = _(cards).inject(function(groups, card) {
        var groupName = card.property(self.attributes.groupBy);

        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(card);

        return groups;
      }, {});

      lanes = _(self.attributes.laneNames).map(function(name) {
        return { name: name, cards: cardGroups[name] };
      });

      return _.extend({}, self.attributes, { lanes: lanes, cardTypes: cardTypes })
    }
  });
  
  Pringle.BurnupChart = Pringle.Model.extend({
    refresh: function(callback) {
      var self = this,
          ex = _.expectation(),
          allIterationLabels = [];

      _(self.attributes.series).each(function(lineAttributes) {
        var conditions = _([ self.attributes.conditions, lineAttributes.conditions ]).compact().join(" AND "),
            newQuery =  lineAttributes.query + " WHERE " + conditions;

        self.project.mql(newQuery, ex.expect(lineAttributes.label));
      });

      self.project.mql("SELECT name, number WHERE 'Type' = 'Iteration'", ex.expect("allIterations"));

      ex.ready(function(returns) {
        // This is necessary because the iteration labels returned by MQL queries that reference iterations aren't
        // the same as the labels generated by the MQL query for the iterations themselves.
        self.attributes.allIterationLabels = _(returns['allIterations'][0]['results']).map(function(iteration) {
          return "#" + iteration.number + " " + iteration.name;
        }).sort();

        _(self.attributes.series).each(function(lineAttributes) {
          var lineResults = returns[lineAttributes.label][0]["results"],
              values = self.buildValues(lineResults, self.attributes.allIterationLabels, self.attributes.cumulative);

          lineAttributes.xValues = _(values).pluck("x");
          lineAttributes.yValues = _(values).pluck("y");
        });

        callback(self.attributes);
      });
    },
    
    buildValues: function(results, allIterationLabels, isYvalueCumulative) {
      var resultSet = _(results).values(),
          allValues = _(resultSet).values(),
          rowCumMemo = 0;

      // Build the initial set.
      valuesByIteration = _(allValues).inject(function(memo, row) {
        var tuples = _(row).values(),
            dataValue,
            dataLabel;

        _(tuples).each(function(tupleMember) {
          if (tupleMember.match(/^(\d|\.)+$/)) {
            dataValue = parseInt(tupleMember, 10);
          } else {
            dataLabel = tupleMember;
          }
        });

        if (isYvalueCumulative) {
          dataValue = rowCumMemo = dataValue + rowCumMemo;
        }

        memo[dataLabel] = dataValue;

        return memo;
      }, {});

      // Normalize in terms of available iterations.
      var iterationMemo = 0;
      return _(allIterationLabels).map(function(label, idx) {
        var foundValue = valuesByIteration[label];

        // Keep values at whatever previous value was recorded; don't reset to zero.
        if (foundValue) iterationMemo = foundValue;

        return {
          x: idx,
          y: foundValue || iterationMemo
        };
      });
    }
  });
})(jQuery);
