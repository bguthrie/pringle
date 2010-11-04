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
  getProject: function(name) {
    return $(this).each(function() {
      var elt = $(this);
      elt.dataset("project-name", name);

      Mingle.get("/projects/" + name, function(data) {
        elt.trigger("project", [ data ]);
      });
      
      elt.getCardTypes().getStatuses(111).getCards();
    })
  },
  
  getCardTypes: function() {
    return $(this).each(function() {
      var elt = $(this);
      var project = elt.dataset("project-name");

      Mingle.get("/projects/" + project + "/card_types", function(data) {
        elt.trigger("cardTypes", [ data ]);
      });
    })
  },
  
  getStatuses: function(definitionId) {
    return $(this).each(function() {
      var elt = $(this);
      var project = elt.dataset("project-name");
    
      Mingle.get("/projects/" + project + "/property_definitions/" + definitionId, function(data) {
        elt.trigger("statuses", [ data ]);
      });
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
    
    if (this.options.orientation === "vertical") {
      var lanes = this.element.find(".swimlane");
      var numLanes = lanes.length;
      var winWidth = this.element.width();
      var maxNumLanes = winWidth / this.options.laneWidth;
      var lanesToResize = maxNumLanes - numLanes;
      var lanesSorted = lanes.sort(function(l1, l2) {
        return $(l2).find(".card").length - $(l1).find(".card").length;
      });
      
      lanesSorted.slice(0, lanesToResize).css({ width: ( this.options.laneWidth * 2 ) });
      lanesSorted.slice(lanesToResize, -1).css({ width: this.options.laneWidth });
    }
  },
  
  orientation: function(newOrientation) {
    console.log("changing to " + newOrientation);
    var wall = this.element.find(".wall");
    console.log(wall.attr("class"));
    wall.removeClass("horizontal").removeClass("vertical").addClass(newOrientation);
    console.log(wall.attr("class"));
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

$(document).ready(function() {
  $(document).getProject("agile_hybrid");
  $(".storyWall").storywall();
  
  $("#pringleView").change(function() {
    $(".storyWall").storywall("orientation", $(this).val());
  });
});

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
