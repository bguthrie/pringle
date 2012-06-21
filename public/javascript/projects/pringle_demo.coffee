Pringle.ready (viewport) ->
  REFRESH_TIME = 10000

  viewport.add
    type: "simple"
    value: 5
    heading: "Widget Count"
    caption: "Per Day"
    unit: "Widgets"

  viewport.rotate 1000