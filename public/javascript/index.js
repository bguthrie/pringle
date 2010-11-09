$(document).ready(function() {
  var project = $.project("agile_hybrid");
  
  $(".storyWall").storywall({ project: project });
  $(".piechart").piechart({ project: project });
  
  $("#pringleView").change(function() {
    $(".storyWall").storywall("orientation", $(this).val());
  });
  
  $(window).resize(function() {
    $("#content > .body").height($(window).height() - $("#footer").height() - 30);
  })
});

(function($) {
  var Project = function(name, opts) {
    this.name = name;
    
    var defaultCharts = {
      cardsByType: function(cards) {
        _(cards).reduce(function(memo, card) {
          var oldValue = memo[card.card_type.name];
          memo[card.card_type.name] = ( oldValue || 0 ) + 1;
          return memo;
        }, {});
      }
    };
    
    var defaultCardMethods = {
      property: function(propName) {
        var property = _(this.properties).find(function(o) {
          return o.name === propName;
        });
        return ( property || {} ).value;
      },

      status: function() {
        return this.property(this.project.options.statusName);
      }
    };
    
    this.options = {};
    
    _.extend(this.options, opts);
    this.options.cardMethods = _.extend(defaultCardMethods, opts.cardMethods);
    this.options.charts = _.extend(defaultCharts, opts.charts);
    
    $(this).bind("pringle.project.get", this._getProject).
            bind("pringle.cardTypes.get", this._getCardTypes).
            bind("pringle.statuses.get", this._getStatuses).
            bind("pringle.cards.get", this._getCards);
  };
  
  _.extend(Project.prototype, {
    _mingle: function(path, params, callback) {
      if (_.isFunction(params)) {
        callback = params;
        params = {};
      }

      params = typeof(params) === "string" ? params : $.param(params || {});
      path = "/projects/" + this.name + path;
      callback = _.bind(callback, this);
      
      $.get("/mingle", { path: path, params: params }, callback, "jsonp");
    },
    
    _getProject: function(evt) {
      this._mingle("", this._setProject);
    },
    
    _setProject: function(data) {
      $(this).trigger("pringle.project.set", [ data ]);
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
    },
  });
  
  _.bindAll(Project);
  
  $.projects = _([]);
  
  $.project = function(name) {
    var p = $.projects.find(function(proj) { return proj.name === name; });
    return $(p);
  };
  
  $.projects.define = function(name, opts) {
    this.push(new Project(name, opts));
  };
})(jQuery);

(function($) {
  $.projects.define("agile_hybrid", {
    statusId: 111,
    
    cardMethods: {
      status: function() {
        return this.property("Story Status") || this.property("Defect Status") ||
               this.property("Risk Status") || this.property("Feature Status");
      }
    }
  });
  
  $.projects.define("rapidftr", { statusId: 286, statusName: "Status" });
})(jQuery);

(function($) {
  $.widget("pringle.piechart", {
    options: {
      data: {"avalue": 1, "bvalue": 2},
      width: 640,
      height: 500,
      radius: 100
    },
    
    _create: function() {
      var self = this;
      
      self._makeChart();
      this.options.project.bind("pringle.cards.set", _.bind(this._setCards, this));

      this.options.project.trigger("pringle.project.get");
      this.options.project.bind("pringle.project.set", _.bind(function() {
        this.options.project.trigger("pringle.cards.get");
      }, this));
    },
    
    _makeChart: function() {
      $("<div/>").addClass("chartBody").appendTo(this.element.find(".body"));
      this.options.r = Raphael(this.element.find(".chartBody")[0]);
    },

    _setCards: function(evt, data) {
      var cards = data.cards;
      
      var cardsIndexed = _(cards).reduce(function(memo, card) {
        var oldValue = memo[card.card_type.name];
        memo[card.card_type.name] = ( oldValue || 0 ) + 1;
        return memo;
      }, {});
      
      this._setData(cardsIndexed);
    },
    
    _setData: function(data) {
      this.options.data = data;
      this._renderPie();
    },
    
    _getData: function() {
      var data = $.isFunction(this.options.data) ? this.options.data() : this.options.data;
      return _(data);
    },
    
    _renderPie: function() {
      var data = this._getData();
      
      var pie = this.options.r.g.piechart(
        320, 
        200, 
        this.options.radius, 
        data.values(), 
        {
          legend: data.keys(), 
          legendpos: "west",
          legendcolor: "white"
        }
      );
      
      pie.hover(function() {
          this.sector.stop();
          this.sector.scale(1.1, 1.1, this.cx, this.cy);
          if (this.label) {
              this.label[0].stop();
              this.label[0].scale(1.5);
              this.label[1].attr({"font-weight": 800});
          }
      }, function() {
          this.sector.animate({scale: [1, 1, this.cx, this.cy]}, 500, "bounce");
          if (this.label) {
              this.label[0].animate({scale: 1}, 500, "bounce");
              this.label[1].attr({"font-weight": 400});
          }
      });
    }
  });
})(jQuery);

