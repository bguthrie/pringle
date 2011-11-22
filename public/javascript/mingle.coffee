window.Mingle = {}

class Mingle.Project
  constructor: (@name, @options) ->
 
  fetch: () ->
    _.tap $.Deferred(), (def) =>
      this._mingle("").then (data) =>
        @attributes = data.project
        def.resolve(this)

  mql: (mql) ->
    console.log("pringle: querying #{mql}")
    this._mingle "/cards/execute_mql", mql: mql
  
  mqlValue: (mql) ->
    _.tap $.Deferred(), (def) =>
      @mql(mql).then (mqlResult) =>
        tuple = _(mqlResult.results).first()
        value = _(_(tuple).values()).first()
        def.resolve parseFloat(value)

  _mingle: (path, params) ->
    params = $.param(params) if _.isString(params)
    path   = "/mingle/projects/#{@name}#{path}"

    $.get(path, params || {}, "jsonp")
  
  mqlValues: (queries) ->
    _.tap $.Deferred(), (def) =>
      ex = _.expectation()

      @mqlValue(query).then(ex.expect(query)) for query in queries
      ex.ready (returns) -> def.resolve _(returns).values()...

  disassemble: (property, promise) ->
    _.tap $.Deferred(), (def) ->
      promise.then (response) -> def.resolve response[property]

  getCardTypes: () ->
    @disassemble "card_types", @_mingle("/card_types")
  
  getPropertyDefinitions: () ->
    @disassemble "property_definitions", @_mingle("/property_definitions")

  getCards: (params) ->
    _.extend params, page: 1
    @disassemble "cards", @_mingle("/cards", params)
