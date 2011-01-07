Pringle.ready(function() {
  var project = this,
      $root = $("#content .body"),
      REFRESH_TIME = 100000000000;

  // TODO
  //
  // var chart = new LineChart({
  //   conditions: "conditions: 'Release' = (Current Release) AND 'Type' = 'Story' AND 'Iteration' IS NOT NULL",
  //   xTitle: "Iteration",
  //   yTitle: "Scope",
  //   series: [
  //     { 
  //       label: "Scope",
  //       color: "black",
  //       lineWidth: 1,
  //       data: "SELECT 'Added to Scope in Iteration', SUM('Planning Estimate')"
  //     }, {
  //       label: "Analysis complete",
  //       color: "green",
  //       lineWidth: 2,
  //       data: "SELECT 'Analysis Completed in Iteration', SUM('Planning Estimate') WHERE 'Analysis Completed in Iteration' IS NOT NULL"
  //     }, {
  //       label: "Development complete",
  //       color: "orange",
  //       lineWidth: 2,
  //       data: "SELECT 'Development Completed in Iteration', SUM('Planning Estimate') WHERE 'Development Completed in Iteration' IS NOT NULL"
  //     }, {
  //       label: "QA complete",
  //       color: "purple",
  //       lineWidth: 2,
  //       data: "SELECT 'QA Completed in Iteration', SUM('Planning Estimate') WHERE 'QA Completed in Iteration' IS NOT NULL"
  //     }, {
  //       label: "Accepted",
  //       color: "blue",
  //       lineWidth: 2,
  //       data: "SELECT 'Accepted in Iteration', SUM('Planning Estimate') WHERE  'Accepted in Iteration' IS NOT NULL"
  //     }
  //   ]
  // });
      
  var rotator = new Pringle.ViewRotator($root);

  // rotator.addView("interestingValue", new Pringle.MqlNumber(project, {
  //   query: "SELECT SUM('Planning Estimate') WHERE 'Type' = 'Story' AND 'Story Status' = 'Accepted' AND 'Release' = (Current Release)",
  //   heading: "Accepted",
  //   caption: "Current Release",
  //   unit: "Story Points"
  // }));
  // 
  // rotator.addView("interestingValue", new Pringle.MqlNumber(project, {
  //   query: "SELECT SUM('Planning Estimate') WHERE 'Type' = 'Story' AND 'Story Status' IN ('Ready for QA', 'Ready for Showcase') AND 'Release' = (Current Release)",
  //   heading: "Awaiting Signoff",
  //   caption: "Ready for QA or Showcase, Current Release",
  //   unit: "Story Points"
  // }));
  // 
  // rotator.addView("interestingValue", new Pringle.MqlNumber(project, {
  //   query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' IN ('Ready for QA', 'Ready for Showcase') AND 'Release' = (Current Release)",
  //   heading: "Awaiting Signoff",
  //   caption: "Ready for QA or Showcase, Current Release",
  //   unit: "Total Stories"
  // }));
  // 
  // rotator.addView("interestingValue", new Pringle.MqlPercent(project, {
  //   queries: [ "SELECT SUM('Planning Estimate') WHERE 'Type' = 'Story' AND 'Release' = (Current Release)", "'Story Status' = 'Accepted'" ], 
  //   heading: "Percent Accepted",
  //   caption: "Current Release",
  //   unit: "% (Story Points)"
  // }));
  // 
  // rotator.addView("interestingValue", new Pringle.MqlNumber(project, {
  //   query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' = 'Blocked' AND 'Release' = (Current Release)",
  //   heading: "Blocked",
  //   caption: "Current Release",
  //   unit: "Total Stories"
  // }));
  // 
  // rotator.addView("interestingValue", new Pringle.MqlNumber(project, {
  //   query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' < 'Ready for Development' AND 'Release' = (Current Release)",
  //   heading: "Analysis Backlog",
  //   caption: "Current Release",
  //   unit: "Total Stories"
  // }));
  
  var StoryWall = function(project, attributes) {
    this.project = project;
    this.attributes = attributes;
    
    this.refresh = function(callback) {
      var self = this,
          ex = _.expectation();
      
      this.project.getCardTypes(ex.expect("cardTypes"));
      
      this.project.getCards({
        view: this.attributes.view,
        page: "all"
      }, ex.expect("cards"));
      
      ex.ready(function(returns) {
        var cards = returns.cards[0],
            cardTypes = returns.cardTypes[0],
            lanes,
            cardGroups;
            
        cards = _(cards).map(function(card) {
          return _.extend(card, {
            property: function(name) {
              return _(this.properties).detect(function(property) {
                return property.name === name;
              }).value;
            }
          });
        });
        
        cardGroups = _(cards).inject(function(groups, card) {
          var cardGroup = card.property(self.attributes.groupBy);

          if (!groups[cardGroup]) 
            groups[cardGroup] = [];
          groups[cardGroup].push(card);
          
          return groups;
        }, {});

        lanes = _(self.attributes.laneNames).map(function(name) {
          return { name: name, cards: cardGroups[name] };
        });

        callback(
          _.extend(self.attributes, { lanes: lanes, cardTypes: cardTypes })
        );
      });
    };
  };
  
  rotator.addView("wall", new StoryWall(project, {
    view: "Story Wall",
    orientation: "vertical",
    groupBy: "Story Status",
    laneNames: ["Open", "Analysis In Progress", "Ready for Development", "Development In Progress", "Ready for QA", "Ready for Showcase"]
  }));
    
  rotator.rotate(REFRESH_TIME);
});
