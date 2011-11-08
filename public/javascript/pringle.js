(function($) {
  window.Pringle = {};

  Pringle.readies = [];

  Pringle.DEFAULT_ROOT = "#content .body";

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

  Pringle.init = function(viewRoot) {
    var projectName  = window.location.toString().match(/\/pringle\/(\w+)\??/)[1],
        project      = new Mingle.Project(projectName),
        viewport     = new Pringle.Viewport(projectName, viewRoot || Pringle.DEFAULT_ROOT)

    addProjectStyleSheet(projectName);
    addProjectJavascript(projectName);

    project.fetch(function() {
      _(Pringle.readies).each(function(ready) { ready(viewport, project); });
    });
  };

  Pringle.ready = function(callback) {
    Pringle.readies.push(callback);
  };

  $.Class("Pringle.Viewport", {}, {
    init: function(projectName, root) {
      this.projectName = projectName;
      this.root = $(root);
      this.target = this.root.find(".content");
      this.curtain = this.root.find(".curtain");
      this.views = [];
      this.paused = false;

      var self = this;
      $(window).bind("statechange", function() {
        console.log("pringle: Received URL state change event");
        self.setView(self._currentViewState());
      });

      var fadeTimer = null,
          navElt = $("#content .nav");

      $(window).bind("mousemove", function() {
        if (fadeTimer) clearTimeout(fadeTimer);

        if (navElt.is(":hidden")) navElt.fadeIn();

        if (!self.paused) {
          fadeTimer = setTimeout(function() { navElt.fadeOut(); }, 500);
        }
      });

      navElt.find(".prev").click(function(evt) { evt.preventDefault(); self.prev(); });

      navElt.find(".next").click(function(evt) { evt.preventDefault(); self.next(); });

      navElt.find(".pause").click(function(evt) { 
        evt.preventDefault();

        if (self.paused) {
          fadeTimer = setTimeout(function() { navElt.fadeOut(); }, 500);
          $(this).removeClass("paused");
          self.unpause();
        } else {
          if (fadeTimer) clearTimeout(fadeTimer);
          $(this).addClass("paused"); 
          self.pause();
        }
      });
    },

    pause: function() {
      this.paused = true;
      if (this.nextTimeout) clearTimeout(this.nextTimeout);
    },

    unpause: function() {
      this.paused = false;
      this.next();
    },

    hide: function(then) {
      this.curtain.fadeIn("slow", then);
    },

    show: function(then) {
      this.curtain.fadeOut("slow", then);
    },

    setView: function(viewIdx) {
      var self = this,
          view = self.views[viewIdx];

      console.log("Showing view " + viewIdx);

      if (self.nextTimeout) clearTimeout(self.nextTimeout);
      self.nextTimeout = null;

      this.hide(function() {
        view.render(self.target, function() {
          self.show();
          self._scheduleViewRotation();
        });
      });
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
      this.rotationSpeed = speed;
      this._triggerViewChange(viewIdx || this._currentViewState());
    },

    next: function() {
      this._triggerViewChange(( this._currentViewState() + 1 ) % this.views.length);
    },

    prev: function() {
      // Apparently the JS mod operator doesn't work in reverse.
      var prevViewIdx = ( this._currentViewState() === 0 ? this.views.length : this._currentViewState() ) - 1;
      this._triggerViewChange(prevViewIdx);
    },

    _scheduleViewRotation: function() {
      if (!this.paused) {
        var self = this;
        this.nextTimeout = setTimeout(function() { self.next(); }, this.rotationSpeed);
      }
    },

    _triggerViewChange: function(viewIdx) {
      console.log("pringle: Triggering display of view " + viewIdx);
      console.log("pringle: Next URL is /pringle/" + this.projectName + "?" + viewIdx);
      window.History.pushState({ view: viewIdx }, null, "/pringle/" + this.projectName + "?" + viewIdx);
    },

    _currentViewState: function() {
      if (!_(window.location.search).isEmpty()) {
        return parseInt(window.location.search.match(/\?(\d+).*/)[1], 10);
      } else {
        return 0;
      }
    }
  });
  
  $.Class("Pringle.Model", {}, {
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

  Pringle.Model.extend("Pringle.MqlPercent", {}, {
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
  $.Class("Pringle.View", {}, {
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

  Pringle.View.extend("Pringle.Chart", {}, {
    render: function(target, done) {
      var self = this;

      this.model.refresh(function(data) {
        var html = self.template().tmpl(data),
            labels,
            placeholder,
            chartData;
            
        target.html(html);
        
        placeholder = target.find(".chart");

        labels = _(data.xAxisLabels).map(function(label, idx) { 
          return [ idx, label ]; 
        });

        chartData = _(data.series).map(function(line, i) {
          return { label: line.label, data: _.zip(line.xValues, line.yValues) };
        });

        $.plot(placeholder, chartData, { 
          grid: { 
            show: true, 
            borderWidth: 4,
            color: "#888",
            borderColor: "#444",
            backgroundColor: "#222"
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

  Pringle.Model.extend("Pringle.StoryWall", {}, {
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
  
  Pringle.Model.extend("Pringle.BurnupChart", {}, {
    refresh: function(callback) {
      var self = this,
          ex = _.expectation(),
          allIterationLabels = [];

      _(self.attributes.series).each(function(lineAttributes) {
        var conditions = _([ self.attributes.conditions, lineAttributes.conditions ]).compact().join(" AND "),
            newQuery =  lineAttributes.query + " WHERE " + conditions;

        self.project.mql(newQuery, ex.expect(lineAttributes.label));
      });

      if (this.attributes.xAxis && this.attributes.xAxis.values) {
        self.project.mql(this.attributes.xAxis.values, ex.expect("xValues"));
      }

      ex.ready(function(returns) {
        if (!self.attributes.xAxisLabels && returns.xValues) {
          self.attributes.xAxisLabels = self.attributes.xAxis.transform(returns.xValues[0]);
        }

        _(self.attributes.series).each(function(lineAttributes) {
          var lineResults = returns[lineAttributes.label][0]["results"],
              values = self.buildValues(lineResults, self.attributes.xAxisLabels, self.attributes.cumulative);

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
