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

    return property ? property.value : "";
  }
}

$(document).ready(function() {
  $("#status").html("Loading cards...");
  var storyWall = $("#storyWall");

  var initCards = function() {
    Mingle.get("/projects/agile_hybrid/cards", { page: "all" }, function(data) {
      var template = $( $("#cardTemplate").html() );

      $(data.cards).each(function() {
        console.log(this);
        var swimlane = storyWall.find(".swimLane[data-name='" + Mingle.property(this, "Story Status") + "']");

        var card = template.clone();
        card.addClass(this.card_type.name.replace(/\s+/, ""))
        card.find(".header").html("#" + this.number + " - " + this.name);
        card.find(".body").html(this.description);
        swimlane.append(card);
      });

      $("#status").html("");
    })
  };

  Mingle.get("/projects/agile_hybrid/property_definitions/111", function(data) {
    var template = $( $("#swimlaneTemplate").html() );
    console.log(data);

    $(data.property_definition.property_value_details).each(function() {
      var swimlane = template.clone();
      swimlane.find(".title").html(this.value);
      swimlane.attr("data-name", this.value);
      storyWall.append(swimlane);
    });

    initCards();
  });
});
