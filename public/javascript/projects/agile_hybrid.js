Pringle.ready(function() {
  var project = this,
      $root = $("#content .body"),
      REFRESH_TIME = 10000;
  
  var rotator = new Pringle.ViewRotator($root);
  
  rotator.addView("interestingValue", new Pringle.MqlQuery(project, {
    query: "SELECT SUM('Planning Estimate') WHERE 'Type' = 'Story' AND 'Story Status' = 'Accepted' AND 'Release' = (Current Release)",
    heading: "Accepted",
    caption: "Current Release",
    unit: "Story Points"
  }));
  
  rotator.addView("interestingValue", new Pringle.MqlQuery(project, {
    query: "SELECT SUM('Planning Estimate') WHERE 'Type' = 'Story' AND 'Story Status' IN ('Ready for QA', 'Ready for Showcase') AND 'Release' = (Current Release)",
    heading: "Awaiting Signoff",
    caption: "Ready for QA or Showcase, Current Release",
    unit: "Story Points"
  }));
  
  rotator.addView("interestingValue", new Pringle.MqlQuery(project, {
    query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' IN ('Ready for QA', 'Ready for Showcase') AND 'Release' = (Current Release)",
    heading: "Awaiting Signoff",
    caption: "Ready for QA or Showcase, Current Release",
    unit: "Total Stories"
  }));
    
  rotator.addView("interestingValue", new Pringle.MqlQuery(project, {
    query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' = 'Blocked' AND 'Release' = (Current Release)",
    heading: "Blocked",
    caption: "Current Release",
    unit: "Total Stories"
  }));
    
  rotator.addView("interestingValue", new Pringle.MqlQuery(project, {
    query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' < 'Ready for Development' AND 'Release' = (Current Release)",
    heading: "Analysis Backlog",
    caption: "Current Release",
    unit: "Total Stories"
  }));
  
  rotator.rotate(REFRESH_TIME);
});