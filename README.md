Pringle: A Metrics Visualization Dashboard
==========================================

Demo at http://pringle-demo.heroku.com/pringle/pringle_demo.

Pringle is an HTML5 dashboard for displaying project metrics, initially geared towards ThoughtWorks' Mingle tracking tool. It's designed for large-format screens and includes features like advanced charting and percentage calculation. It's designed to be customized to fit your project's unique data and Mingle configuration.

Pending: Pringle is a an attractive, uncluttered, high-contrast Agile story wall backed by Mingle. It is driven by the author's frustration with the need to maintain, dually, both Mingle and a physical card wall that is manually updated to reflect the "real" state of the project.

Mingle has been tested using Google Chrome and Firefox on Windows and Mac, and supports Mingle 3.2-3.4.

Getting Started
---------------

See the [Getting Started](/GETTING_STARTED.md/) guide for more comprehensive information and hand-holding.

Prerequisites:

* Mingle must be configured to allow HTTP basic authentication.
* You need a recent version of Ruby and the Bundler gem installed.

Then:

* Check out the code and run `bundle install` to grab all of the dependencies.
* Create a new Javascript file named after your project under the `public/javascript/projects` directory. 
  For an example of this, see the `pringle_demo.js` file.
* Run `rake server MINGLE_USERNAME=username MINGLE_PASSWORD=password MINGLE_HOST=http://my.mingle.host:8080`
* Point your browser at http://localhost:4567/pringle/project_name.

Configuring Your Pringle Project
--------------------------------

Because every Mingle project is different, Pringle has to be configured to understand how to interpret your project's unique data and card setup. For an example of how Pringle looks in its default configured, start Pringle pointed at a Mingle instance that includes a project named `pringle_demo` configured to use the Agile Hybrid starting template. Then navigate to the following URL:

	http://localhost:4567/pringle/pringle_demo
  
You can also find a [demo online](http://pringle-demo.heroku.com/pringle/pringle_demo).

This display cycles through some basic numbers that would be relevant to the project team using the Agile Hybrid template that comes pre-packaged in Mingle.

Use as a proxy server
---------------------

Pringle is a standard Sinatra application. It requires you to configured MINGLE_USERNAME, MINGLE_PASSWORD, and MINGLE_HOST environment variables. Nothing more needs to be configured if all you'd like to do is consume the API. I find that calls made through this proxy, while not blazing fast, are generally no worse than waiting for Mingle's standard views to render.

Use as a command-line console
-----------------------------

Pringle includes a command-line console for running MQL queries, just 'coz. Run it like this:

	rake mqlconsole MINGLE_USERNAME=<username> MINGLE_PASSWORD=<password> MINGLE_HOST=http://my.mingle.host:8080

	mql> use "project_name"
	mql> SELECT SUM('Planning Estimate') WHERE 'Type' = 'Story' AND 'Story Status' = 'Accepted' AND 'Release' = (Current Release)

Use as a story wall
-------------------

One of the early goals of Mingle was to provide a projector-friendly card wall display, with higher contrast and more appropriate font sizes than the builtin Mingle view. There is some early support for this, viewable in the demo project, but because of the wide variance between projects' wall display needs it's not received much attention yet. If you'd like to contribute, let me know!