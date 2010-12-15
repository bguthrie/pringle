// (function($) {
//   $.widget("pringle", {
//     options: {
//       view: "storywall"
//     },
// 
//     _create: function() {
//       var project = this.options.project;
//     }
//   });
// });
// 
// (function($) {
//   $.widget("pringle.piechart", {
//     options: {
//       data: {"avalue": 1, "bvalue": 2},
//       width: 640,
//       height: 500,
//       radius: 100
//     },
// 
//     _create: function() {
//       var self = this;
// 
//       self._makeChart();
//       this.options.project.bind("pringle.cards.set", _.bind(this._setCards, this));
// 
//       this.options.project.trigger("pringle.project.get");
//       this.options.project.bind("pringle.project.set", _.bind(function() {
//         this.options.project.trigger("pringle.cards.get");
//       }, this));
//     },
// 
//     _makeChart: function() {
//       $("<div/>").addClass("chartBody").appendTo(this.element.find(".body"));
//       this.options.r = Raphael(this.element.find(".chartBody")[0]);
//     },
// 
//     _setCards: function(evt, data) {
//       var cards = data.cards;
// 
//       var cardsIndexed = _(cards).reduce(function(memo, card) {
//         var oldValue = memo[card.card_type.name];
//         memo[card.card_type.name] = ( oldValue || 0 ) + 1;
//         return memo;
//       }, {});
// 
//       this._setData(cardsIndexed);
//     },
// 
//     _setData: function(data) {
//       this.options.data = data;
//       this._renderPie();
//     },
// 
//     _getData: function() {
//       var data = $.isFunction(this.options.data) ? this.options.data() : this.options.data;
//       return _(data);
//     },
// 
//     _renderPie: function() {
//       var data = this._getData();
// 
//       var pie = this.options.r.g.piechart(
//         320,
//         200,
//         this.options.radius,
//         data.values(),
//         {
//           legend: data.keys(),
//           legendpos: "west",
//           legendcolor: "white"
//         }
//       );
// 
//       pie.hover(function() {
//           this.sector.stop();
//           this.sector.scale(1.1, 1.1, this.cx, this.cy);
//           if (this.label) {
//               this.label[0].stop();
//               this.label[0].scale(1.5);
//               this.label[1].attr({"font-weight": 800});
//           }
//       }, function() {
//           this.sector.animate({scale: [1, 1, this.cx, this.cy]}, 500, "bounce");
//           if (this.label) {
//               this.label[0].animate({scale: 1}, 500, "bounce");
//               this.label[1].attr({"font-weight": 400});
//           }
//       });
//     }
//   });
// })(jQuery);
// 
// (function($) {
//   $.widget("pringle.storywall", {
//     options: {
//       orientation: "vertical",
//       hidden: false,
//       laneWidth: 130
//     },
// 
//     _create: function() {
//       var self = this;
// 
//       this._makeLegend();
//       this._makeWall();
// 
//       $(window).resize(function(evt) { self._resize(); });
// 
//       this.options.project.bind("pringle.project.set", _.bind(this._setProject, this));
//       this.options.project.bind("pringle.cards.set", _.bind(this._resize, this));
// 
//       this.options.project.trigger("pringle.project.get");
//       console.log(this.options.project);
//       this.element.find(".heading").html(this.options.project.name);
//       this.show();
//     },
// 
//     _makeLegend: function() {
//       $("<ul class='legend'/>").legend({
//         project: this.options.project
//       }).appendTo(this.element.find(".header"));
//     },
// 
//     _makeWall: function() {
//       $("<ul class='wall'/>").addClass(this.options.orientation).swimlanes({
//         project: this.options.project
//       }).appendTo(this.element.find(".body"));
//     },
// 
//     _setProject: function(evt, data) {
//       var project = data.project;
//       this.element.find(".heading").html(this.options.project.name);
//       this.show();
//     },
// 
//     _resize: function(evt, data) {
//       var lanes = this.element.find(".swimlane");
// 
//       if (this.options.orientation === "vertical") {
//         var numLanes = lanes.length;
//         var winWidth = this.element.width();
//         var maxNumLanes = winWidth / this.options.laneWidth;
//         var lanesToResize = maxNumLanes - numLanes;
//         var lanesSorted = lanes.sort(function(l1, l2) {
//           return $(l2).find(".card").length - $(l1).find(".card").length;
//         });
// 
//         lanesSorted.slice(0, lanesToResize).css({ width: ( this.options.laneWidth * 2 ) });
//         lanesSorted.slice(lanesToResize, -1).css({ width: this.options.laneWidth });
//       } else {
//         lanes.css({ width: null });
//       }
//     },
// 
//     orientation: function(newOrientation) {
//       var wall = this.element.find(".wall");
//       wall.removeClass("horizontal").removeClass("vertical").addClass(newOrientation);
//       this.options.orientation = newOrientation;
//       this._resize();
//     },
// 
//     hide: function(event, ui) {
//       this.element.fadeOut();
//     },
// 
//     show: function(event, ui) {
//       this.element.fadeIn();
//     }
//   });
// 
//   $.widget("pringle.swimlanes", {
//     options: {
//       template: "#laneTemplate",
//       cardTemplate: "#cardTemplate"
//     },
// 
//     _create: function() {
//       this.options.project.bind("pringle.statuses.set", _.bind(this._setStatuses, this));
//       this.options.project.trigger("pringle.statuses.get");
//     },
// 
//     _setStatuses: function(evt, data) {
//       _(data.property_definition.property_value_details).each(function(status) {
//         $(this.options.template).tmpl(status).appendTo(this.element);
//         this.element.find(".cards").cards({ project: this.options.project });
//       }, this);
// 
//       this.options.project.trigger("pringle.cards.get");
//     }
//   });
// 
//   $.widget("pringle.cards", {
//     options: {
//       template: "#cardTemplate"
//     },
// 
//     _create: function() {
//       this.options.name = this.element.closest(".swimlane").dataset("name");
//       var self = this;
// 
//       this.options.project.bind("pringle.cards.set", _.bind(this._setCards, this));
//     },
// 
//     _setCards: function(evt, data) {
//       _(data.cards).chain().select(function(card) {
//         return card.status() === this.options.name;
//       }, this).each(function(card) {
//         var color = $(".legend").legend('colorFor', card.card_type.name);
//         $(this.options.template).tmpl(card).css({ display: "none", backgroundColor: color }).appendTo(this.element).fadeIn();
//       }, this);
//     }
//   });
// 
//   $.widget("pringle.legend", {
//     options: {
//       template: "#legendKeyTemplate"
//     },
// 
//     _create: function() {
//       this.options.project.trigger("pringle.cardTypes.get");
//       this.options.project.bind("pringle.cardTypes.set", _.bind(this._setCardTypes, this));
//     },
// 
//     _setCardTypes: function(evt, data) {
//       _(data.card_types).each(function(cardType) {
//         $(this.options.template).tmpl(cardType).appendTo(this.element);
//       }, this);
// 
//       this.show();
//     },
// 
//     hide: function(event, ui) {
//       this.element.fadeOut();
//     },
// 
//     show: function(event, ui) {
//       this.element.fadeIn();
//     },
// 
//     colorFor: function(typeName) {
//       return this.element.find(".legendKey[data-name='" + typeName + "']").dataset("color");
//     }
//   });
// })(jQuery);
// 
// 
// // //   initFavorites: function() {
// // //     var option = $("<option></option>");
// // //     var select = $("select[name=view]");
// // //     
// // //     Mingle.get("/projects/agile_hybrid/favorites", function(data) {
// // //       $(data.favorites).each(function() {
// // //         select.append(option.clone().attr("value", this.name).html(this.name));
// // //       });
// // //     });
// // //   },
// 
// // // $(document).ready(function() {
// // //   $("#cardFilter").submit(function(e) {
// // //     var newParams = $.deparam($(this).serialize());
// // //     $.bbq.pushState(newParams);
// // //     e.preventDefault();
// // //     return false;
// // //   }).find("select, input").change(function(e) {
// // //     $(this).closest("form").submit(); 
// // //     e.preventDefault();
// // //   });
// // //   
// // //   $("#pringleView").change(function() {
// // //     var orientation = $(this).val();
// // //     
// // //     Pringle.storyWall.fadeOut({complete: function() {
// // //       Pringle.storyWall.attr("class", orientation);
// // //       Pringle.Window.adjustLanes();
// // //       Pringle.storyWall.fadeIn();
// // //     }});
// // //   });
// // //   
// // //   $(window).bind("hashchange", function(e) {
// // //     Pringle.refreshCards();
// // //   });
// // // });
// 
// 
// 
