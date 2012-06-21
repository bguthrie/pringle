Pringle.ready (viewport) ->
  # REFRESH_TIME = 10000

  # viewport.add
  #   type: "simple"
  #   value: 5
  #   heading: "Widget Count"
  #   caption: "Per Day"
  #   unit: "Widgets"

  viewport.add
    type: "progress"
    start: 0
    end: 100
    current: 37 # TODO This is not rendering!
    onShow: (content, attributes) ->
      $(content).find(".progress").width "80%"


  viewport.rotate 1000