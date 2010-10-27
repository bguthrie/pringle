Mingle = {
  get: function(path, params, fn) {
    if (typeof params === "function") {
      fn = params;
      params = {};
    }

    var params = typeof(params) == "string" ? params : $.param(params || {});
    $.get("/mingle", { path: path, params: params }, fn, "jsonp");
  },

  property: function(card, propName) {
    var property = null;
    $(card.properties).each(function() {
      if (this.name === propName) { property = this; }
    });
    return property ? property.value : null;
  }
};

$.fn.swimlanes = function() {
  return $(this).find("tbody .swimlane");
};

$.fn.swimlane = function(laneName) {
  return $(this).swimlanes().filter("[data-name='" + laneName + "']");
};

Pringle = {
  cardColors: {},
  storyWall: [],
  cardFilter: "page=1",
  
  Card: {
    blank: function() {
      if (!Pringle.Card.template) {
        Pringle.Card.template = $( $("#cardTemplate").html() );
      }
      
      return $( $("#cardTemplate").html() ).clone();
    },
    
    html: function(card) {
      var tmpl = Pringle.Card.blank();
      
      tmpl.dataset({ type: card.card_type.name, modified: card.modified_on });
      tmpl.attr("id", card.number);
      
      tmpl.find(".number").html("#" + card.number);
      tmpl.find(".name").html(card.name);
      tmpl.find(".type").html(card.card_type.name);
      tmpl.find(".owner").html( (Mingle.property(card, "Owner") || {}).name );
      
      tmpl.css({ backgroundColor: Pringle.cardColors[card.card_type.name] });

      if (Mingle.property(card, "Blocked") === "Yes") {
        tmpl.addClass("blocked");
      }

      return tmpl;
    },
    
    status: function(card) {
      return Mingle.property(card, "Story Status") || 
             Mingle.property(card, "Defect Status") || 
             Mingle.property(card, "Risk Status") || 
             Mingle.property(card, "Feature Status");
    },
    
    addToWall: function(card) {
      var status = Pringle.Card.status(card);
      var card = Pringle.Card.html(card);
      Pringle.storyWall.swimlane(status).append(card);
    }
  },
  
  Lifecycle: {
    init: function() {
      $.blockUI();
      Pringle.storyWall = $("#storyWall");
      Pringle.storyWall.hide();
      Pringle.initProperties();
      Pringle.initFavorites();
    },
    
    endInit: function() {
      // Order matters for these next few lines, unfortunately..
      Pringle.storyWall.show();
      Pringle.laneWidth = Pringle.storyWall.swimlanes().first().width();
      
      Pringle.Window.adjustHeight();
      Pringle.Window.adjustLanes();
      setInterval(Pringle.refreshCards, 10000);
      
      $.unblockUI();
    }
  },
  
  initCards: function() {
    Mingle.get("/projects/agile_hybrid/cards", Pringle.cardFilter, function(data) {
      Pringle.storyWall.swimlanes().find(".card").remove();
      var template = $( $("#cardTemplate").html() );
      
      $(data.cards).each(function() {
        Pringle.Card.addToWall(this);
      });
      
      Pringle.Lifecycle.endInit();
    });
  },
  
  initCardColors: function() {
    Mingle.get("/projects/agile_hybrid/card_types", function(data) {
      $(data.card_types).each(function() {
        Pringle.cardColors[this.name] = this.color;
      });
    });

    Pringle.initCards();
  },
  
  initProperties: function() {
    Mingle.get("/projects/agile_hybrid/property_definitions/111", function(data) {
      var template = $( $("#swimlaneTemplate").html() );

      var headers = $(data.property_definition.property_value_details).map(function() {
        return $("<th/>").addClass("swimLane").html(this.value).dataset({name: this.value});
      });

      var emptyCols = $(data.property_definition.property_value_details).map(function() {
        return $("<td>&nbsp;</td>").addClass("swimLane").dataset({name: this.value});
      });

      $(headers).appendTo(Pringle.storyWall.find("thead tr"));
      $(emptyCols).appendTo(Pringle.storyWall.find("tbody tr"));

      Pringle.initCardColors();
    });
  },
  
  initFavorites: function() {
    var option = $("<option></option>");
    var select = $("select[name=view]");
    
    Mingle.get("/projects/agile_hybrid/favorites", function(data) {
      $(data.favorites).each(function() {
        select.append(option.clone().attr("value", this.name).html(this.name));
      });
    });
  },
  
  refreshCards: function() {
    $("#spinner").show();
    
    Mingle.get("/projects/agile_hybrid/cards", Pringle.cardFilter, function(data) {
      var htmlCards = $(".card");
      var dataCards = $(data.cards);
      
      var htmlNumberFn = function() { return parseInt($(this).attr("id"), 10); };
      var dataNumberFn = function() { return this.number; };
      
      var htmlNumbers = htmlCards.map(htmlNumberFn);
      var dataNumbers = dataCards.map(dataNumberFn);
      
      var indexed = function(ary, fn) {
        var newAry = [];
        $(ary).each(function() {
          newAry[fn.apply(this)] = this;
        });
        return newAry;
      };
      
      var htmlCardsIdx = indexed(htmlCards, htmlNumberFn);
      
      $(htmlNumbers).not($(dataNumbers)).each(function() {
        $(htmlCardsIdx[this]).remove();
      });
      
      var dataCardsIdx = indexed(dataCards, dataNumberFn);
      
      $(dataNumbers).not($(htmlNumbers)).each(function() {
        Pringle.Card.addToWall(dataCardsIdx[this]);
      });
      
      $(dataNumbers).filter($(htmlNumbers)).each(function() {
        var card = dataCardsIdx[this];
        var html = $(htmlCardsIdx[this]);

        if (html.dataset().modified !== card.modified_on) {
          html.remove();
          Pringle.Card.addToWall(card);
        }
      });
      
      Pringle.Window.adjustHeight();
      Pringle.Window.adjustLanes();
      
      $("#spinner").hide();
    });
  },
  
  Window: {
    adjustLanes: function() {
      var lanes = Pringle.storyWall.swimlanes();
      var numLanes = lanes.length;
      var winWidth = $(window).width();
      var maxNumLanes = winWidth / Pringle.laneWidth;

      if (maxNumLanes > numLanes) {
        var lanesToResize = maxNumLanes - numLanes;
        var lanesSorted = lanes.sort(function(l1, l2) {
          return $(l2).find(".card").length - $(l1).find(".card").length;
        });

        lanesSorted.slice(0, lanesToResize).css({ width: ( Pringle.laneWidth * 2 ) + 8 });
      } else {
        lanes.css({ width: Pringle.laneWidth });
      }
    },
    
    adjustHeight: function() {
      $("#main").css({ height: $(window).height() - $("#footer").height() - 1 });
    }
  }
};

$(document).ready(function() {
  Pringle.Lifecycle.init();
  
  $("#cardFilter").submit(function(e) {
    e.preventDefault();
        
    Pringle.cardFilter = $(this).serialize();
    Pringle.refreshCards();
    
    return false;
  });
  
  var submitForm = function(e) { 
    e.preventDefault();
    $(this).closest("form").submit();
    return false;
  };
  
  $("select[name=view]").change(submitForm);
  $(".refresh").click(submitForm);
  
  $(window).resize(Pringle.Window.adjustHeight);
  $(window).resize(Pringle.Window.adjustLanes);
});
