$ = window.jQuery
less = window.less

delay = (ms, fn) -> setTimeout(fn, ms)
mod   = (n, y) -> n - Math.floor(n / y) * y

# Accepts a promise and a transformation function and returns a new
# Deferred that resolves with the result of the transformation applied.
redefer = (promise, fn) ->
  deferred = $.Deferred()
  promise.then (args...) -> def.resolve fn(args...)
  deferred

window.Pringle =
  DEFAULT_ROOT: "#content .body"

  readies: []

  addProjectStyleSheet: (presentationName) ->
    less.sheets.push _(document.createElement("link")).extend
      rel: "stylesheet/less", 
      type: "text/css", 
      href: "/stylesheets/projects/#{presentationName}.less"

    less.refresh()

  init: (viewRoot) ->
    presentationName  = window.location.pathname.match(/\/pringle\/(\w+)\??/)[1]
    viewport          = new Pringle.Viewport(presentationName, viewRoot || Pringle.DEFAULT_ROOT)

    @addProjectStyleSheet(presentationName)

    CoffeeScript.load "/javascript/projects/#{presentationName}.coffee", () ->
      nav = new Pringle.ViewportNavigationBar(viewport)
      callback(viewport) for callback in Pringle.readies
  
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
  constructor: (presentationName, root) ->
    @presentationName = presentationName
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
    window.History.pushState({ view: viewIdx }, null, "/pringle/#{@presentationName}?#{viewIdx}")
        
  add: (view) ->
    console.log("adding a view")
    @views.push new Pringle.View(view)

  # addChart: (viewType, model) ->
  #   @views.push new Pringle.Chart(model, viewType)

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
      console.log("have hidden")
      view.render(@target).then () =>
        console.log("have rendered")
        if view.attributes.onShow?
          view.attributes.onShow(@target, view.attributes) 
        @show()
        console.log("have showed")
        # @_scheduleViewRotation()

class Pringle.View
  constructor: (attributes) ->
    @attributes = attributes
    @type = attributes.type
    rawTemplate = $.ajax( url: "/templates/#{@type}.html", async: false ).responseText
    @template = $("<div/>").html rawTemplate
  
  render: (target) ->
    def = $.Deferred()
    console.log("I'm being called")
    target.html @template.tmpl()
    def.resolve()

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