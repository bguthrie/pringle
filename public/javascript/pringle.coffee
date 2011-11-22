$ = window.jQuery
L = window.less

delay = (ms, fn) -> setTimeout(fn, ms)
mod   = (n, y) -> n - Math.floor(n / y) * y

# Accepts a promise and a transformation function and returns a new
# Deferred that resolves with the result of the transformation applied.
redefer = (promise, fn) ->
  _.tap $.Deferred(), (def) ->
    promise.then (args...) -> def.resolve fn(args...)

window.Pringle =
  DEFAULT_ROOT: "#content .body"

  readies: []

  addProjectStyleSheet: (projectName) ->
    L.sheets.push _(document.createElement("link")).extend
      rel: "stylesheet/less", 
      type: "text/css", 
      href: "/stylesheets/projects/#{projectName}.less"

    L.refresh()

  init: (viewRoot) ->
    projectName  = window.location.toString().match(/\/pringle\/(\w+)\??/)[1]
    project      = new Mingle.Project(projectName)
    viewport     = new Pringle.Viewport(projectName, viewRoot || Pringle.DEFAULT_ROOT)

    @addProjectStyleSheet(projectName)

    ex = _.expectation()

    CoffeeScript.load "/javascript/projects/#{projectName}.coffee", ex.expect("config")
    project.fetch().then ex.expect("project")

    ex.ready () ->
      nav = new Pringle.ViewportNavigationBar(viewport)
      callback(viewport, project) for callback in Pringle.readies
  
  ready: (callback) ->
    @readies.push callback

class Pringle.ViewportNavigationBar
  constructor: (viewport) ->
    fadeTimer = null
    root = $("#content .nav")
    prev = root.find(".prev")
    next = root.find(".next")
    pause = root.find(".pause")

    $(window).bind "mousemove", () =>
      clearTimeout(fadeTimer) if fadeTimer? 
      root.fadeIn("fast") if root.is(":hidden")

      unless viewport.isPaused()
        fadeTimer = delay 1000, () -> root.fadeOut("fast")
    
    prev.click (evt) => evt.preventDefault(); viewport.prev()
    next.click (evt) => evt.preventDefault(); viewport.next()

    pause.click (evt) =>
      evt.preventDefault()

      if viewport.isPaused()
        fadeTimer = delay 500, () -> root.fadeOut()
        pause.removeClass("paused")
        viewport.unpause()
      else
        clearTimeout(fadeTimer) if fadeTimer?
        pause.addClass("paused")
        viewport.pause()

class Pringle.Viewport
  constructor: (projectName, root) ->
    @projectName = projectName
    @root = $(root)

    @target = @root.find(".content")
    @curtain = @root.find(".curtain")
    @views = []
    @paused = false

    $(window).bind "statechange", () =>
      # This is the only place that should physically reconfigure content.
      @_changeViewTo @_currentViewState()

  isPaused: () -> @paused

  rotate: (speed) ->
    @rotationSpeed = speed
    @setView @_currentViewState()

  pause: () ->
    @paused = true
    clearTimeout(@nextTimeout) if @nextTimeout?

  unpause: () ->
    @paused = false
    @next()

  hide: () ->
    @curtain.fadeIn("slow")
  
  show: () ->
    @curtain.fadeOut("slow")
  
  setView: (viewIdx) ->
    window.History.pushState({ view: viewIdx }, null, "/pringle/#{@projectName}?#{viewIdx}")
        
  addView: (viewType, model) ->
    @views.push new Pringle.View(model, viewType)

  addChart: (viewType, model) ->
    @views.push new Pringle.Chart(model, viewType)

  next: () ->
    @setView mod((@_currentViewState() + 1), @views.length)
  
  prev: () ->
    @setView mod((@_currentViewState() - 1), @views.length)  
  
  _currentViewState: () ->
    unless _(window.location.search).isEmpty()
      parseInt(window.location.search.match(/\?(\d+).*/)[1], 10)
    else 0

  _scheduleViewRotation: () ->
    unless @isPaused()
      @nextTimeout = delay @rotationSpeed, () => @next()
    
  _changeViewTo: (viewIdx) ->
    view = @views[viewIdx]

    clearTimeout(@nextTimeout) if @nextTimeout?
    @nextTimeout = null
    
    $.when(@hide()).then () =>
      view.render(@target).then () =>
        @show()
        @_scheduleViewRotation()

class Pringle.Model
  constructor: (@project, @attributes) ->

  refresh: () ->
    _.tap $.Deferred(), (def) => def.resolve @attributes

class Pringle.MqlNumber extends Pringle.Model
  refresh: () ->
    redefer @project.mqlValue(@attributes.query), (result) =>
      _(@attributes).extend value: result

