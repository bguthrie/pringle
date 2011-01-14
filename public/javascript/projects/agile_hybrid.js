Pringle.ready(function() {
  var project = this,
      $root = $("#content .body"),
      REFRESH_TIME = 10000;

  var LineChart = function(project, attributes) {
    this.project = project;
    this.attributes = attributes;
    var self = this;
    
    this.refresh = function(callback) {
      var ex = _.expectation();
      
      _(self.attributes.series).each(function(lineAttributes) {
        var conditions = _([ self.attributes.conditions, lineAttributes.conditions ]).compact().join(" AND "),
            newQuery =  lineAttributes.query + " WHERE " + conditions;
        
        self.project.mql(newQuery, ex.expect(lineAttributes.label));
      });
      
      ex.ready(function(returns) {
        _(self.attributes.series).each(function(lineAttributes) {
          var rows = _(returns[lineAttributes.label][0]["results"]).values();

          lineAttributes.xValues = _(rows).map(function(r) { return parseFloat(_(r).values()[0]); });
          
          if (self.attributes.cumulative) {
            var memo = 0.0;
            
            lineAttributes.xValues = _(lineAttributes.xValues).map(function(value) {
              return _(value + memo).tap(function() { memo = value; });
            });
          }
          
          lineAttributes.yValues = _(rows).map(function(r) { return _(r).values()[1]; });
        });
        
        callback(self.attributes.series);
      });
    };
  };
  
  var chart = new LineChart(project, {
    conditions: "'Release' = (Current Release) AND 'Type' = 'Story' AND 'Iteration' IS NOT NULL",
    cumulative: true,
    xTitle: "Iteration",
    yTitle: "Scope",
    heading: "Burn-up Chart, Current Release",
    series: [
      { 
        label: "Scope",
        color: "black",
        lineWidth: 1,
        query: "SELECT 'Added to Scope in Iteration', SUM('Planning Estimate')"
      }, {
        label: "Analysis complete",
        color: "green",
        lineWidth: 2,
        query: "SELECT 'Analysis Completed in Iteration', SUM('Planning Estimate')",
        conditions: "'Analysis Completed in Iteration' IS NOT NULL"
      }, {
        label: "Development complete",
        color: "orange",
        lineWidth: 2,
        query: "SELECT 'Development Completed in Iteration', SUM('Planning Estimate')",
        conditions: "'Development Completed in Iteration' IS NOT NULL"
      }, {
        label: "QA complete",
        color: "purple",
        lineWidth: 2,
        query: "SELECT 'QA Completed in Iteration', SUM('Planning Estimate')",
        conditions: "'QA Completed in Iteration' IS NOT NULL"
      }, {
        label: "Accepted",
        color: "blue",
        lineWidth: 2,
        query: "SELECT 'Accepted in Iteration', SUM('Planning Estimate')",
        conditions: "'Accepted in Iteration' IS NOT NULL"
      }
    ]
  });
  
  // chart.refresh();
  
  var rotator = new Pringle.ViewRotator($root);
  
  rotator.addChart("lineChart", chart);
  // 
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
  //   
  // rotator.addView("wall", new Pringle.StoryWall(project, {
  //   view: "Story Wall",
  //   orientation: "vertical",
  //   groupBy: "Story Status",
  //   laneNames: ["Open", "Analysis In Progress", "Ready for Development", "Development In Progress", "Ready for QA", "Ready for Showcase"]
  // }));
  //   
  rotator.rotate(REFRESH_TIME);
});
