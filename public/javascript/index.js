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
  cardFilter: "page=all",
  
  Card: {
    blank: function() {
      if (!Pringle.Card.template) {
        Pringle.Card.template = $( $("#cardTemplate").html() );
      }
      
      return $( $("#cardTemplate").html() ).clone();
    },
    
    html: function(card) {
      var tmpl = Pringle.Card.blank();
      
      tmpl.attr("data-type", card.card_type.name);
      tmpl.attr("id", "#" + card.number);
      
      tmpl.find(".number").html("#" + card.number);
      tmpl.find(".name").html(card.name);
      tmpl.find(".type").html(card.card_type.name);
      tmpl.find(".owner").html( (Mingle.property(card, "Owner") || {}).name );
      
      tmpl.css({ backgroundColor: Pringle.cardColors[card.card_type.name] });

      if (Mingle.property(card, "Blocked") === "Yes") {
        tmpl.addClass("blocked");
      }

      return tmpl;
    }
  },
  
  initCards: function() {
    Mingle.get("/projects/agile_hybrid/cards", Pringle.cardFilter, function(data) {
      Pringle.storyWall.swimlanes().find(".card").remove();
      var template = $( $("#cardTemplate").html() );
      
      $(data.cards).each(function() {
        var status = Mingle.property(this, "Story Status") || Mingle.property(this, "Defect Status") || Mingle.property(this, "Risk Status") || Mingle.property(this, "Feature Status");
        var card = Pringle.Card.html(this);
        Pringle.storyWall.swimlane(status).append(card);
      });

      Pringle.storyWall.show();
      $.unblockUI();
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
  
  init: function() {
    $.blockUI();
    Pringle.storyWall = $("#storyWall");
    Pringle.storyWall.hide();
    Pringle.initProperties();
    Pringle.initFavorites();
  },
  
  refreshCards: function() {
    $.blockUI();
    Pringle.initCards();
  }
};

$(document).ready(function() {
  Pringle.init();
  
  $("#cardFilter").submit(function(e) {
    e.preventDefault();
        
    Pringle.cardFilter = $(this).serialize();
    Pringle.refreshCards();
    
    return false;
  });
  
  // $("select[name=view]").inputmultiselect();
  
  $("select[name=view]").change(function() {
    $(this).closest("form").submit();
  })
  
  $(".refresh").click(function(e) {
    e.preventDefault();
    Pringle.refreshCards();
  });
});
