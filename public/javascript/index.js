$(document).ready(function() {
  $(document).getProject("agile_hybrid");
  $(".storyWall").storywall();
  $(".piechart").piechart();
  
  $("#pringleView").change(function() {
    $(".storyWall").storywall("orientation", $(this).val());
  });
});


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
        var property = null;
        $(this.properties).each(function() {
          if (this.name === propName) { property = this; }
        });
        return property ? property.value : null;
      },

      status: function() {
        return this.property("Story Status") || this.property("Defect Status") ||
               this.property("Risk Status") || this.property("Feature Status");
      }
    }
  };
  
  $.extend($.fn, {
    _makeTrigger: function(name) {
      var self = $(this);

      return function(data) {
        self.trigger(name, [ data ]);
      };
    },

    getProject: function(name) {
      return $(this).each(function() {
        var elt = $(this);

        elt.dataset("project-name", name);
        Mingle.get("/projects/" + name, elt._makeTrigger("project"));
        elt.getCardTypes().getStatuses(111).getCards();
      })
    },

    getCardTypes: function() {
      return $(this).each(function() {
        var elt = $(this);

        var project = elt.dataset("project-name");
        Mingle.get("/projects/" + project + "/card_types", elt._makeTrigger("cardTypes"));
      })
    },

    getStatuses: function(definitionId) {
      return $(this).each(function() {
        var elt = $(this);
        var project = elt.dataset("project-name");
        Mingle.get("/projects/" + project + "/property_definitions/" + definitionId, elt._makeTrigger("statuses"));
      });
    },

    getCards: function(params) {
      return $(this).each(function() {
        if (!$.isPlainObject(params)) {
          params = { page: 1 };
        }

        var elt = $(this);
        var project = elt.dataset("project-name");

        Mingle.get("/projects/" + project + "/cards", params, function(data) {
          $(data.cards).each(function() {
            $.extend(this, Mingle.cardMethods);
          })

          elt.trigger("cards", [ data ]);
        });
      });
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
      
      this.options.r = Raphael(this.element.find(".graph")[0]);
      
      $(document).bind("cards", function(evt, data) {
        self._setCards(data.cards);
      });
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

      this.element.find(".legend").legend();
      this.element.find(".wall").swimlanes();

      $(window).resize(function(evt) { self._resize(); });

      $(document).bind("project", function(evt, data) {
        self._setProject(data.project);
      });

      $(document).bind("cards", function(evt, data) { self._resize(); });
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
      this.element.find(".wall").css({ height: $(window).height() - $("#footer").height() - 30 });

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
      var self = this;

      $(document).bind("statuses", function(evt, data) {
        self._setStatuses(data.property_definition.property_value_details);
      });

    },

    _setStatuses: function(statuses) {
      var self = this;

      $(statuses).each(function() {
        $(self.options.template).tmpl(this).appendTo(self.element);
        self.element.find(".cards").cards();
      });
    }
  });

  $.widget("pringle.cards", {
    options: {
      template: "#cardTemplate"
    },

    _create: function() {
      this.options.name = this.element.closest(".swimlane").dataset("name");
      var self = this;

      $(document).bind("cards", function(evt, data) {
        var cards = $(data.cards).filter(function() {
          return this.status() == self.options.name;
        });

        self._setCards(cards);
      });
    },

    _setCards: function(cards) {
      var self = this;

      $(cards).each(function() {
        var color = $(".legend").legend('colorFor', this.card_type.name);
        $(self.options.template).tmpl(this).css({ display: "none", backgroundColor: color }).appendTo(self.element).fadeIn();
      });
    }
  });

  $.widget("pringle.legend", {
    options: {
      template: "#legendKeyTemplate"
    },

    _create: function() {
      var self = this;

      $(document).bind("cardTypes", function(evt, data) {
        self._setCardTypes(data.card_types);
      });

      self.show();
    },

    _setCardTypes: function(cardTypes) {
      var self = this;

      $(cardTypes).each(function() {
        $(self.options.template).tmpl(this).appendTo(self.element);
      });
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
