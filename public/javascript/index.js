Mingle = {
  get: function(path, params, fn) {
    if (typeof params === "function") {
      fn = params;
      params = {};
    }

    $.get("/mingle", { path: path, params: $.param(params || {}) }, fn, "json");
  },

  property: function(card, propName) {
    var property = null;
    $(card.properties).each(function() {
      if (this.name === propName) { property = this; }
    });
    if (property) { console.log(property.value); }
    return property ? property.value : null;
  }
}

$.fn.swimlane = function(laneName) {
  return $(this).find("tbody .swimLane").filter("[data-name='" + laneName + "']");
};

$(document).ready(function() {
  $("#status").html("Loading story wall...");
  var storyWall = $("#storyWall");
  storyWall.hide();
  var CardColors = {};

  var initCards = function() {
    Mingle.get("/projects/agile_hybrid/cards", { page: "all" }, function(data) {
      var template = $( $("#cardTemplate").html() );

      $(data.cards).each(function() {
        var status = Mingle.property(this, "Story Status") || Mingle.property(this, "Defect Status") || Mingle.property(this, "Risk Status") || Mingle.property(this, "Feature Status");

        var card = template.clone();
        card.attr("data-type", this.card_type.name);
        card.css({ backgroundColor: CardColors[this.card_type.name] });
        card.find(".number").html("#" + this.number);
        card.find(".name").html(this.name);
        card.find(".type").html(this.card_type.name);
        card.find(".owner").html( (Mingle.property(this, "Owner") || {}).name );

        if (Mingle.property(this, "Blocked") === "Yes") {
          card.addClass("blocked");
        }

        storyWall.swimlane(status).append(card);
      });

      $("#status").html("");
      storyWall.show();
    });
  };

  var initCardColors = function() {
    Mingle.get("/projects/agile_hybrid/card_types", function(data) {
      $(data.card_types).each(function() {
        CardColors[this.name] = this.color;
      });
    });

    initCards();
  };

  Mingle.get("/projects/agile_hybrid/property_definitions/111", function(data) {
    var template = $( $("#swimlaneTemplate").html() );

    var headers = $(data.property_definition.property_value_details).map(function() {
      return $("<th/>").addClass("swimLane").html(this.value).dataset({name: this.value});
    });

    var emptyCols = $(data.property_definition.property_value_details).map(function() {
      return $("<td>&nbsp;</td>").addClass("swimLane").dataset({name: this.value});
    });

    $(headers).appendTo(storyWall.find("thead tr"));
    $(emptyCols).appendTo(storyWall.find("tbody tr"));

    initCardColors();
  });
});
