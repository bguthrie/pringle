$(document).ready(function() {
  $(document).getProject("agile_hybrid");
  $(".storyWall").storywall();
  $(".piechart").piechart();
  
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
    
    var defaults = {
      charts: {
        cardsByType: function(cards) {
          _(cards).reduce(function(memo, card) {
            var oldValue = memo[card.card_type.name];
            memo[card.card_type.name] = ( oldValue || 0 ) + 1;
            return memo;
          }, {});
        }
      },

      cardMethods: {
        project: function() {
          return $.projects.get(this.project.identifier);
        },
        
        property: function(propName) {
          var property = _(this.properties).find(function(o) {
            return o.name === propName;
          });
          return ( property || {} ).value;
        },

        status: function() {
          return this.property(this.project().statusId);
        }
      }
    };
    
    this.options = {};
    _.extend(this.options, defaults, opts);
    _.extend(this.options.cardMethods, defaults.cardMethods, opts.cardMethods);
    _.extend(this.options.charts, defaults.charts, opts.charts);
  }
  
  $.projects = _([]);
  $.project = function(name) {
    $.projects.find(function(proj) { return proj.name === name; });
  };
  
  var addProject = function(name, opts) {
    $.projects.push(new Project(name, opts));
  };
  
  addProject("agile_hybrid", {
    statusId: 111,
    
    cardMethods: {
      status: function() {
        return this.property("Story Status") || this.property("Defect Status") ||
               this.property("Risk Status") || this.property("Feature Status");
      }
    }
  });
})(jQuery);

(function($) {
  var Mingle = {
    get: function(path, params, fn) {
      if (typeof params === "function") {
        fn = params;
        params = {};
      }

      var params = typeof(params) === "string" ? params : $.param(params || {});
      $.get("/mingle", { path: path, params: params }, fn, "jsonp");
    },

    cardMethods: {
      property: function(propName) {
        var property = _(this.properties).find(function(o) {
          return o.name === propName;
        });
        return ( property || {} ).value;
      },

      status: function() {
        return this.property("Story Status") || this.property("Defect Status") ||
               this.property("Risk Status") || this.property("Feature Status");
      }
    }
  };
  
  Mingle.Database = function(project) {
    this.project = project;
    
    _.extend(this, {
      _trigger: function(name) {
        return _.bind(function(data) {
          $(this).trigger("pringle." + name + ".set", [ data ]);
        }, this);
      },
      
      _mingle: function(path, callback) {
        Mingle.get("/projects/" + this.project.name + path, callback);
      },
      
      _project_get: function() {
        this._mingle("", this._trigger("project"));
      },
      
      _cardTypes_get: function() {
        this._mingle("/card_types", this._trigger("cardTypes"));
      },
      
      _statuses_get: function() {
        this._mingle("/property_definitions/" + this.project.statusId, this._trigger("statuses"));
      },
      
      _cards_get: function(params) {
        if (_.isNull(params)) {
          params = { page: 1 };
        }
        
        Mingle.get("/projects/" + this.project.name + "/cards", params, _.bind(function(data) {
          _(data.cards).each(function(card) {
            _.extend(card, this.project.cardMethods);
          })

          $(this).trigger("cards", [ data ]);
        }, this));
      }
    });
    
    _.bindAll(this);
    
    _(["project", "statuses", "cards", "cardTypes"]).each(function(callback) {
      $(this).bind("pringle." + callback + ".get", _.bind(function(evt, args) {
        this["_" + callback + "_get"](args);
      }, this));
    });
  };
  
  _.extend($.fn, {
    _makeTrigger: function(name) {
      return _.bind(function(data) {
        this.trigger(name, [ data ]);
      }, this);
    },

    getProject: function(name) {
      return $(this).each(_.bind(function() {
        $(this).dataset("project-name", name);
        Mingle.get("/projects/" + name, $(this)._makeTrigger("project"));
        $(this).getCardTypes().getStatuses(111).getCards();
      }, this))
    },

    getCardTypes: function() {
      return $(this).each(_.bind(function() {
        var project = $(this).dataset("project-name");
        Mingle.get("/projects/" + project + "/card_types", this._makeTrigger("cardTypes"));
      }, this))
    },

    getStatuses: function(definitionId) {
      return $(this).each(_.bind(function() {
        var project = $(this).dataset("project-name");
        Mingle.get("/projects/" + project + "/property_definitions/" + definitionId, this._makeTrigger("statuses"));
      }, this));
    },

    getCards: function(params) {
      return $(this).each(_.bind(function() {
        if (_.isNull(params)) {
          params = { page: 1 };
        }

        var elt = $(this);
        var project = elt.dataset("project-name");

        Mingle.get("/projects/" + project + "/cards", params, function(data) {
          _(data.cards).each(function(card) {
            _.extend(card, Mingle.cardMethods);
          })

          elt.trigger("cards", [ data ]);
        });
      }, this));
    }
  });
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
      
      $(document).bind("cards", function(evt, data) {
        self._setCards(data.cards);
      });
    },
    
    _makeChart: function() {
      $("<div/>").addClass("chartBody").appendTo(this.element.find(".body"));
      this.options.r = Raphael(this.element.find(".chartBody")[0]);
    },

    _setCards: function(cards) {
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
    
    _renderPie: function(evt, data) {
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

      $(document).bind("project", function(evt, data) {
        self._setProject(data.project);
      });

      $(document).bind("cards", function(evt, data) { self._resize(); });
    },
    
    _makeLegend: function() {
      $("<ul class='legend'/>").legend().appendTo(this.element.find(".header"));
    },
    
    _makeWall: function() {
      $("<ul class='wall'/>").addClass(this.options.orientation).swimlanes().appendTo(this.element.find(".body"));
    },

    _setProject: function(project) {
      this.options.project = project;
      this.element.find(".heading").html(this.options.project.name);
      this.show();
    },

    _setStatuses: function(statuses) {
      this.element.find(".wall").swimlanes({ statuses: statuses });
    },

    _resize: function() {
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
      $(document).bind("statuses", _.bind(function(evt, data) {
        console.log(this);
        this._setStatuses(data.property_definition.property_value_details);
      }, this));
    },

    _setStatuses: function(statuses) {
      console.log(this);
      _(statuses).each(function(status) {
        console.log("in loop");
        console.log(this);
        $(this.options.template).tmpl(status).appendTo(this.element);
        this.element.find(".cards").cards();
      }, this);
    }
  });

  $.widget("pringle.cards", {
    options: {
      template: "#cardTemplate"
    },

    _create: function() {
      this.options.name = this.element.closest(".swimlane").dataset("name");
      var self = this;

      $(document).bind("cards", _.bind(function(evt, data) {
        var cards = $(data.cards).filter(function() {
          return this.status() == self.options.name;
        });

        self._setCards(cards);
      }, this));
    },

    _setCards: function(cards) {
      _(cards).each(function(card) {
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
      $(document).bind("cardTypes", _.bind(function(evt, data) {
        self._setCardTypes(data.card_types);
      }, this));
    },

    _setCardTypes: function(cardTypes) {
      _(cardTypes).each(function(cardType) {
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
