class MingleProject
  constructor: (@name, @options) ->
    alert("Hello world")
  
  fetch: (callback) ->
    this._mingle "", (data) =>
      @attributes = data.project
      callback(this)

  mql: (mql, callback) ->
    console.log("pringle: querying #{mql}")
    this._mingle("/cards/execute_mql", { mql: mql }, callback)
  
  mqlValue: (mql, callback) ->
    this.mql mql, (mqlResult) =>
      tuple = _(mqlResult.results).first()
      value = _(_(tuple).values()).first()
      callback(parseFloat(value))

  _mingle: (path, params, callback) ->
    [ callback, params ] = [ params, {} ] if _.isFunction(params)
    params   = $.param(params) if _.isString(params)
    path     = "/mingle/projects/#{@name}/#{path}"
    callback = _.bind(callback, this)

    $.get(path, params || {}, callback, "jsonp")
  
  mqlValues: (queries, callback) ->
    ex = _.expectation()

    _(queries).each (query, idx) =>
      this.mqlValue query, ex.expect("query#{idx}")

    ex.ready (tuples) =>
      callback.apply this, _(tuples).values().map (val) => val[0]

  disassemble: (property, callback) ->
    (mingleResponse) ->
      callback(mingleResponse[property])

  getCardTypes: (callback) ->
    this._mingle "/card_types", this.disassemble("card_types", callback)
  
  getPropertyDefinitions: (callback) ->
    this._mingle "/property_definitions", this.disassemble("property_definitions", callback)

  getCards: (params, callback) ->
    params = $.extend({ page: 1 }, params)
    this._mingle "/cards", $.extend({ page: 1 }, params), this.disassemble("cards", callback)