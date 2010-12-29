Pringle.ready(function() {
  var project = this,
      $root = $("#content .body"),
      REFRESH_TIME = 10000;
  
  var MqlValue = function(data) {
    this.data = data;
    this.type = "interestingValue";
    var self = this;
    
    this.refresh = function(callback) {
      project.mql(self.data.query, function(result) {
        var tuple = _(result.results).first();
        var value = _(_(tuple).values()).first();
        var newData = _.extend(self.data, { value: parseFloat(value) });

        callback(newData);
      });
    };
  };
  
  var rotator = new Pringle.ViewRotator($root);
  
  rotator.addView(new MqlValue({
    query: "SELECT SUM('Planning Estimate') WHERE 'Type' = 'Story' AND 'Story Status' = 'Accepted' AND 'Release' = (Current Release)",
    heading: "Accepted",
    caption: "Current Release",
    unit: "Story Points"
  }));
  
  rotator.addView(new MqlValue({
    query: "SELECT SUM('Planning Estimate') WHERE 'Type' = 'Story' AND 'Story Status' IN ('Ready for QA', 'Ready for Showcase') AND 'Release' = (Current Release)",
    heading: "Awaiting Signoff",
    caption: "Ready for QA or Showcase, Current Release",
    unit: "Story Points"
  }));
  
  rotator.addView(new MqlValue({
    query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' IN ('Ready for QA', 'Ready for Showcase') AND 'Release' = (Current Release)",
    heading: "Awaiting Signoff",
    caption: "Ready for QA or Showcase, Current Release",
    unit: "Total Stories"
  }));
    
  rotator.addView(new MqlValue({
    query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' = 'Blocked' AND 'Release' = (Current Release)",
    heading: "Blocked",
    caption: "Current Release",
    unit: "Total Stories"
  }));
    
  rotator.addView(new MqlValue({
    query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' < 'Ready for Development' AND 'Release' = (Current Release)",
    heading: "Analysis Backlog",
    caption: "Current Release",
    unit: "Total Stories"
  }));
  
  rotator.rotate(REFRESH_TIME);
});