(function($) {
  $.widget("pringle.storywall", {
    options: {
      orientation: "vertical",
      hidden: false,
      laneWidth: 130
    },

    _create: function() {
      var self = this;

      this._makeLegend();
      this._makeWall();

      $(window).resize(function(evt) { self._resize(); });
      
      // this.options.project.bind("pringle.project.set", _.bind(this._setProject, this));
      this.options.project.bind("pringle.cards.set", _.bind(this._resize, this));

      // this.options.project.trigger("pringle.project.get");
      this.element.find(".heading").html(this.options.project.name);
      this.show();
    },
    
    _makeLegend: function() {
      $("<ul class='legend'/>").legend({ 
        project: this.options.project 
      }).appendTo(this.element.find(".header"));
    },
    
    _makeWall: function() {
      $("<ul class='wall'/>").addClass(this.options.orientation).swimlanes({
        project: this.options.project
      }).appendTo(this.element.find(".body"));
    },

    _setProject: function(evt, data) {
      var project = data.project;
      this.element.find(".heading").html(this.options.project.name);
      this.show();
    },

    _resize: function(evt, data) {
      var lanes = this.element.find(".swimlane");

      if (this.options.orientation === "vertical") {
        var numLanes = lanes.length;
        var winWidth = this.element.width();
        var maxNumLanes = winWidth / this.options.laneWidth;
        var lanesToResize = maxNumLanes - numLanes;
        var lanesSorted = lanes.sort(function(l1, l2) {
          return $(l2).find(".card").length - $(l1).find(".card").length;
        });

        lanesSorted.slice(0, lanesToResize).css({ width: ( this.options.laneWidth * 2 ) });
        lanesSorted.slice(lanesToResize, -1).css({ width: this.options.laneWidth });
      } else {
        lanes.css({ width: null });
      }
    },

    orientation: function(newOrientation) {
      var wall = this.element.find(".wall");
      wall.removeClass("horizontal").removeClass("vertical").addClass(newOrientation);
      this.options.orientation = newOrientation;
      this._resize();
    },

    hide: function(event, ui) {
      this.element.fadeOut();
    },

    show: function(event, ui) {
      this.element.fadeIn();
    }
  });

  $.widget("pringle.swimlanes", {
    options: {
      template: "#laneTemplate",
      cardTemplate: "#cardTemplate"
    },

    _create: function() {
      this.options.project.bind("pringle.statuses.set", _.bind(this._setStatuses, this));
      this.options.project.trigger("pringle.statuses.get");
    },

    _setStatuses: function(evt, data) {
      _(data.property_definition.property_value_details).each(function(status) {
        $(this.options.template).tmpl(status).appendTo(this.element);
        this.element.find(".cards").cards({ project: this.options.project });
      }, this);
      
      this.options.project.trigger("pringle.cards.get");
    }
  });

  $.widget("pringle.cards", {
    options: {
      template: "#cardTemplate"
    },

    _create: function() {
      this.options.name = this.element.closest(".swimlane").dataset("name");
      var self = this;
      
      this.options.project.bind("pringle.cards.set", _.bind(this._setCards, this));
    },

    _setCards: function(evt, data) {
      _(data.cards).chain().select(function(card) {
        return card.status() === this.options.name;
      }, this).each(function(card) {
        var color = $(".legend").legend('colorFor', card.card_type.name);
        $(this.options.template).tmpl(card).css({ display: "none", backgroundColor: color }).appendTo(this.element).fadeIn();
      }, this);
    }
  });

  $.widget("pringle.legend", {
    options: {
      template: "#legendKeyTemplate"
    },

    _create: function() {
      this.options.project.trigger("pringle.cardTypes.get");
      this.options.project.bind("pringle.cardTypes.set", _.bind(this._setCardTypes, this));
    },

    _setCardTypes: function(evt, data) {
      _(data.card_types).each(function(cardType) {
        $(this.options.template).tmpl(cardType).appendTo(this.element);
      }, this);
      
      this.show();
    },

    hide: function(event, ui) {
      this.element.fadeOut();
    },

    show: function(event, ui) {
      this.element.fadeIn();
    },

    colorFor: function(typeName) {
      return this.element.find(".legendKey[data-name='" + typeName + "']").dataset("color");
    }
  });
})(jQuery);


// //   initFavorites: function() {
// //     var option = $("<option></option>");
// //     var select = $("select[name=view]");
// //     
// //     Mingle.get("/projects/agile_hybrid/favorites", function(data) {
// //       $(data.favorites).each(function() {
// //         select.append(option.clone().attr("value", this.name).html(this.name));
// //       });
// //     });
// //   },

// // $(document).ready(function() {
// //   $("#cardFilter").submit(function(e) {
// //     var newParams = $.deparam($(this).serialize());
// //     $.bbq.pushState(newParams);
// //     e.preventDefault();
// //     return false;
// //   }).find("select, input").change(function(e) {
// //     $(this).closest("form").submit(); 
// //     e.preventDefault();
// //   });
// //   
// //   $("#pringleView").change(function() {
// //     var orientation = $(this).val();
// //     
// //     Pringle.storyWall.fadeOut({complete: function() {
// //       Pringle.storyWall.attr("class", orientation);
// //       Pringle.Window.adjustLanes();
// //       Pringle.storyWall.fadeIn();
// //     }});
// //   });
// //   
// //   $(window).bind("hashchange", function(e) {
// //     Pringle.refreshCards();
// //   });
// // });
