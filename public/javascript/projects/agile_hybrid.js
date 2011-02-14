Pringle.ready(function() {
  var project = this,
      $root = $("#content .body"),
      REFRESH_TIME = 10000;
      
  var rotator = new Pringle.ViewRotator($root);

  rotator.addChart("lineChart", new Pringle.BurnupChart(project, {
    heading: "Planned Work vs. Velocity",
    conditions: "'Type' = 'Story'",
    cumulative: true,
    xAxis: {
      title: "Iteration",
      values: "SELECT name, number WHERE 'Type' = 'Iteration'",
      transform: function(values) {
        return _(values['results']).map(function(value) {
          return "#" + value.number + " " + value.name;
        }).sort();
      }
    },
    yAxis: {
      title: "Sum Planning Estimate",
    },
    series: [
      {
        query: "SELECT 'Accepted in Iteration', SUM('Planning Estimate')",
        conditions: "'Accepted in Iteration' IS NOT NULL",
        label: "Velocity"
      }, {
        query: "SELECT Iteration, SUM('Planning Estimate')",
        conditions: "Iteration IS NOT NULL",
        label: "Planned",
      }
    ]
  }));

  rotator.addChart("lineChart", new Pringle.BurnupChart(project, {
    heading: "Current Release Burn-Up",
    conditions: "'Release' = (Current Release) AND 'Type' = 'Story' AND 'Iteration' IS NOT NULL",
    cumulative: true,
    xAxis: {
      title: "Iteration",
      values: "SELECT name, number WHERE 'Type' = 'Iteration'",
      transform: function(values) {
        return _(values['results']).map(function(value) {
          return "#" + value.number + " " + value.name;
        }).sort();
      }
    },
    yAxis: {
      title: "Total Scope"
    },
    series: [
      {
        label: "Scope",
        color: "black",
        query: "SELECT 'Added to Scope in Iteration', SUM('Planning Estimate')"
      }, {
        label: "Analysis complete",
        color: "green",
        query: "SELECT 'Analysis Completed in Iteration', SUM('Planning Estimate')",
        conditions: "'Analysis Completed in Iteration' IS NOT NULL"
      }, {
        label: "Development complete",
        color: "orange",
        query: "SELECT 'Development Completed in Iteration', SUM('Planning Estimate')",
        conditions: "'Development Completed in Iteration' IS NOT NULL"
      }, {
        label: "QA complete",
        color: "purple",
        query: "SELECT 'QA Completed in Iteration', SUM('Planning Estimate')",
        conditions: "'QA Completed in Iteration' IS NOT NULL"
      }, {
        label: "Accepted",
        color: "blue",
        query: "SELECT 'Accepted in Iteration', SUM('Planning Estimate')",
        conditions: "'Accepted in Iteration' IS NOT NULL"
      }
    ]
  }));
  
  rotator.addView("interestingValue", new Pringle.MqlNumber(project, {
    query: "SELECT SUM('Planning Estimate') WHERE 'Type' = 'Story' AND 'Story Status' = 'Accepted' AND 'Release' = (Current Release)",
    heading: "Accepted",
    caption: "Current Release",
    unit: "Story Points"
  }));
  
  rotator.addView("interestingValue", new Pringle.MqlNumber(project, {
    query: "SELECT SUM('Planning Estimate') WHERE 'Type' = 'Story' AND 'Story Status' IN ('Ready for QA', 'Ready for Showcase') AND 'Release' = (Current Release)",
    heading: "Awaiting Signoff",
    caption: "Ready for QA or Showcase, Current Release",
    unit: "Story Points"
  }));
  
  rotator.addView("interestingValue", new Pringle.MqlNumber(project, {
    query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' IN ('Ready for QA', 'Ready for Showcase') AND 'Release' = (Current Release)",
    heading: "Awaiting Signoff",
    caption: "Ready for QA or Showcase, Current Release",
    unit: "Total Stories"
  }));
  
  rotator.addView("interestingValue", new Pringle.MqlPercent(project, {
    queries: [ "SELECT SUM('Planning Estimate') WHERE 'Type' = 'Story' AND 'Release' = (Current Release)", "'Story Status' = 'Accepted'" ],
    heading: "Percent Accepted",
    caption: "Current Release",
    unit: "% (Story Points)"
  }));
  
  rotator.addView("interestingValue", new Pringle.MqlNumber(project, {
    query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' = 'Blocked' AND 'Release' = (Current Release)",
    heading: "Blocked",
    caption: "Current Release",
    unit: "Total Stories"
  }));
  
  rotator.addView("interestingValue", new Pringle.MqlNumber(project, {
    query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' < 'Ready for Development' AND 'Release' = (Current Release)",
    heading: "Analysis Backlog",
    caption: "Current Release",
    unit: "Total Stories"
  }));
  
  rotator.addView("wall", new Pringle.StoryWall(project, {
    view: "Story Wall",
    orientation: "vertical",
    groupBy: "Story Status",
    laneNames: ["Open", "Analysis In Progress", "Ready for Development", "Development In Progress", "Ready for QA", "Ready for Showcase"]
  }));

  rotator.rotate(REFRESH_TIME);
});