class Pringle.MqlPercent extends Pringle.Model
  refresh: () ->
    baseQuery   = @attributes.queries[0]
    filter      = @attributes.queries[1]
    filterQuery = "#{baseQuery} AND #{filter}"

    redefer @project.mqlValues([ baseQuery, filterQuery ]), (baseValue, filterValue) =>
      console.log("We've returned from MqlPercent")
      console.log(baseValue)
      console.log(filterValue)
      _(@attributes).extend value: ( filterValue / baseValue ) * 100.0

class Pringle.View
  constructor: (model, type) ->
    @model = model
    @type = type
    rawTemplate = $.ajax( url: "/templates/#{@type}.html", async: false ).responseText
    @template = $("<div/>").html rawTemplate
  
  render: (target) ->
    redefer @model.refresh(), (data) =>
      target.html @template.tmpl(data)

class Pringle.Chart extends Pringle.View
  render: (target) ->
    redefer @model.refresh(), (data) =>
      target.html @template.tmpl(data)

      placeholder = target.find(".chart")
      
      labels = _(data.xAxisLabels).map (label, i) => 
        [ i, label ]

      chartData = _(data.series).map (line, i) =>
        { label: line.label, data: _.zip(line.xValues, line.yValues) }

      $.plot placeholder, chartData, {
        grid:
          show: true
          borderWidth: 4
          color: "#888"
          borderColor: "#444"
          backgroundColor: "#222"
        xaxis:
          ticks: labels
        legend:
          position: "nw"
          backgroundColor: target.closest("body").css("backgroundColor")
          labelBoxBorderColor: "#555"
          margin: 10
      }

class Pringle.BurnupChart extends Pringle.Model
  refresh: () ->
    ex = _.expectation()
    allIterationLabels = []

    _(@attributes.series).each (lineAttributes) =>
      conditions = _([ @attributes.conditions, lineAttributes.conditions ]).compact().join(" AND ")
      newQuery = "#{lineAttributes.query} WHERE #{conditions}"

      @project.mql(newQuery).then ex.expect(lineAttributes.label)

    if @attributes.xAxis?.values?
      @project.mql(@attributes.xAxis.values).then ex.expect("xLabels")

    _.tap $.Deferred(), (def) =>
      ex.ready (returns) =>
        if !@attributes.xAxisLabels? && returns.xLabels?
          @attributes.xAxisLabels = @attributes.xAxis.transform(returns.xLabels[0])

        for lineAttributes in @attributes.series
          lineResults = returns[lineAttributes.label][0]["results"]
          valuesByIteration = @indexResultsByIteration lineResults
          values = @dataSeriesFor @attributes.xAxisLabels, valuesByIteration

          lineAttributes.yValues = values
          lineAttributes.xValues = ( n for n in [0..values.length] )

        def.resolve(@attributes)
      
  indexResultsByIteration: (allQueryResults) ->
    _({}).tap (memo) ->
      for result in allQueryResults
        tuple = _.values(result)

        [ dataLabel, dataValue ] = if tuple[0].match(/^(\d|\.)+$/)
        then [ tuple[1], tuple[0] ]
        else [ tuple[0], tuple[1] ]

        memo[dataLabel] = parseInt(dataValue, 10)
  
  # Accepts a list of iteration labels and an indexed object of point values by 
  # iteration and returns a graphable list of cumulative point values.
  # If isYValueCumulative is true, values will be monotonically increasing.
  dataSeriesFor: (allIterationLabels, resultsByIteration, lastIterationValue = 0) ->
    if _.isEmpty(allIterationLabels) then [] else
      [ first, rest ] = [ _.head(allIterationLabels), _.tail(allIterationLabels) ]
      iterationValue = resultsByIteration[ first ] or 0
      iterationValue += lastIterationValue if @attributes.cumulative
      [ iterationValue ].concat @dataSeriesFor(rest, resultsByIteration, iterationValue)

class Pringle.StoryWall extends Pringle.Model
  refresh: () ->
    ex = _.expectation()

    @project.getCardTypes().then ex.expect("cardTypes")
    @project.getCards(view: @attributes.view, page: "all").then ex.expect("cards")

    _.tap $.Deferred(), (def) =>
      ex.ready (returns) =>
        def.resolve @refreshedAttributes(returns.cards[0], returns.cardTypes[0])

  cardMethods:
    property: (name) ->
      _(@properties).detect( (property) -> property.name is name ).value

  refreshedAttributes: (rawCards, cardTypes) ->
    cardTypeIndex = _(cardTypes).inject ( (groups, cardType) => 
      groups[cardType.name] = cardType; groups
    ), {}

    cards = for card in rawCards
      _.extend(card, @cardMethods, card_type: cardTypeIndex[card.card_type.name])

    cardGroups = _(cards).groupBy (card) => 
      card.property(@attributes.groupBy)

    lanes = for name in @attributes.laneNames
      { name: name, cards: cardGroups[name] } 

    _.extend {}, @attributes, { lanes: lanes, cardTypes: cardTypes }