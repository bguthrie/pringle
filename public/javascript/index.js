Mingle = {
  get: function(path, params, fn) {
    if (typeof params === "function") {
      fn = params;
      params = {};
    }

    if (typeof fn === "undefined") {
      fn = function(data) { console.log(data); };
    }

    $.get("/mingle", { path: path, params: $.param(params || {}) }, fn, "json");
  },

  property: function(card, propName) {
    var property = null;
    $(card.properties).each(function() {
      if (this.name === propName) { property = this; }
    });

    return property ? property.value : null;
  }
}

$(document).ready(function() {
  $("#status").html("Loading story wall...");
  var storyWall = $("#storyWall");
  storyWall.hide();
  var CardColors = {};

  // var row  = function(content) { return $("<tr></tr>").append(content); }
  // var cell = function(content) { return $(content).appendTo("<td></td>").closest("td"); }

  var initCards = function() {
    Mingle.get("/projects/agile_hybrid/cards", { page: "all" }, function(data) {
      var template = $( $("#cardTemplate").html() );

      $(data.cards).each(function() {
        console.log(this);
        var status = Mingle.property(this, "Story Status") || Mingle.property(this, "Defect Status") || Mingle.property(this, "Risk Status") || Mingle.property(this, "Feature Status");
        var swimlane = storyWall.find("tbody .swimLane[data-name='" + status + "']");

        var card = template.clone();
        card.attr("data-type", this.card_type.name);
        card.css({ backgroundColor: CardColors[this.card_type.name] });
        card.find(".number").html("#" + this.number);
        card.find(".name").html(this.name);
        $(swimlane).append(card);
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
      return $("<th/>").addClass("swimLane").html(this.value).attr("data-name", this.value);
    });

    var emptyCols = $(data.property_definition.property_value_details).map(function() {
      return $("<td>&nbsp;</td>").addClass("swimLane").attr("data-name", this.value);
    });

    $("<tr/>").appendTo(storyWall.find("thead"));
    $(headers).appendTo(storyWall.find("thead tr"));

    $("<tr/>").appendTo(storyWall.find("tbody"));
    $(emptyCols).appendTo(storyWall.find("tbody tr"));

    initCardColors();
  });
});
