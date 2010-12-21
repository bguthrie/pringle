Pringle.ready(function() {
  var InterestingValue = function(project, data) {
    this.project = project;
    this.data = data;
    this.state = {};
    var self = this;
    
    this.refresh = function(callback) {
      this.project.mql(self.data.query, function(result) {
        console.log(self.data.query);
        console.log(result);
        var tuple = _(result.results).first();
        var value = _(_(tuple).values()).first();
        self.state = _.extend({}, self.data, { value: value });
        
        if (callback) {
          callback(self.state);
        }
      });
    };
  };
  
  var InterestingValueView = Pringle.View.extend({ type: "interestingValue" });
  
  
  var views = [
    new InterestingValue(this, {
      query: "SELECT SUM('Planning Estimate') WHERE 'Type' = 'Story' AND 'Story Status' = 'Accepted' AND 'Release' = (Current Release)",
      heading: "Accepted",
      caption: "Current Release",
      unit: "Story Points"
    }),
    
    new InterestingValue(this, {
      query: "SELECT SUM('Planning Estimate') WHERE 'Type' = 'Story' AND 'Story Status' IN ('Ready for QA', 'Ready for Showcase') AND 'Release' = (Current Release)",
      heading: "Awaiting Signoff",
      caption: "Ready for QA or Showcase, Current Release",
      unit: "Story Points"
    }),
    
    new InterestingValue(this, {
      query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' IN ('Ready for QA', 'Ready for Showcase') AND 'Release' = (Current Release)",
      heading: "Awaiting Signoff",
      caption: "Ready for QA or Showcase, Current Release",
      unit: "Total Stories"
    }),
    
    new InterestingValue(this, {
      query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' = 'Blocked' AND 'Release' = (Current Release)",
      heading: "Blocked",
      caption: "Current Release",
      unit: "Total Stories"
    }),
    
    new InterestingValue(this, {
      query: "SELECT COUNT(*) WHERE 'Type' = 'Story' AND 'Story Status' < 'Ready for Development' AND 'Release' = (Current Release)",
      heading: "Analysis Backlog",
      caption: "Current Release",
      unit: "Total Stories"
    })
  ];
  
  $("#content .header .heading").text(this.attributes.name);
  
  var currentViewIdx = -1,
      $root = $("#content .body"),
      REFRESH_TIME = 10000;
      
  var showNextView = function() {
    currentViewIdx = ( currentViewIdx + 1 ) % views.length;
    var currentView = views[currentViewIdx];
    new InterestingValueView(currentView).render($root);
  };
  
  setInterval(showNextView, REFRESH_TIME)
  showNextView();
});